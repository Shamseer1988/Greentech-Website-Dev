"""Viewing bookings: public slots and booking form, and the admin calendar list."""

from math import ceil
from typing import Annotated, Literal

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, Request, status
from sqlalchemy import ColumnElement, func, or_, select, true
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload

from app.core.config import settings
from app.core.db import get_db
from app.core.security import AdminUser, CurrentUser, current_user
from app.models import Property, PropertyStatus, SiteSetting, User, UserRole, Viewing, ViewingStatus
from app.schemas.common import Id
from app.schemas.viewing import (
    DaySlots,
    ViewingIn,
    ViewingOut,
    ViewingRow,
    ViewingRows,
    ViewingSettings,
    ViewingUpdate,
)
from app.services import mailer, properties, qatar, turnstile, viewings
from app.services.rate_limit import RateLimiter

router = APIRouter(tags=["public"])
admin = APIRouter(prefix="/admin", tags=["admin"], dependencies=[Depends(current_user)])
Db = Annotated[Session, Depends(get_db)]
limiter = RateLimiter(settings.enquiry_limit, settings.enquiry_window_seconds)
PAGE_SIZE = 20
TAKEN = "This time was just taken. Please choose another one."


def open_property(db: Session, code: str) -> Property:
    prop = properties.get_public(db, code) if "\x00" not in code else None
    if prop is None or prop.status == PropertyStatus.RENTED:
        raise HTTPException(404, "Property not found")
    return prop


@router.get("/viewings/slots")
def slots(code: Annotated[str, Query(max_length=20)], db: Db) -> list[DaySlots]:
    return viewings.free_slots(db, open_property(db, code).id)


@router.post("/viewings", status_code=status.HTTP_201_CREATED)
def book(data: ViewingIn, request: Request, tasks: BackgroundTasks, db: Db) -> ViewingOut:
    wait = limiter.check(request.client.host if request.client else "unknown")
    if wait:
        raise HTTPException(
            429,
            "Too many requests. Please try again later or contact us on WhatsApp.",
            headers={"Retry-After": str(wait)},
        )
    if not turnstile.is_human(data.turnstile_token):
        raise HTTPException(403, "Please complete the security check")
    prop = open_property(db, data.property_code)
    free = {day.day: day.times for day in viewings.free_slots(db, prop.id)}
    if data.time not in free.get(data.day, []):
        raise HTTPException(409, TAKEN)
    viewing = Viewing(
        **data.model_dump(exclude={"property_code", "turnstile_token"}), property_id=prop.id
    )
    db.add(viewing)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(409, TAKEN) from exc
    if settings.mail_enabled:
        db.refresh(viewing)
        _ = viewing.property
        tasks.add_task(mailer.notify_viewing, viewing)
    return ViewingOut(reference=viewing.id)


# --- admin ----------------------------------------------------------------


def visible_to(user: User) -> ColumnElement[bool]:
    """Agents see their own visits and those nobody has taken yet."""
    if user.role == UserRole.ADMIN:
        return true()
    return or_(Viewing.assigned_to_id == user.id, Viewing.assigned_to_id.is_(None))


@admin.get("/viewings")
def list_viewings(
    user: CurrentUser,
    db: Db,
    q: Annotated[str, Query(max_length=100)] = "",
    status: ViewingStatus | None = None,
    when: Literal["past", "all"] | None = None,
    page: Annotated[int, Query(ge=1, le=10_000)] = 1,
) -> ViewingRows:
    stmt = select(Viewing).where(visible_to(user))
    for word in q.replace("\x00", "").split():
        columns = (Viewing.name, Viewing.company, Viewing.phone)
        stmt = stmt.where(
            or_(
                *(c.icontains(word, autoescape=True) for c in columns),
                Viewing.property.has(Property.code.icontains(word, autoescape=True)),
            )
        )
    if status:
        stmt = stmt.where(Viewing.status == status)
    today = qatar.today()
    if when is None:
        stmt = stmt.where(Viewing.day >= today)
    elif when == "past":
        stmt = stmt.where(Viewing.day < today)
    total = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    order = (
        (Viewing.day, Viewing.time, Viewing.id)
        if when is None
        else (Viewing.day.desc(), Viewing.time.desc(), Viewing.id)
    )
    found = db.scalars(
        stmt.options(joinedload(Viewing.property), joinedload(Viewing.assigned_to))
        .order_by(*order)
        .offset((page - 1) * PAGE_SIZE)
        .limit(PAGE_SIZE)
    )
    return ViewingRows(
        items=[ViewingRow.build(v) for v in found],
        total=total,
        page=page,
        pages=ceil(total / PAGE_SIZE),
    )


def find_viewing(db: Session, user: User, viewing_id: int) -> Viewing:
    viewing = db.scalar(
        select(Viewing).where(visible_to(user), Viewing.id == viewing_id).with_for_update()
    )
    if viewing is None:
        raise HTTPException(404, "Viewing not found")
    return viewing


@admin.patch("/viewings/{viewing_id}")
def update_viewing(viewing_id: Id, data: ViewingUpdate, user: CurrentUser, db: Db) -> ViewingRow:
    viewing = find_viewing(db, user, viewing_id)
    for name in ("status", "day", "time"):
        value = getattr(data, name)
        if value is not None:
            setattr(viewing, name, value)
    if "assigned_to_id" in data.model_fields_set:
        target = data.assigned_to_id
        if user.role != UserRole.ADMIN and target not in (user.id, None):
            raise HTTPException(403, "Only an admin can assign viewings to other people")
        if target is not None:
            agent = db.get(User, target)
            if agent is None or not agent.is_active:
                raise HTTPException(422, "Choose an active user")
        viewing.assigned_to_id = target
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(409, "This property already has a visit at that time") from exc
    return ViewingRow.build(viewing)


@admin.delete("/viewings/{viewing_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_viewing(viewing_id: Id, user: AdminUser, db: Db) -> None:
    db.delete(find_viewing(db, user, viewing_id))
    db.commit()


@admin.get("/viewing-settings")
def read_settings(db: Db, _: AdminUser) -> ViewingSettings:
    return viewings.get_settings(db)


@admin.put("/viewing-settings")
def save_settings(data: ViewingSettings, db: Db, _: AdminUser) -> ViewingSettings:
    db.merge(SiteSetting(key=viewings.KEY, value=data.model_dump(mode="json")))
    db.commit()
    return data
