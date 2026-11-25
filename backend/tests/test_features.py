"""Viewing bookings, brochures, reports, articles."""

import io
from datetime import UTC, date, datetime, timedelta

import pytest
from PIL import Image
from sqlalchemy import select

from app.api.reports import without_private
from app.models import ChatQuestion, DailyCount, Enquiry, Property, PropertyMedia, User, Viewing
from app.schemas.viewing import ViewingSettings
from app.services import brochure, qatar, viewings

CODE = "GT-LA-101"
NOW = datetime(2026, 12, 1, 10, 0, tzinfo=qatar.QATAR)  # a Tuesday


@pytest.fixture(autouse=True)
def clock(monkeypatch, request):
    if "real_time" not in request.keywords:
        monkeypatch.setattr(qatar, "now", lambda: NOW)


def picture():
    out = io.BytesIO()
    Image.new("RGB", (800, 600), "#336655").save(out, "JPEG")
    return out.getvalue()


def book(client, **values):
    body = {"property_code": CODE, "day": "2026-12-02", "time": "10:00"}
    body |= {"name": "Ali Hassan", "phone": "55555555", "source": "Google"}
    return client.post("/api/viewings", json=body | values)


# --- viewings -------------------------------------------------------------


def test_slots(client, db, admin):
    days = client.get(f"/api/viewings/slots?code={CODE}").json()
    # Today only after the 4 hours' notice; Friday 4 December is closed.
    assert days[0] == {"day": "2026-12-01", "times": ["14:00", "15:00", "16:00"]}
    assert days[1]["times"][0] == "09:00" and days[1]["times"][-1] == "16:00"
    assert "2026-12-04" not in [d["day"] for d in days]
    assert days[-1]["day"] == "2026-12-22"

    rules = {"days": [2], "start": "08:00", "end": "09:30", "minutes": 30}
    rules |= {"closed": ["2026-12-02"], "days_ahead": 10}
    url = "/api/admin/viewing-settings"
    assert client.put(url, json=rules, headers=admin).status_code == 200
    days = client.get(f"/api/viewings/slots?code={CODE}").json()
    assert days == [{"day": "2026-12-09", "times": ["08:00", "08:30", "09:00"]}]
    assert client.put(url, json=rules | {"end": "07:00"}, headers=admin).status_code == 422
    client.put(url, json=rules | {"enabled": False}, headers=admin)
    assert client.get(f"/api/viewings/slots?code={CODE}").json() == []

    prop = db.scalar(select(Property).where(Property.code == CODE))
    prop.status = "rented"
    db.commit()
    assert client.get(f"/api/viewings/slots?code={CODE}").status_code == 404


def test_times_of_day():
    assert viewings.times_of_day(ViewingSettings(start="09:00", end="10:00", minutes=90)) == []


def test_booking(client, db, admin, agent):
    made = book(client)
    assert made.status_code == 201
    row = db.get(Viewing, made.json()["reference"])
    assert (row.phone, row.source, row.status) == ("+97455555555", "google", "requested")
    assert book(client).status_code == 409  # same time
    assert book(client, time="10:30").status_code == 409  # not a slot
    assert book(client, day="2026-12-04").status_code == 409  # Friday
    limiter_left = book(client, property_code="GT-XX-1")
    assert limiter_left.status_code == 404
    assert book(client, time="11:00").status_code == 429


@pytest.mark.parametrize(
    "bad", [{"phone": "1"}, {"name": ""}, {"time": "25:00"}, {"day": "x"}, {"people": 0}]
)
def test_booking_validation(client, bad):
    assert book(client, **bad).status_code == 422


def test_viewings_admin(client, db, admin, agent):
    first = book(client).json()["reference"]
    second = book(client, time="11:00", source="<bad>").json()["reference"]
    url = f"/api/admin/viewings/{first}"
    rows = client.get("/api/admin/viewings?q=ali la-101", headers=agent).json()
    assert [r["id"] for r in rows["items"]] == [first, second]
    assert rows["items"][1]["source"] == ""
    assert client.get("/api/admin/stats", headers=agent).json()["upcoming_viewings"] == 2

    moved = client.patch(url, json={"time": "11:00"}, headers=agent)
    assert moved.status_code == 409
    moved = client.patch(url, json={"day": "2026-12-03", "status": "confirmed"}, headers=agent)
    assert (moved.json()["day"], moved.json()["status"]) == ("2026-12-03", "confirmed")
    boss = db.scalar(select(User.id).where(User.email == "admin@example.com"))
    mine = db.scalar(select(User.id).where(User.email == "agent@example.com"))
    assert client.patch(url, json={"assigned_to_id": boss}, headers=agent).status_code == 403
    assert client.patch(url, json={"assigned_to_id": mine}, headers=agent).status_code == 200
    client.patch(url, json={"assigned_to_id": boss}, headers=admin)
    assert client.patch(url, json={"status": "done"}, headers=agent).status_code == 404

    # A cancelled visit frees the time.
    client.patch(f"/api/admin/viewings/{second}", json={"status": "cancelled"}, headers=admin)
    assert book(client, time="11:00").status_code == 201
    again = {"status": "requested"}
    url2 = f"/api/admin/viewings/{second}"
    assert client.patch(url2, json=again, headers=admin).status_code == 409
    assert client.get("/api/admin/viewings?when=past", headers=admin).json()["total"] == 0
    assert client.delete(url, headers=agent).status_code == 403
    assert client.delete(url, headers=admin).status_code == 204
    assert client.get("/api/admin/viewing-settings", headers=agent).status_code == 403


# --- favourites -----------------------------------------------------------


def test_property_cards(client):
    url = f"/api/property-cards?codes=gt-wh-204&codes=NOPE&codes={CODE}&codes=GT-WH-204"
    assert [p["code"] for p in client.get(url).json()] == ["GT-WH-204", CODE]


# --- brochure -------------------------------------------------------------


@pytest.mark.parametrize("language", ["en", "ar"])
def test_brochure(client, db, storage, admin, monkeypatch, language):
    monkeypatch.setattr(brochure, "safe_map", lambda *args: None)
    prop = db.scalar(select(Property).where(Property.code == CODE))
    prop.title_ar = "مبنى سكن عمال"
    prop.description_en = "Long text. " * 400
    db.commit()
    for n in range(4):
        storage.files[f"p{n}"] = (picture(), "image/jpeg")
        db.add(PropertyMedia(property_id=prop.id, object_key=f"p{n}", kind="image", sort_order=n))
    db.commit()
    company = {"whatsapp": "55555555", "address_ar": "الدوحة", "address_en": "Doha"}
    client.put("/api/admin/company", json=company, headers=admin)
    reply = client.get(f"/api/properties/{CODE}/brochure.pdf?language={language}")
    assert reply.headers["content-type"] == "application/pdf"
    assert reply.content.startswith(b"%PDF") and reply.content.count(b"/Type /Page\n") == 1
    assert client.get("/api/properties/NOPE/brochure.pdf").status_code == 404


def test_brochure_with_nothing(client, db, monkeypatch):
    monkeypatch.setattr(brochure, "safe_map", lambda *args: None)
    prop = db.scalar(select(Property).where(Property.code == "GT-WH-204"))
    prop.rent_qar = prop.area_sqm = prop.rooms = prop.floors = prop.capacity_persons = None
    prop.amenities, prop.description_en, prop.lat, prop.lng = [], "", None, None
    db.commit()
    assert client.get("/api/properties/GT-WH-204/brochure.pdf").status_code == 200


# --- reports --------------------------------------------------------------


def test_track(client, db):
    for body in (
        {"kind": "view", "code": CODE.lower()},
        {"kind": "view", "code": CODE},
        {"kind": "view", "code": "NOPE"},
        {"kind": "view"},
        {"kind": "call"},
    ):
        assert client.post("/api/track", json=body).status_code == 204
    assert client.post("/api/track", json={"kind": "evil"}).status_code == 422
    rows = {(r.kind, r.code): r.count for r in db.scalars(select(DailyCount))}
    assert rows == {("view", CODE): 2, ("call", ""): 1}


def test_unanswered(client, db, admin, agent):
    for text in ("Do you allow PETS?", "do you allow pets?"):
        assert client.post("/api/chat/unanswered", json={"text": text}).status_code == 204
    (row,) = db.scalars(select(ChatQuestion)).all()
    assert (row.text, row.count) == ("do you allow pets?", 2)
    assert (
        without_private("Call +974 5555 5555 or me@x.com\n now") == "call [number] or [email] now"
    )
    url = f"/api/admin/chat-questions/{row.id}"
    assert client.delete(url, headers=agent).status_code == 403
    assert client.delete(url, headers=admin).status_code == 204


def test_report(client, db, admin, agent, monkeypatch):
    real = datetime.now(qatar.QATAR)
    monkeypatch.setattr(qatar, "now", lambda: real)
    mine = db.scalar(select(User.id).where(User.email == "agent@example.com"))
    prop = db.scalar(select(Property.id).where(Property.code == CODE))
    made = datetime.now(UTC) - timedelta(hours=1)
    for source in ("google", ""):
        db.add(Enquiry(name="A", phone="+97455555555", property_id=prop, source=source))
    db.add(
        Enquiry(
            name="B",
            phone="+97455555555",
            assigned_to_id=mine,
            created_at=made,
        )
    )
    db.commit()
    target = db.scalar(select(Enquiry.id).where(Enquiry.name == "B"))
    for status in ("contacted", "closed"):
        client.patch(f"/api/admin/enquiries/{target}", json={"status": status}, headers=agent)
    client.post("/api/track", json={"kind": "view", "code": CODE})
    db.add(DailyCount(day=qatar.today() - timedelta(days=40), kind="view", code=CODE, count=7))
    db.commit()

    assert client.get("/api/admin/reports", headers=agent).status_code == 403
    assert client.get("/api/admin/reports?days=5", headers=admin).status_code == 422
    data = client.get("/api/admin/reports?days=30", headers=admin).json()
    assert (data["totals"]["view"], data["before"]["view"]) == (1, 7)
    assert data["totals"]["enquiry"] == 3 and len(data["daily"]) == 30
    assert date.fromisoformat(data["daily"][-1]["day"]) == qatar.today()
    top = data["properties"][0]
    assert (top["code"], top["view"], top["enquiry"]) == (CODE, 1, 2)
    assert {s["source"]: s["enquiries"] for s in data["sources"]} == {"direct": 2, "google": 1}
    (row,) = data["agents"]
    assert (row["answered"], row["closed"], row["average_hours"]) == (1, 1, 1.0)


# --- articles -------------------------------------------------------------


def test_articles(client, storage, admin, agent):
    url = "/api/admin/articles"
    body = {"slug": "al-khor-guide", "title_en": "Al Khor guide", "location_id": 1, "type_id": 1}
    assert client.post(url, json=body, headers=agent).status_code == 403
    made = client.post(url, json=body, headers=admin).json()
    mine = f"{url}/{made['id']}"
    assert client.get("/api/articles").json() == []
    assert client.get("/api/articles/al-khor-guide").status_code == 404
    assert client.post(url, json=body, headers=admin).status_code == 409
    for bad in ({"published": True}, {"slug": "Bad Name"}, {"title_en": ""}, {"location_id": 999}):
        assert client.put(mine, json=body | bad, headers=admin).status_code == 422, bad

    good = body | {"body_en": "# Hello", "published": True}
    first = client.put(mine, json=good, headers=admin).json()["published_at"]
    assert client.put(mine, json=good, headers=admin).json()["published_at"] == first
    files = {"file": ("a.jpg", picture())}
    for _ in range(2):
        assert client.post(mine + "/cover", files=files, headers=admin).status_code == 201
    assert len(storage.files) == 1
    (card,) = client.get("/api/articles").json()
    assert card["cover_url"] and card["location"]["slug"] == "industrial-area"
    assert "body_en" not in card
    assert client.get("/api/articles/al-khor-guide").json()["body_en"] == "# Hello"
    assert client.delete(mine + "/cover", headers=admin).json()["cover_url"] is None
    client.post(mine + "/cover", files=files, headers=admin)
    assert client.delete(mine, headers=admin).status_code == 204
    assert storage.files == {} and client.get("/api/articles").json() == []
