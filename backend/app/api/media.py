import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Form, HTTPException, UploadFile, status
from sqlalchemy import func, select, update
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.security import current_user
from app.models import MediaKind, Property, PropertyMedia
from app.schemas.admin import MediaOrder
from app.schemas.common import Id
from app.schemas.public import MediaOut
from app.services.media import (
    MAX_IMAGE_BYTES,
    MAX_VIDEO_BYTES,
    PANORAMA_SIDE,
    PHOTO_SIDE,
    MediaError,
    to_webp,
    video_type,
)
from app.services.storage import Storage, delete_file, get_storage

router = APIRouter(prefix="/admin", tags=["admin"], dependencies=[Depends(current_user)])
Db = Annotated[Session, Depends(get_db)]
Files = Annotated[Storage, Depends(get_storage)]


def lock(db: Session, property_id: int) -> None:
    """One photo change at a time per property, so there is never a second cover."""
    found = db.scalar(select(Property.id).where(Property.id == property_id).with_for_update())
    if found is None:
        raise HTTPException(404, "Property not found")


def all_media(db: Session, property_id: int) -> list[PropertyMedia]:
    return list(
        db.scalars(
            select(PropertyMedia)
            .where(PropertyMedia.property_id == property_id)
            .order_by(PropertyMedia.sort_order, PropertyMedia.id)
        )
    )


def find_media(db: Session, media_id: int) -> PropertyMedia:
    media = db.get(PropertyMedia, media_id)
    if media is None:
        raise HTTPException(404, "Photo not found")
    lock(db, media.property_id)
    return media


@router.post("/properties/{property_id}/media", status_code=status.HTTP_201_CREATED)
def upload_media(
    property_id: Id,
    file: UploadFile,
    db: Db,
    storage: Files,
    kind: Annotated[MediaKind, Form()] = MediaKind.IMAGE,
    is_cover: Annotated[bool, Form()] = False,
) -> MediaOut:
    if db.get(Property, property_id) is None:
        raise HTTPException(404, "Property not found")
    if is_cover and kind != MediaKind.IMAGE:
        raise HTTPException(422, "Only a photo can be the cover")
    limit = MAX_VIDEO_BYTES if kind == MediaKind.VIDEO else MAX_IMAGE_BYTES
    if (file.size or 0) > limit:
        raise HTTPException(413, f"File is too large (maximum {limit // 1024 // 1024} MB)")

    width = height = None
    try:
        if kind == MediaKind.VIDEO:
            extension, content_type = video_type(file.file)
            body = file.file
        else:
            side = PHOTO_SIDE if kind == MediaKind.IMAGE else PANORAMA_SIDE
            webp = to_webp(file.file, side)
            body, width, height = webp.file, webp.width, webp.height
            extension, content_type = "webp", "image/webp"
    except MediaError as exc:
        raise HTTPException(422, str(exc)) from exc

    key = f"properties/{property_id}/{uuid.uuid4().hex}.{extension}"
    storage.save(key, body, content_type)
    try:
        media = _add_row(db, property_id, key, kind, width, height, is_cover)
    except Exception:
        db.rollback()
        delete_file(storage, key)
        raise
    return MediaOut.build(media)


def _add_row(
    db: Session,
    property_id: int,
    key: str,
    kind: MediaKind,
    width: int | None,
    height: int | None,
    is_cover: bool,
) -> PropertyMedia:
    lock(db, property_id)
    mine = PropertyMedia.property_id == property_id
    last = db.scalar(select(func.max(PropertyMedia.sort_order)).where(mine))
    has_cover = db.scalar(select(PropertyMedia.id).where(mine, PropertyMedia.is_cover)) is not None
    if is_cover:
        db.execute(update(PropertyMedia).where(mine).values(is_cover=False))
    media = PropertyMedia(
        property_id=property_id,
        object_key=key,
        kind=kind,
        width=width,
        height=height,
        sort_order=0 if last is None else last + 1,
        is_cover=is_cover or (kind == MediaKind.IMAGE and not has_cover),
    )
    db.add(media)
    db.commit()
    return media


@router.put("/properties/{property_id}/media/order")
def reorder(property_id: Id, data: MediaOrder, db: Db) -> list[MediaOut]:
    lock(db, property_id)
    media = {m.id: m for m in all_media(db, property_id)}
    if sorted(data.ids) != sorted(media):
        raise HTTPException(409, "The photos changed. Reload the page and try again.")
    for position, media_id in enumerate(data.ids):
        media[media_id].sort_order = position
    db.commit()
    return [MediaOut.build(media[i]) for i in data.ids]


@router.put("/media/{media_id}/cover")
def set_cover(media_id: Id, db: Db) -> list[MediaOut]:
    media = find_media(db, media_id)
    if media.kind != MediaKind.IMAGE:
        raise HTTPException(422, "Only a photo can be the cover")
    db.execute(
        update(PropertyMedia)
        .where(PropertyMedia.property_id == media.property_id)
        .values(is_cover=False)
    )
    db.execute(update(PropertyMedia).where(PropertyMedia.id == media_id).values(is_cover=True))
    db.commit()
    db.expire_all()
    return [MediaOut.build(m) for m in all_media(db, media.property_id)]


@router.delete("/media/{media_id}")
def delete_media(media_id: Id, db: Db, storage: Files) -> list[MediaOut]:
    media = find_media(db, media_id)
    property_id, key, was_cover = media.property_id, media.object_key, media.is_cover
    db.delete(media)
    db.flush()
    left = all_media(db, property_id)
    if was_cover:
        photo = next((m for m in left if m.kind == MediaKind.IMAGE), None)
        if photo:
            photo.is_cover = True
    db.commit()
    delete_file(storage, key)
    return [MediaOut.build(m) for m in left]
