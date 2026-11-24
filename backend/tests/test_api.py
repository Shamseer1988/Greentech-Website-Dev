import io
from datetime import UTC, datetime, timedelta

import pytest
from PIL import Image
from sqlalchemy import select

from alembic import command
from app.models import Enquiry, Property, PropertyMedia, PropertyStatus
from app.scripts.seed import seed
from tests.conftest import KEY

UPLOAD_URL = "/api/admin/properties/GT-LA-101/media"
AUTH = {"X-Admin-Key": KEY}


def codes(client, query=""):
    response = client.get("/api/properties" + query)
    assert response.status_code == 200, response.text
    return [p["code"] for p in response.json()["items"]]


def change(db, code, **values):
    prop = db.scalar(select(Property).where(Property.code == code))
    for name, value in values.items():
        setattr(prop, name, value)
    db.commit()


def picture(fmt="JPEG", size=(3000, 1500), **save):
    out = io.BytesIO()
    Image.new("RGB", size, "green").save(out, fmt, **save)
    return out.getvalue()


def upload(client, content, name="photo.jpg", headers=AUTH, **data):
    return client.post(UPLOAD_URL, files={"file": (name, content)}, data=data, headers=headers)


# --- database -------------------------------------------------------------


def test_models_match_migrations(engine, alembic_config):
    command.check(alembic_config)


def test_seed_twice_adds_nothing(db):
    assert set(seed(db, samples=True).values()) == {0}


# --- properties -----------------------------------------------------------


@pytest.mark.parametrize(
    ("query", "expected"),
    [
        ("?type=warehouse", {"GT-WH-204", "GT-WH-221"}),
        ("?type=warehouse&type=cafeteria", {"GT-WH-204", "GT-WH-221", "GT-CF-310"}),
        ("?location=al-khor", {"GT-CF-310"}),
        ("?type=warehouse&location=al-khor", set()),
        ("?min_rent=20000&max_rent=40000", {"GT-WH-204", "GT-SM-412", "GT-LA-118"}),
        ("?min_capacity=180", {"GT-LA-101"}),
        ("?min_area=1500", {"GT-LA-101", "GT-WH-221"}),
        ("?q=gt-la", {"GT-LA-101", "GT-LA-118"}),
        ("?q=warehouse silal", {"GT-WH-204"}),
        ("?q=الخور", {"GT-CF-310"}),
        ("?q=%25", set()),  # a literal % must not match everything
        ("?featured=true", {"GT-LA-101", "GT-WH-204", "GT-CF-310"}),
    ],
)
def test_filters(client, query, expected):
    assert set(codes(client, query)) == expected


def test_sorting(client):
    assert codes(client)[0] == "GT-LA-101"
    # Properties without a price always come last.
    assert codes(client, "?sort=price_asc")[0] == "GT-CF-310"
    assert codes(client, "?sort=price_asc")[-1] == "GT-WH-221"
    assert codes(client, "?sort=price_desc")[0] == "GT-LA-101"
    assert codes(client, "?sort=price_desc")[-1] == "GT-WH-221"
    assert codes(client, "?sort=capacity_desc")[:2] == ["GT-LA-101", "GT-LA-118"]


def test_pagination(client):
    first = client.get("/api/properties?page_size=4").json()
    assert (first["total"], first["pages"], len(first["items"])) == (6, 2, 4)
    second = codes(client, "?page_size=4&page=2")
    assert len(second) == 2
    assert not set(second) & {p["code"] for p in first["items"]}


@pytest.mark.parametrize(
    "query", ["page=0", "page_size=49", "sort=x", "min_rent=-1", "min_area=inf"]
)
def test_bad_filters(client, query):
    assert client.get(f"/api/properties?{query}").status_code == 422


def test_drafts_and_future_are_hidden(client, db):
    change(db, "GT-LA-101", status=PropertyStatus.DRAFT)
    change(db, "GT-WH-204", published_at=datetime.now(UTC) + timedelta(days=1))
    change(db, "GT-CF-310", published_at=None)
    hidden = {"GT-LA-101", "GT-WH-204", "GT-CF-310"}
    assert not hidden & set(codes(client))
    assert client.get("/api/properties/featured").json() == []
    for code in hidden:
        assert client.get(f"/api/properties/{code}").status_code == 404
        body = {"name": "Test", "phone": "55555555", "property_code": code}
        assert client.post("/api/enquiries", json=body).status_code == 404


def test_rented_has_page_but_is_not_listed(client, db):
    change(db, "GT-CF-310", status=PropertyStatus.RENTED)
    assert "GT-CF-310" not in codes(client)
    assert client.get("/api/properties/gt-cf-310").json()["status"] == "rented"
    counts = {x["slug"]: x["property_count"] for x in client.get("/api/locations").json()}
    assert counts["al-khor"] == 0


def test_featured_types_and_locations(client):
    assert len(client.get("/api/properties/featured").json()) == 3
    types = {t["slug"]: t for t in client.get("/api/property-types").json()}
    assert types["warehouse"]["property_count"] == 2
    assert types["residential"]["coming_soon"] is True
    assert len(client.get("/api/locations").json()) == 4
    assert client.get("/api/locations/industrial-area").json()["property_count"] == 3
    assert client.get("/api/locations/nowhere").status_code == 404


def test_nul_characters_do_not_crash(client):
    for path in (
        "properties?q=a%00",
        "properties?q=%00",
        "properties?type=%00",
        "properties?location=%00",
    ):
        assert client.get("/api/" + path).status_code == 200
    for path in ("properties/%00", "locations/%00"):
        assert client.get("/api/" + path).status_code == 404


# --- enquiries ------------------------------------------------------------


def test_enquiry_is_saved(client, db):
    body = {
        "property_code": "gt-la-101",
        "name": "  Test Person ",
        "phone": "5555 5555",
        "email": "",
        "looking_for": "",
        "reply_on_whatsapp": True,
    }
    response = client.post("/api/enquiries", json=body)
    assert response.status_code == 201
    saved = db.get(Enquiry, response.json()["reference"])
    assert (saved.name, saved.phone, saved.email) == ("Test Person", "+97455555555", None)
    assert saved.property_id and saved.status == "new"


@pytest.mark.parametrize(
    ("phone", "expected"),
    [
        ("+974 5555-5555", "+97455555555"),
        ("00974 55555555", "+97455555555"),
        ("٥٥٥٥٥٥٥٥", "+97455555555"),
        ("+91 98765 43210", "+919876543210"),
    ],
)
def test_phone_formats(client, db, phone, expected):
    response = client.post("/api/enquiries", json={"name": "Test", "phone": phone})
    assert db.get(Enquiry, response.json()["reference"]).phone == expected


@pytest.mark.parametrize(
    "bad",
    [
        {"phone": "123"},
        {"phone": "+974123"},
        {"phone": "call me"},
        {"name": "x"},
        {"email": "no"},
        {"message": "x" * 3001},
        {"message": "a\x00b"},
        {"status": "closed"},
        {"looking_for": "castle"},
    ],
)
def test_enquiry_validation(client, bad):
    body = {"name": "Test", "phone": "55555555"} | bad
    assert client.post("/api/enquiries", json=body).status_code == 422


def test_enquiry_rate_limit(client):
    body = {"name": "Test", "phone": "55555555"}
    results = [client.post("/api/enquiries", json=body) for _ in range(6)]
    assert [r.status_code for r in results] == [201] * 5 + [429]
    assert int(results[-1].headers["Retry-After"]) > 0


# --- media ----------------------------------------------------------------


def test_photo_becomes_webp_without_gps(client, storage):
    exif = Image.Exif()
    exif[0x0112] = 6  # camera was held sideways
    exif[0x8825] = {1: "N", 2: (25.0, 10.0, 0.0)}
    response = upload(client, picture(exif=exif))
    assert response.status_code == 201, response.text
    data = response.json()
    assert (data["width"], data["height"]) == (1000, 2000)
    assert data["is_cover"] is True
    ((content, content_type),) = storage.files.values()
    saved = Image.open(io.BytesIO(content))
    assert (saved.format, content_type) == ("WEBP", "image/webp")
    assert not saved.getexif()
    page = client.get("/api/properties/GT-LA-101").json()
    assert page["cover_url"] == data["url"] and page["photo_count"] == 1


def test_only_one_cover(client, db):
    upload(client, picture())
    upload(client, picture("PNG"))
    third = upload(client, picture("WEBP"), is_cover="true").json()
    covers = db.scalars(select(PropertyMedia.id).where(PropertyMedia.is_cover)).all()
    assert covers == [third["id"]]
    assert third["sort_order"] == 2


def test_video(client, storage):
    mp4 = b"\x00\x00\x00\x18ftypisom" + b"0" * 100
    assert upload(client, mp4, "tour.mp4", kind="video").json()["is_cover"] is False
    assert next(iter(storage.files)).endswith(".mp4")
    assert upload(client, mp4, kind="video", is_cover="true").status_code == 422


@pytest.mark.parametrize("kind", ["image", "video", "360"])
def test_bad_files_are_refused(client, storage, kind):
    assert upload(client, b"<script>alert(1)</script>", "x.jpg", kind=kind).status_code == 422
    assert upload(client, picture()[:200], "x.jpg", kind=kind).status_code == 422
    assert storage.files == {}


def test_upload_needs_key(client, storage):
    assert upload(client, picture(), headers={}).status_code == 401
    assert upload(client, picture(), headers={"X-Admin-Key": "wrong"}).status_code == 401
    assert storage.files == {}


def test_large_body_without_key_is_refused(client):
    assert upload(client, b"0" * (2 * 1024 * 1024), headers={}).status_code == 413


def test_chunked_body_is_refused(client):
    response = client.post("/api/enquiries", content=iter([b"{}"]))
    assert response.status_code == 411


def test_upload_unknown_property(client):
    response = client.post(
        "/api/admin/properties/NOPE/media", files={"file": ("a.jpg", picture())}, headers=AUTH
    )
    assert response.status_code == 404


def test_file_removed_when_database_fails(client, storage, monkeypatch):
    from app.api import media

    def fail(*args):
        raise RuntimeError("database down")

    monkeypatch.setattr(media, "_add_row", fail)
    with pytest.raises(RuntimeError):
        upload(client, picture())
    assert storage.files == {}
