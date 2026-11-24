"""Enquiries, locations, users, numbers for the dashboard, and Excel export."""

from datetime import UTC, datetime, timedelta
from math import ceil
from typing import Annotated, Literal

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import ColumnElement, func, or_, select, true
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload

from app.core.db import get_db
from app.core.security import AdminUser, CurrentUser, current_user, hash_password
from app.models import (
    Enquiry,
    EnquiryStatus,
    Location,
    Property,
    PropertyStatus,
    User,
    UserRole,
)
from app.schemas.admin import (
    EnquiryRow,
    EnquiryRows,
    EnquiryUpdate,
    LocationFull,
    LocationIn,
    Stats,
    UserIn,
    UserOut,
    UserUpdate,
)
from app.schemas.common import Id
from app.services.excel import workbook
from app.services.properties import with_relations

router = APIRouter(prefix="/admin", tags=["admin"], dependencies=[Depends(current_user)])
Db = Annotated[Session, Depends(get_db)]
PAGE_SIZE = 20


# --- enquiries ------------------------------------------------------------


def visible_to(user: User) -> ColumnElement[bool]:
    """Agents see their own enquiries and those nobody has taken yet."""
    if user.role == UserRole.ADMIN:
        return true()
    return or_(Enquiry.assigned_to_id == user.id, Enquiry.assigned_to_id.is_(None))


def enquiries_for(user: User):
    return (
        select(Enquiry)
        .where(visible_to(user))
        .options(joinedload(Enquiry.property), joinedload(Enquiry.assigned_to))
    )


@router.get("/stats")
def stats(user: CurrentUser, db: Db) -> Stats:
    def count(column, *where) -> int:
        return db.scalar(select(func.count(column)).where(*where)) or 0

    week_ago = datetime.now(UTC) - timedelta(days=7)
    return Stats(
        total=count(Property.id),
        available=count(Property.id, Property.status == PropertyStatus.AVAILABLE),
        new_enquiries_7_days=count(Enquiry.id, visible_to(user), Enquiry.created_at >= week_ago),
        open_enquiries=count(Enquiry.id, visible_to(user), Enquiry.status != EnquiryStatus.CLOSED),
    )


@router.get("/enquiries")
def list_enquiries(
    user: CurrentUser,
    db: Db,
    q: Annotated[str, Query(max_length=100)] = "",
    status: EnquiryStatus | None = None,
    assigned: Literal["me", "none"] | None = None,
    page: Annotated[int, Query(ge=1, le=10_000)] = 1,
) -> EnquiryRows:
    stmt = enquiries_for(user)
    for word in q.replace("\x00", "").split():
        columns = (Enquiry.name, Enquiry.company, Enquiry.phone, Enquiry.email, Enquiry.message)
        stmt = stmt.where(or_(*(c.icontains(word, autoescape=True) for c in columns)))
    if status:
        stmt = stmt.where(Enquiry.status == status)
    if assigned == "me":
        stmt = stmt.where(Enquiry.assigned_to_id == user.id)
    if assigned == "none":
        stmt = stmt.where(Enquiry.assigned_to_id.is_(None))
    total = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    rows = db.scalars(
        stmt.order_by(Enquiry.id.desc()).offset((page - 1) * PAGE_SIZE).limit(PAGE_SIZE)
    )
    return EnquiryRows(
        items=[EnquiryRow.build(e) for e in rows],
        total=total,
        page=page,
        pages=ceil(total / PAGE_SIZE),
    )


def find_enquiry(db: Session, user: User, enquiry_id: int) -> Enquiry:
    # Locked, so two agents cannot both take the same enquiry.
    enquiry = db.scalar(
        select(Enquiry).where(visible_to(user), Enquiry.id == enquiry_id).with_for_update()
    )
    if enquiry is None:
        raise HTTPException(404, "Enquiry not found")
    return enquiry


@router.patch("/enquiries/{enquiry_id}")
def update_enquiry(enquiry_id: Id, data: EnquiryUpdate, user: CurrentUser, db: Db) -> EnquiryRow:
    enquiry = find_enquiry(db, user, enquiry_id)
    if data.status is not None:
        enquiry.status = data.status
    if "assigned_to_id" in data.model_fields_set:
        target = data.assigned_to_id
        if user.role != UserRole.ADMIN and target not in (user.id, None):
            raise HTTPException(403, "Only an admin can assign enquiries to other people")
        if target is not None:
            agent = db.get(User, target)
            if agent is None or not agent.is_active:
                raise HTTPException(422, "Choose an active user")
        enquiry.assigned_to_id = target
    db.commit()
    return EnquiryRow.build(enquiry)


@router.delete("/enquiries/{enquiry_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_enquiry(enquiry_id: Id, user: AdminUser, db: Db) -> None:
    db.delete(find_enquiry(db, user, enquiry_id))
    db.commit()


# --- locations ------------------------------------------------------------


def location_rows(db: Session, *where) -> list[LocationFull]:
    count = (
        select(func.count(Property.id)).where(Property.location_id == Location.id).scalar_subquery()
    )
    rows = db.execute(
        select(Location, count).where(*where).order_by(Location.sort_order, Location.id)
    )
    return [
        LocationFull.model_construct(
            **{name: getattr(loc, name) for name in LocationIn.model_fields},
            id=loc.id,
            property_count=n,
        )
        for loc, n in rows
    ]


@router.get("/locations")
def list_locations(db: Db) -> list[LocationFull]:
    return location_rows(db)


def find_location(db: Session, location_id: int) -> Location:
    location = db.get(Location, location_id)
    if location is None:
        raise HTTPException(404, "Location not found")
    return location


def save_location(db: Session, location: Location, data: LocationIn) -> LocationFull:
    for name, value in data.model_dump().items():
        setattr(location, name, value)
    db.add(location)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(409, f"The web name “{data.slug}” is already used") from exc
    return location_rows(db, Location.id == location.id)[0]


@router.post("/locations", status_code=status.HTTP_201_CREATED)
def create_location(data: LocationIn, db: Db, _: AdminUser) -> LocationFull:
    return save_location(db, Location(), data)


@router.put("/locations/{location_id}")
def update_location(location_id: Id, data: LocationIn, db: Db, _: AdminUser) -> LocationFull:
    return save_location(db, find_location(db, location_id), data)


@router.delete("/locations/{location_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_location(location_id: Id, db: Db, _: AdminUser) -> None:
    db.delete(find_location(db, location_id))
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            409, "This location has properties. Hide it, or move the properties first."
        ) from exc


# --- users ----------------------------------------------------------------


@router.get("/users")
def list_users(user: CurrentUser, db: Db) -> list[UserOut]:
    """Agents only see themselves."""
    stmt = select(User).order_by(User.full_name, User.id)
    if user.role != UserRole.ADMIN:
        stmt = stmt.where(User.id == user.id)
    return [UserOut.build(u) for u in db.scalars(stmt)]


@router.post("/users", status_code=status.HTTP_201_CREATED)
def create_user(data: UserIn, db: Db, _: AdminUser) -> UserOut:
    user = User(
        email=data.email,
        full_name=data.full_name.strip(),
        role=data.role,
        password_hash=hash_password(data.password),
    )
    db.add(user)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(409, "This email is already used") from exc
    return UserOut.build(user)


@router.patch("/users/{user_id}")
def update_user(user_id: Id, data: UserUpdate, db: Db, admin: AdminUser) -> UserOut:
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(404, "User not found")
    if user.id == admin.id and (
        data.role not in (None, UserRole.ADMIN) or data.is_active is False or data.password
    ):
        # So there is always one working admin, and passwords need the old one.
        raise HTTPException(422, "You cannot change your own role, access or password here")
    if data.full_name is not None:
        user.full_name = data.full_name.strip()
    if data.role is not None:
        user.role = data.role
    if data.is_active is not None and data.is_active != user.is_active:
        user.is_active = data.is_active
        user.token_version += 1
    if data.password is not None:
        user.password_hash = hash_password(data.password)
        user.token_version += 1
    db.commit()
    return UserOut.build(user)


# --- Excel ----------------------------------------------------------------


def excel_reply(name: str, content: bytes) -> Response:
    stamp = datetime.now(UTC).strftime("%Y-%m-%d")
    return Response(
        content,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={
            "Content-Disposition": f'attachment; filename="greentech-{name}-{stamp}.xlsx"',
            "Cache-Control": "no-store",
        },
    )


@router.get("/export/properties")
def export_properties(db: Db, _: AdminUser) -> Response:
    rows = db.scalars(with_relations(select(Property)).order_by(Property.code))
    return excel_reply(
        "properties",
        workbook(
            "Properties",
            ["Code", "Title (English)", "Title (Arabic)", "Type", "Location", "Status"]
            + ["Rent (QAR/month)", "Rooms", "Capacity", "Area (sq.m)", "Floors", "Amenities"]
            + ["National address", "Latitude", "Longitude", "Featured", "Photos", "Published"],
            (
                [p.code, p.title_en, p.title_ar, p.type.name_en, p.location.name_en, p.status.value]
                + [p.rent_qar, p.rooms, p.capacity_persons, p.area_sqm, p.floors]
                + [", ".join(p.amenities), p.national_address, p.lat, p.lng]
                + ["Yes" if p.featured else "No", len(p.media), p.published_at]
                for p in rows
            ),
        ),
    )


@router.get("/export/enquiries")
def export_enquiries(db: Db, admin: AdminUser) -> Response:
    rows = (EnquiryRow.build(e) for e in db.scalars(enquiries_for(admin).order_by(Enquiry.id)))
    return excel_reply(
        "enquiries",
        workbook(
            "Enquiries",
            ["No.", "Date", "Name", "Company", "Phone", "Email", "Property", "Looking for"]
            + ["Area", "Space needed", "Message", "Reply on WhatsApp", "Status", "Assigned to"],
            (
                [e.id, e.created_at, e.name, e.company, e.phone, e.email, e.property_code]
                + [e.looking_for.value if e.looking_for else None, e.area, e.space_needed]
                + [e.message, "Yes" if e.reply_on_whatsapp else "No", e.status.value]
                + [e.assigned_to_name]
                for e in rows
            ),
        ),
    )
