"""Email alerts, Turnstile, share images, social posts and demo data."""

import io
from email import message_from_bytes, policy

import httpx
import pytest
from PIL import Image
from pydantic import SecretStr
from sqlalchemy import func, select

from app.core.config import settings
from app.models import Enquiry, Property, PropertyMedia, PropertyStatus, SocialPost
from app.scripts import demo
from app.services import mailer, social, turnstile

BODY = {"name": "Test Person", "phone": "55551234", "property_code": "GT-LA-101"}


def jpeg(color="green"):
    out = io.BytesIO()
    Image.new("RGB", (1600, 1200), color).save(out, "JPEG")
    return out.getvalue()


# --- email ----------------------------------------------------------------


@pytest.fixture
def mail(monkeypatch):
    sent = []
    monkeypatch.setattr(settings, "smtp_host", "smtp.example.com")
    monkeypatch.setattr(settings, "mail_from", "web@example.com")
    monkeypatch.setattr(settings, "enquiry_email_to", ["a@example.com", "b@example.com"])
    monkeypatch.setattr(mailer, "send", sent.append)
    return sent


def test_no_email_when_not_set_up(client, monkeypatch):
    monkeypatch.setattr(settings, "smtp_host", "")
    monkeypatch.setattr(mailer, "send", lambda message: pytest.fail("sent"))
    assert client.post("/api/enquiries", json=BODY).status_code == 201


def test_enquiry_email(client, mail):
    body = BODY | {"email": "visitor@example.org", "message": "مرحبا\nline two"}
    reference = client.post("/api/enquiries", json=body).json()["reference"]
    [message] = mail
    parsed = message_from_bytes(message.as_bytes(), policy=policy.default)
    assert parsed["Subject"] == f"New enquiry #{reference} - GT-LA-101 - Test Person"
    assert parsed["To"] == "a@example.com, b@example.com"
    assert parsed["Reply-To"] == "visitor@example.org"
    text = parsed.get_content()
    assert "مرحبا\nline two" in text
    assert "https://wa.me/97455551234?text=Hello%20Test%20Person" in text
    assert "/properties/GT-LA-101" in text


def test_email_headers_cannot_be_injected(client, mail):
    body = BODY | {"name": "Eve\nBcc: everyone@example.com"}
    assert client.post("/api/enquiries", json=body).status_code == 201
    assert mail[0]["Bcc"] is None
    assert mail[0]["Subject"].endswith("Eve Bcc: everyone@example.com")


def test_email_failure_keeps_the_enquiry(client, db, mail, monkeypatch):
    def broken(message):
        raise OSError("no connection")

    monkeypatch.setattr(mailer, "send", broken)
    assert client.post("/api/enquiries", json=BODY).status_code == 201
    assert db.scalar(select(func.count(Enquiry.id))) == 1


# --- Turnstile ------------------------------------------------------------


def answer(result):
    return lambda *args, **kwargs: httpx.Response(200, json=result)


def test_turnstile(client, db, monkeypatch):
    monkeypatch.setattr(settings, "turnstile_secret", SecretStr("secret"))
    monkeypatch.setattr(turnstile.httpx, "post", answer({"success": True}))
    assert client.post("/api/enquiries", json=BODY).status_code == 403
    good = BODY | {"turnstile_token": "token"}
    assert client.post("/api/enquiries", json=good).status_code == 201
    refused = {"success": False, "error-codes": ["timeout-or-duplicate"]}
    monkeypatch.setattr(turnstile.httpx, "post", answer(refused))
    assert client.post("/api/enquiries", json=good).status_code == 403

    def down(*args, **kwargs):
        raise httpx.ConnectError("down")

    monkeypatch.setattr(turnstile.httpx, "post", down)
    assert client.post("/api/enquiries", json=good).status_code == 201
    assert db.scalar(select(func.count(Enquiry.id))) == 2


# --- share image ----------------------------------------------------------


def add_photo(client, headers, db, code="GT-LA-101"):
    prop = db.scalar(select(Property).where(Property.code == code))
    files = {"file": ("a.jpg", jpeg(), "image/jpeg")}
    url = f"/api/admin/properties/{prop.id}/media"
    assert client.post(url, files=files, headers=headers).status_code == 201
    return prop


def test_share_image(client, db, admin):
    assert client.get("/api/properties/GT-LA-101/share.jpg").status_code == 404
    prop = add_photo(client, admin, db)
    response = client.get("/api/properties/gt-la-101/share.jpg")
    assert response.headers["content-type"] == "image/jpeg"
    image = Image.open(io.BytesIO(response.content))
    assert (image.format, image.size) == ("JPEG", (1200, 630))
    prop.status = PropertyStatus.DRAFT
    db.commit()
    assert client.get("/api/properties/GT-LA-101/share.jpg").status_code == 404


# --- Facebook and Instagram -----------------------------------------------


@pytest.fixture
def meta(monkeypatch):
    calls = []

    def fake(method, path, data):
        calls.append((method, path, data))
        return {"id": "77", "status_code": "FINISHED"}

    monkeypatch.setattr(settings, "meta_access_token", SecretStr("token"))
    monkeypatch.setattr(settings, "meta_page_id", "111")
    monkeypatch.setattr(settings, "meta_instagram_id", "222")
    monkeypatch.setattr(settings, "site_url", "https://greentech.example")
    monkeypatch.setattr(social, "call", fake)
    return calls


def test_social_posts(client, db, admin, meta):
    prop = add_photo(client, admin, db)
    url = f"/api/admin/properties/{prop.id}/social"
    state = client.get(url, headers=admin).json()
    assert state["networks"] == ["facebook", "instagram"] and state["online"]

    body = {"network": "facebook", "text": "New camp"}
    assert client.post(url, json=body, headers=admin).status_code == 201
    image = "https://greentech.example/share/GT-LA-101.jpg"
    assert meta == [("POST", "111/photos", {"url": image, "caption": "New camp"})]
    assert client.post(url, json=body, headers=admin).status_code == 409
    assert client.post(url, json=body | {"again": True}, headers=admin).status_code == 201

    meta.clear()
    posts = client.post(url, json=body | {"network": "instagram"}, headers=admin).json()
    assert [path for _, path, _ in meta] == ["222/media", "77", "222/media_publish"]
    assert [p["network"] for p in posts] == ["instagram", "facebook", "facebook"]
    assert posts[0]["user_name"] == "admin"


def test_social_refusals(client, db, admin, agent, meta, monkeypatch):
    prop = db.scalar(select(Property).where(Property.code == "GT-LA-101"))
    url = f"/api/admin/properties/{prop.id}/social"
    body = {"network": "facebook", "text": "x"}
    assert client.post(url, json=body, headers=agent).status_code == 403
    assert client.get(url, headers=agent).status_code == 403
    assert client.post(url, json=body, headers=admin).json()["detail"] == "Add a photo first"
    add_photo(client, admin, db)

    prop.status = PropertyStatus.DRAFT
    db.commit()
    assert "Publish" in client.post(url, json=body, headers=admin).json()["detail"]
    prop.status = PropertyStatus.AVAILABLE
    db.commit()

    def refuse(*args):
        raise social.SocialError("Facebook answered: no")

    monkeypatch.setattr(social, "call", refuse)
    assert client.post(url, json=body, headers=admin).status_code == 502
    monkeypatch.setattr(settings, "site_url", "http://localhost:3000")
    assert "online" in client.post(url, json=body, headers=admin).json()["detail"]
    monkeypatch.setattr(settings, "meta_page_id", "")
    assert "not set up" in client.post(url, json=body, headers=admin).json()["detail"]
    assert db.scalar(select(func.count(SocialPost.id))) == 0


def test_meta_call_hides_the_token_from_the_address(monkeypatch):
    seen = {}

    def request(method, url, **kwargs):
        seen.update(url=url, **kwargs)
        return httpx.Response(400, json={"error": {"message": "Bad token"}})

    monkeypatch.setattr(settings, "meta_access_token", SecretStr("hush"))
    monkeypatch.setattr(social.httpx, "request", request)
    with pytest.raises(social.SocialError, match="Bad token"):
        social.call("GET", "1", {"fields": "x"})
    assert "hush" not in seen["url"] + str(seen["params"])


# --- demo data ------------------------------------------------------------


def test_demo_data(db, storage, tmp_path):
    for name in "a115 a151 a17 a4".split():
        (tmp_path / f"{name}.jpg").write_bytes(jpeg())
    (tmp_path / "tour-camp.mp4").write_bytes(b"\0\0\0\x18ftypisom" + b"0" * 50)
    first = demo.load(db, storage, tmp_path)
    assert first == {"listings": 11, "photos and videos": 5, "enquiries": 5}

    # A file that arrives later is added once; nothing is doubled.
    (tmp_path / "docks1.webm").write_bytes(b"\x1a\x45\xdf\xa3" + b"0" * 50)
    assert demo.load(db, storage, tmp_path)["photos and videos"] == 1
    assert set(demo.load(db, storage, tmp_path).values()) == {0}
    assert len(storage.files) == 6

    mine = db.scalar(select(Property).where(Property.code == "GT-LA-101"))
    mine.description_en = "A real property now"
    db.commit()
    assert demo.remove(db, storage) == {"listings": 16, "enquiries": 5}
    assert db.scalars(select(Property.code)).all() == ["GT-LA-101"]
    assert len(storage.files) == db.scalar(select(func.count(PropertyMedia.id))) == 3
