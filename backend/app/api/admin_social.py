from typing import Annotated
from urllib.parse import urlsplit

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.db import get_db
from app.core.security import AdminUser, require_admin
from app.models import Property, SocialPost
from app.schemas.admin import SocialIn, SocialPostOut, SocialState
from app.schemas.common import Id
from app.services import social
from app.services.properties import is_public
from app.services.share_image import cover_key

router = APIRouter(prefix="/admin", tags=["admin"], dependencies=[Depends(require_admin)])
Db = Annotated[Session, Depends(get_db)]


def is_online() -> bool:
    """Facebook must be able to open the photo, so the site must be public."""
    url = urlsplit(settings.site_url)
    return url.scheme == "https" and url.hostname not in (None, "localhost", "127.0.0.1")


def history(db: Session, property_id: int) -> list[SocialPostOut]:
    rows = db.scalars(
        select(SocialPost)
        .where(SocialPost.property_id == property_id)
        .order_by(SocialPost.id.desc())
    )
    return [SocialPostOut.build(row) for row in rows]


@router.get("/properties/{property_id}/social")
def social_state(property_id: Id, db: Db) -> SocialState:
    if db.get(Property, property_id) is None:
        raise HTTPException(404, "Property not found")
    return SocialState(
        networks=social.networks(),
        online=is_online(),
        site_url=settings.site_url.rstrip("/"),
        posts=history(db, property_id),
    )


@router.post("/properties/{property_id}/social", status_code=201)
def post_property(property_id: Id, data: SocialIn, db: Db, user: AdminUser) -> list[SocialPostOut]:
    if data.network not in social.networks():
        raise HTTPException(409, f"{data.network.value.title()} is not set up")
    if not is_online():
        raise HTTPException(409, "Posting works only when the website is online (SITE_URL)")
    # Locked, so a double click cannot post twice.
    prop = db.scalar(
        select(Property).where(Property.id == property_id, is_public()).with_for_update()
    )
    if prop is None:
        raise HTTPException(409, "Publish the property first")
    if cover_key(prop) is None:
        raise HTTPException(409, "Add a photo first")
    posted = db.scalar(
        select(SocialPost.id)
        .where(SocialPost.property_id == property_id, SocialPost.network == data.network)
        .limit(1)
    )
    if posted and not data.again:
        raise HTTPException(409, "Already posted. Tick “Post again” to repeat.")
    image = f"{settings.site_url.rstrip('/')}/share/{prop.code}.jpg"
    try:
        post_id = social.post(data.network, image, data.text)
    except social.SocialError as exc:
        raise HTTPException(502, str(exc)) from exc
    db.add(
        SocialPost(property_id=property_id, network=data.network, post_id=post_id, user_id=user.id)
    )
    db.commit()
    return history(db, property_id)
