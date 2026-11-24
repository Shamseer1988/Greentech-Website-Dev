import io
from datetime import UTC, datetime, timedelta

import jwt
import pytest
from openpyxl import load_workbook
from sqlalchemy import select

from app.core.config import settings
from app.main import app
from app.models import Enquiry, Property, PropertyMedia, User, UserRole
from tests.conftest import PASSWORD, headers_for, make_user
from tests.test_api import picture, upload


def login(client, email="admin@example.com", password=PASSWORD):
    return client.post("/api/auth/login", json={"email": email, "password": password})


def new_property(**values):
    return {"code": "gt-new-1", "title_en": "New", "type_id": 1, "location_id": 1} | values


def enquiry(db, **values):
    row = Enquiry(name="Visitor", phone="+97455555555", **values)
    db.add(row)
    db.commit()
    return row


# --- login ----------------------------------------------------------------


def test_login(client, admin):
    response = login(client, " ADMIN@example.com ")
    assert response.status_code == 200
    headers = {"Authorization": f"Bearer {response.json()['token']}"}
    assert client.get("/api/admin/me", headers=headers).json()["role"] == "admin"
    assert "password" not in response.text


def test_wrong_login_is_limited(client, admin):
    assert [login(client, password="wrong").status_code for _ in range(6)] == [401] * 5 + [429]
    assert login(client).status_code == 429  # even with the right password
    assert login(client, "nobody@example.com").status_code == 401
    assert login(client, "a\x00b").status_code == 401


def test_good_logins_are_not_limited(client, admin):
    assert {login(client).status_code for _ in range(8)} == {200}


@pytest.mark.parametrize("secret", ["x" * 40, ""])
def test_forged_token(client, admin, secret):
    payload = {"sub": "1", "ver": 0, "exp": datetime.now(UTC) + timedelta(hours=1)}
    token = jwt.encode(payload, secret or None, algorithm="HS256" if secret else "none")
    headers = {"Authorization": f"Bearer {token}"}
    assert client.get("/api/admin/me", headers=headers).status_code == 401


def test_expired_token(client, admin):
    token = jwt.encode(
        {"sub": "1", "ver": 0, "exp": datetime.now(UTC) - timedelta(seconds=1)},
        settings.jwt_secret.get_secret_value(),
        algorithm="HS256",
    )
    headers = {"Authorization": f"Bearer {token}"}
    assert client.get("/api/admin/me", headers=headers).status_code == 401


def test_every_admin_route_needs_login(client):
    checked = 0
    for path, methods in app.openapi()["paths"].items():
        if not path.startswith("/api/admin"):
            continue
        for method in methods:
            url = path
            for name in ("property_id", "media_id", "enquiry_id", "location_id", "user_id"):
                url = url.replace("{" + name + "}", "1")
            assert client.request(method, url).status_code == 401, (method, url)
            checked += 1
    assert checked > 20


def test_agent_limits(client, agent):
    for method, url in [
        ("DELETE", "/properties/1"),
        ("POST", "/locations"),
        ("PUT", "/locations/1"),
        ("DELETE", "/locations/1"),
        ("POST", "/users"),
        ("PATCH", "/users/1"),
        ("DELETE", "/enquiries/1"),
        ("GET", "/export/properties"),
        ("GET", "/export/enquiries"),
    ]:
        assert client.request(method, "/api/admin" + url, headers=agent).status_code in (403, 422)
        if method in ("GET", "DELETE"):
            assert client.request(method, "/api/admin" + url, headers=agent).status_code == 403
    body = {"email": "x@example.com", "full_name": "Xx", "password": "long enough password"}
    assert client.post("/api/admin/users", json=body, headers=agent).status_code == 403
    assert (
        client.patch("/api/admin/users/1", json={"role": "admin"}, headers=agent).status_code == 403
    )


def test_change_password(client, admin):
    body = {"current_password": "wrong", "new_password": "another long one"}
    assert client.post("/api/auth/password", json=body, headers=admin).status_code == 422
    body["current_password"] = PASSWORD
    response = client.post("/api/auth/password", json=body, headers=admin)
    assert response.status_code == 200
    assert client.get("/api/admin/me", headers=admin).status_code == 401  # old login ended
    headers = {"Authorization": f"Bearer {response.json()['token']}"}
    assert client.get("/api/admin/me", headers=headers).status_code == 200


# --- users ----------------------------------------------------------------


def test_users(client, db, admin):
    body = {"email": "New@Example.com", "full_name": "New", "password": "long enough password"}
    created = client.post("/api/admin/users", json=body, headers=admin)
    assert created.status_code == 201 and created.json()["role"] == "agent"
    assert client.post("/api/admin/users", json=body, headers=admin).status_code == 409
    assert (
        client.post(
            "/api/admin/users", json=body | {"password": "short"}, headers=admin
        ).status_code
        == 422
    )
    user = db.get(User, created.json()["id"])
    headers = headers_for(user)
    assert client.get("/api/admin/me", headers=headers).status_code == 200
    url = f"/api/admin/users/{user.id}"
    assert client.patch(url, json={"is_active": False}, headers=admin).status_code == 200
    assert client.get("/api/admin/me", headers=headers).status_code == 401
    assert login(client, "new@example.com", body["password"]).status_code == 401


def test_admin_cannot_lock_self_out(client, db, admin):
    me = client.get("/api/admin/me", headers=admin).json()["id"]
    for body in ({"role": "agent"}, {"is_active": False}, {"password": "long enough password"}):
        assert client.patch(f"/api/admin/users/{me}", json=body, headers=admin).status_code == 422


# --- properties -----------------------------------------------------------


def test_property_life(client, db, agent, admin, storage):
    created = client.post("/api/admin/properties", json=new_property(), headers=agent)
    assert created.status_code == 201, created.text
    prop = created.json()
    assert (prop["code"], prop["status"], prop["published_at"]) == ("GT-NEW-1", "draft", None)
    assert client.get("/api/properties/GT-NEW-1").status_code == 404

    url = f"/api/admin/properties/{prop['id']}"
    response = client.patch(url, json={"status": "available", "featured": True}, headers=agent)
    first = response.json()["published_at"]
    assert first and client.get("/api/properties/GT-NEW-1").json()["featured"] is True
    client.patch(url, json={"status": "draft"}, headers=agent)
    assert client.get("/api/properties/GT-NEW-1").status_code == 404
    response = client.patch(url, json={"status": "rented"}, headers=agent)
    assert response.json()["published_at"] == first

    body = new_property(code="GT-NEW-2", amenities=["A", "A", "B"], rent_qar=5, lat=25.1, lng=51.2)
    saved = client.put(url, json=body, headers=agent).json()
    assert (saved["code"], saved["amenities"], saved["rent_qar"]) == ("GT-NEW-2", ["A", "B"], 5)

    upload_url = url + "/media"
    files = {"file": ("a.jpg", picture())}
    assert client.post(upload_url, files=files, headers=agent).status_code == 201
    row = enquiry(db, property_id=prop["id"])
    assert client.delete(url, headers=admin).status_code == 204
    assert storage.files == {}
    db.refresh(row)
    assert row.property_id is None


@pytest.mark.parametrize(
    "bad",
    [
        {"code": "GT LA"},
        {"code": "a"},
        {"code": "featured"},
        {"title_en": ""},
        {"rent_qar": -1},
        {"rent_qar": 99999999999},
        {"lat": 25},
        {"lat": 95, "lng": 51},
        {"type_id": 999},
        {"location_id": 999},
        {"status": "sold"},
        {"amenities": ["x" * 81]},
        {"published_at": "2020-01-01"},
        {"title_en": "a\x00b"},
    ],
)
def test_property_validation(client, agent, bad):
    body = new_property(**bad)
    assert client.post("/api/admin/properties", json=body, headers=agent).status_code == 422


def test_code_must_be_unique(client, agent):
    body = new_property(code="gt-la-101")
    assert client.post("/api/admin/properties", json=body, headers=agent).status_code == 409


def test_property_list(client, db, agent):
    enquiry(db, property_id=1)
    data = client.get("/api/admin/properties?q=gt-la-101", headers=agent).json()
    assert data["total"] == 1 and data["items"][0]["enquiry_count"] == 1
    data = client.get("/api/admin/properties?status=draft", headers=agent).json()
    assert data["total"] == 0
    assert client.get("/api/admin/properties?q=%00", headers=agent).status_code == 200


# --- photos ---------------------------------------------------------------


def test_photo_order_cover_delete(client, db, agent, storage):
    ids = [upload(client, picture(), agent).json()["id"] for _ in range(3)]
    url = "/api/admin/properties/1/media/order"
    order = [ids[2], ids[0], ids[1]]
    assert client.put(url, json={"ids": order}, headers=agent).status_code == 200
    assert client.put(url, json={"ids": order[:2]}, headers=agent).status_code == 409
    assert client.put(url, json={"ids": [ids[0]] * 3}, headers=agent).status_code == 409
    public = client.get("/api/properties/GT-LA-101").json()
    assert [m["id"] for m in public["media"]] == order

    media = client.put(f"/api/admin/media/{ids[1]}/cover", headers=agent).json()
    assert [m["id"] for m in media if m["is_cover"]] == [ids[1]]
    left = client.delete(f"/api/admin/media/{ids[1]}", headers=agent).json()
    assert [m["id"] for m in left if m["is_cover"]] == [ids[2]]  # next photo becomes cover
    assert len(storage.files) == 2
    assert db.scalar(select(PropertyMedia.id).where(PropertyMedia.id == ids[1])) is None


def test_video_cannot_be_cover(client, agent):
    mp4 = b"\x00\x00\x00\x18ftypisom" + b"0" * 100
    media = upload(client, mp4, agent, kind="video").json()
    assert client.put(f"/api/admin/media/{media['id']}/cover", headers=agent).status_code == 422


# --- enquiries ------------------------------------------------------------


def test_agents_see_own_and_free_enquiries(client, db, admin, agent):
    other = make_user(db, "other@example.com", UserRole.AGENT)
    me = db.scalar(select(User).where(User.email == "agent@example.com"))
    free, mine = enquiry(db), enquiry(db, assigned_to_id=me.id)
    hidden = enquiry(db, assigned_to_id=other.id)

    def seen(headers, query=""):
        data = client.get("/api/admin/enquiries" + query, headers=headers).json()
        return {e["id"] for e in data["items"]}

    assert seen(agent) == {free.id, mine.id}
    assert seen(admin) == {free.id, mine.id, hidden.id}
    assert seen(agent, "?assigned=me") == {mine.id}
    assert seen(admin, "?assigned=none") == {free.id}
    assert client.get("/api/admin/stats", headers=agent).json()["open_enquiries"] == 2

    url = "/api/admin/enquiries/"
    assert (
        client.patch(f"{url}{hidden.id}", json={"status": "closed"}, headers=agent).status_code
        == 404
    )
    body = {"assigned_to_id": other.id}
    assert client.patch(f"{url}{free.id}", json=body, headers=agent).status_code == 403
    taken = client.patch(f"{url}{free.id}", json={"assigned_to_id": me.id}, headers=agent).json()
    assert taken["assigned_to_name"] == "agent"
    kept = client.patch(f"{url}{free.id}", json={"status": "contacted"}, headers=agent).json()
    assert (kept["status"], kept["assigned_to_id"]) == ("contacted", me.id)
    freed = client.patch(f"{url}{free.id}", json={"assigned_to_id": None}, headers=admin).json()
    assert freed["assigned_to_id"] is None
    assert (
        client.patch(f"{url}{free.id}", json={"assigned_to_id": 999}, headers=admin).status_code
        == 422
    )
    assert client.delete(f"{url}{free.id}", headers=admin).status_code == 204


# --- locations ------------------------------------------------------------


def test_locations(client, db, admin):
    body = {"slug": "wakra", "name_en": "Al Wakra", "name_ar": "الوكرة", "lat": 25.17, "lng": 51.6}
    created = client.post("/api/admin/locations", json=body, headers=admin)
    assert created.status_code == 201
    assert client.post("/api/admin/locations", json=body, headers=admin).status_code == 409
    for bad in ({"slug": "Al Wakra"}, {"slug": "a/b"}, {"lat": 100}, {"name_ar": ""}):
        assert (
            client.post("/api/admin/locations", json=body | bad, headers=admin).status_code == 422
        )
    url = f"/api/admin/locations/{created.json()['id']}"
    client.put(url, json=body | {"is_active": False}, headers=admin)
    assert client.get("/api/locations/wakra").status_code == 404
    assert client.delete(url, headers=admin).status_code == 204
    assert client.delete("/api/admin/locations/1", headers=admin).status_code == 409
    assert db.scalar(select(Property.id).where(Property.location_id == 1)) is not None


# --- Excel ----------------------------------------------------------------


def test_excel(client, db, admin):
    enquiry(db, company='=HYPERLINK("http://evil")', message="+1")
    response = client.get("/api/admin/export/enquiries", headers=admin)
    assert "attachment" in response.headers["content-disposition"]
    sheet = load_workbook(io.BytesIO(response.content)).active
    cell = sheet["D2"]
    assert cell.value.startswith("=HYPERLINK") and cell.data_type == "s"

    response = client.get("/api/admin/export/properties", headers=admin)
    sheet = load_workbook(io.BytesIO(response.content)).active
    assert sheet.max_row == 7 and sheet["A2"].value == "GT-CF-310"
