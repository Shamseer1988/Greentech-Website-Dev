import logging
from datetime import UTC, datetime
from math import ceil
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.security import AdminUser, current_user
from app.models import Enquiry, Location, Property, PropertyStatus, PropertyType
from app.schemas.admin import (
    PropertyFull,
    PropertyIn,
    PropertyQuickEdit,
    PropertyRow,
    PropertyRows,
)
from app.schemas.common import Id
from app.services.properties import text_match, with_relations
from app.services.storage import Storage, get_storage

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/admin", tags=["admin"], dependencies=[Depends(current_user)])
Db = Annotated[Session, Depends(get_db)]
PAGE_SIZE = 20


def find(db: Session, property_id: int) -> Property:
    prop = db.scalar(with_relations(select(Property).where(Property.id == property_id)))
    if prop is None:
        raise HTTPException(404, "Property not found")
    return prop


def rows_query():
    enquiries = (
        select(func.count(Enquiry.id))
        .where(Enquiry.property_id == Property.id)
        .correlate(Property)
        .scalar_subquery()
    )
    return with_relations(select(Property, enquiries).join(Property.type).join(Property.location))


@router.get("/properties")
def list_properties(
    db: Db,
    q: Annotated[str, Query(max_length=100)] = "",
    status: PropertyStatus | None = None,
    page: Annotated[int, Query(ge=1, le=10_000)] = 1,
) -> PropertyRows:
    stmt = rows_query()
    q = q.replace("\x00", "").strip()
    if q:
        stmt = stmt.where(text_match(q))
    if status:
        stmt = stmt.where(Property.status == status)
    total = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    rows = db.execute(
        stmt.order_by(Property.id.desc()).offset((page - 1) * PAGE_SIZE).limit(PAGE_SIZE)
    )
    return PropertyRows(
        items=[PropertyRow.build(prop, count) for prop, count in rows],
        total=total,
        page=page,
        pages=ceil(total / PAGE_SIZE),
    )


@router.get("/properties/{property_id}")
def get_property(property_id: Id, db: Db) -> PropertyFull:
    return PropertyFull.build(find(db, property_id))


def publish(prop: Property) -> None:
    """The first time it leaves draft, it becomes public now."""
    if prop.status != PropertyStatus.DRAFT and prop.published_at is None:
        prop.published_at = datetime.now(UTC)


def save(db: Session, prop: Property, data: PropertyIn) -> PropertyFull:
    if db.get(PropertyType, data.type_id) is None:
        raise HTTPException(422, "Choose a property type")
    if db.get(Location, data.location_id) is None:
        raise HTTPException(422, "Choose a location")
    for name, value in data.model_dump().items():
        setattr(prop, name, value)
    publish(prop)
    db.add(prop)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        if "uq_properties_code" in str(exc.orig):
            raise HTTPException(409, f"Code {data.code} is already used") from exc
        raise
    db.expire_all()
    return PropertyFull.build(find(db, prop.id))


@router.post("/properties", status_code=status.HTTP_201_CREATED)
def create_property(data: PropertyIn, db: Db) -> PropertyFull:
    return save(db, Property(), data)


@router.put("/properties/{property_id}")
def update_property(property_id: Id, data: PropertyIn, db: Db) -> PropertyFull:
    return save(db, find(db, property_id), data)


@router.patch("/properties/{property_id}")
def quick_edit(property_id: Id, data: PropertyQuickEdit, db: Db) -> PropertyFull:
    prop = find(db, property_id)
    if data.status is not None:
        prop.status = data.status
        publish(prop)
    if data.featured is not None:
        prop.featured = data.featured
    db.commit()
    return PropertyFull.build(find(db, property_id))


@router.delete("/properties/{property_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_property(
    property_id: Id,
    db: Db,
    _: AdminUser,
    storage: Annotated[Storage, Depends(get_storage)],
) -> None:
    prop = find(db, property_id)
    keys = [m.object_key for m in prop.media]
    db.delete(prop)
    db.commit()
    for key in keys:
        try:
            storage.delete(key)
        except Exception:
            logger.exception("Could not remove file %s", key)
