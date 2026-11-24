import logging
import secrets
import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Form, HTTPException, UploadFile, status
from fastapi.security import APIKeyHeader
from sqlalchemy import func, select, update
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.db import get_db
from app.models import MediaKind, Property, PropertyMedia
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
from app.services.storage import Storage, get_storage

logger = logging.getLogger(__name__)
api_key_header = APIKeyHeader(name="X-Admin-Key", auto_error=False)


def require_admin_key(key: Annotated[str | None, Depends(api_key_header)]) -> None:
    """Temporary until admin login (Phase 4)."""
    expected = settings.admin_api_key.get_secret_value()
    if not expected:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "ADMIN_API_KEY is not set")
    if not key or not secrets.compare_digest(key.encode(), expected.encode()):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid admin key")


router = APIRouter(prefix="/admin", tags=["admin"], dependencies=[Depends(require_admin_key)])


@router.post("/properties/{code}/media", status_code=status.HTTP_201_CREATED)
def upload_media(
    code: str,
    file: UploadFile,
    db: Annotated[Session, Depends(get_db)],
    storage: Annotated[Storage, Depends(get_storage)],
    kind: Annotated[MediaKind, Form()] = MediaKind.IMAGE,
    is_cover: Annotated[bool, Form()] = False,
) -> MediaOut:
    if "\x00" in code:
        raise HTTPException(404, "Property not found")
    prop = db.scalar(select(Property).where(Property.code == code.strip().upper()))
    if prop is None:
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

    key = f"properties/{prop.id}/{uuid.uuid4().hex}.{extension}"
    storage.save(key, body, content_type)
    try:
        media = _add_row(db, prop.id, key, kind, width, height, is_cover)
    except Exception:
        db.rollback()
        try:
            storage.delete(key)
        except Exception:
            logger.exception("Could not remove unused file %s", key)
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
    # Lock the property so two uploads at once cannot both become the cover.
    db.execute(select(Property.id).where(Property.id == property_id).with_for_update())
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
