"""Categories (property types): texts, order, and the photo on the home page card."""

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, UploadFile, status
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.security import AdminUser, current_user
from app.models import Property, PropertyType
from app.schemas.admin import TypeFull, TypeIn, TypeOrder
from app.schemas.common import Id
from app.services.media import CARD_SIDE, read_photo
from app.services.storage import Storage, delete_file, get_storage

router = APIRouter(
    prefix="/admin/property-types", tags=["admin"], dependencies=[Depends(current_user)]
)
Db = Annotated[Session, Depends(get_db)]
Files = Annotated[Storage, Depends(get_storage)]


def type_rows(db: Session, *where) -> list[TypeFull]:
    count = (
        select(func.count(Property.id)).where(Property.type_id == PropertyType.id).scalar_subquery()
    )
    found = db.execute(
        select(PropertyType, count).where(*where).order_by(PropertyType.sort_order, PropertyType.id)
    )
    return [TypeFull.build(kind, n) for kind, n in found]


def one(db: Session, kind: PropertyType) -> TypeFull:
    return type_rows(db, PropertyType.id == kind.id)[0]


def find_type(db: Session, type_id: int) -> PropertyType:
    kind = db.scalar(select(PropertyType).where(PropertyType.id == type_id).with_for_update())
    if kind is None:
        raise HTTPException(404, "Category not found")
    return kind


def save_type(db: Session, kind: PropertyType, data: TypeIn) -> TypeFull:
    for name, value in data.model_dump().items():
        setattr(kind, name, value)
    db.add(kind)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(409, f"The web name “{data.slug}” is already used") from exc
    return one(db, kind)


@router.get("")
def list_types(db: Db) -> list[TypeFull]:
    return type_rows(db)


@router.post("", status_code=status.HTTP_201_CREATED)
def create_type(data: TypeIn, db: Db, _: AdminUser) -> TypeFull:
    last = db.scalar(select(func.max(PropertyType.sort_order)))
    return save_type(db, PropertyType(sort_order=0 if last is None else last + 1), data)


@router.put("/order")
def reorder_types(data: TypeOrder, db: Db, _: AdminUser) -> list[TypeFull]:
    found = {t.id: t for t in db.scalars(select(PropertyType).with_for_update())}
    if sorted(data.ids) != sorted(found):
        raise HTTPException(409, "The categories changed. Reload the page and try again.")
    for position, type_id in enumerate(data.ids):
        found[type_id].sort_order = position
    db.commit()
    return type_rows(db)


@router.put("/{type_id}")
def update_type(type_id: Id, data: TypeIn, db: Db, _: AdminUser) -> TypeFull:
    return save_type(db, find_type(db, type_id), data)


@router.delete("/{type_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_type(type_id: Id, db: Db, storage: Files, _: AdminUser) -> None:
    kind = find_type(db, type_id)
    key = kind.image_key
    db.delete(kind)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            409, "This category has properties. Hide it, or move the properties first."
        ) from exc
    if key:
        delete_file(storage, key)


@router.post("/{type_id}/image", status_code=status.HTTP_201_CREATED)
def upload_type_image(
    type_id: Id, file: UploadFile, db: Db, storage: Files, _: AdminUser
) -> TypeFull:
    webp = read_photo(file, CARD_SIDE)
    kind = find_type(db, type_id)
    old, key = kind.image_key, f"types/{type_id}/{uuid.uuid4().hex}.webp"
    storage.save(key, webp.file, "image/webp")
    try:
        kind.image_key = key
        db.commit()
    except Exception:
        db.rollback()
        delete_file(storage, key)
        raise
    if old:
        delete_file(storage, old)
    return one(db, kind)


@router.delete("/{type_id}/image")
def delete_type_image(type_id: Id, db: Db, storage: Files, _: AdminUser) -> TypeFull:
    kind = find_type(db, type_id)
    old, kind.image_key = kind.image_key, None
    db.commit()
    if old:
        delete_file(storage, old)
    return one(db, kind)
