"""Home page, chat assistant and company details: public content and its admin pages."""

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, UploadFile, status
from sqlalchemy import func, select, text
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.core.security import require_admin
from app.models import HeroImage, SiteSetting
from app.schemas.common import Id
from app.schemas.public import media_url
from app.schemas.site import (
    ChatContent,
    CompanyContent,
    HeroImageOut,
    HeroOrder,
    HomeContent,
    HomeOut,
)
from app.services.media import HERO_SIDE, read_photo
from app.services.storage import Storage, delete_file, get_storage

router = APIRouter(tags=["public"])
admin = APIRouter(prefix="/admin", tags=["admin"], dependencies=[Depends(require_admin)])
Db = Annotated[Session, Depends(get_db)]
Files = Annotated[Storage, Depends(get_storage)]
KEY = "home"
MAX_IMAGES = 8


def lock(db: Session) -> None:
    """One change to the hero photos at a time."""
    db.execute(text("SELECT pg_advisory_xact_lock(hashtext('hero_images'))"))


def rows(db: Session) -> list[HeroImage]:
    return list(db.scalars(select(HeroImage).order_by(HeroImage.sort_order, HeroImage.id)))


def images(db: Session) -> list[HeroImageOut]:
    return [HeroImageOut(id=i.id, url=media_url(i.object_key)) for i in rows(db)]


@router.get("/home")
def home(db: Db) -> HomeOut:
    saved = db.get(SiteSetting, KEY)
    return HomeOut(
        content=HomeContent.model_validate(saved.value) if saved else None, images=images(db)
    )


@admin.get("/home")
def admin_home(db: Db) -> HomeOut:
    return home(db)


@admin.put("/home")
def save_home(data: HomeContent, db: Db) -> HomeContent:
    db.merge(SiteSetting(key=KEY, value=data.model_dump()))
    db.commit()
    return data


@admin.delete("/home", status_code=status.HTTP_204_NO_CONTENT)
def reset_home(db: Db) -> None:
    """Back to the standard texts. Photos stay."""
    saved = db.get(SiteSetting, KEY)
    if saved:
        db.delete(saved)
        db.commit()


@admin.post("/home/images", status_code=status.HTTP_201_CREATED)
def add_image(file: UploadFile, db: Db, storage: Files) -> list[HeroImageOut]:
    webp = read_photo(file, HERO_SIDE)
    lock(db)
    if (db.scalar(select(func.count(HeroImage.id))) or 0) >= MAX_IMAGES:
        raise HTTPException(409, f"Maximum {MAX_IMAGES} photos. Delete one first.")
    last = db.scalar(select(func.max(HeroImage.sort_order)))
    key = f"hero/{uuid.uuid4().hex}.webp"
    storage.save(key, webp.file, "image/webp")
    try:
        db.add(HeroImage(object_key=key, sort_order=0 if last is None else last + 1))
        db.commit()
    except Exception:
        db.rollback()
        delete_file(storage, key)
        raise
    return images(db)


@admin.put("/home/images/order")
def order_images(data: HeroOrder, db: Db) -> list[HeroImageOut]:
    lock(db)
    found = {i.id: i for i in rows(db)}
    if sorted(data.ids) != sorted(found):
        raise HTTPException(409, "The photos changed. Reload the page and try again.")
    for position, image_id in enumerate(data.ids):
        found[image_id].sort_order = position
    db.commit()
    return images(db)


@admin.delete("/home/images/{image_id}")
def delete_image(image_id: Id, db: Db, storage: Files) -> list[HeroImageOut]:
    image = db.get(HeroImage, image_id)
    if image is None:
        raise HTTPException(404, "Photo not found")
    key = image.object_key
    db.delete(image)
    db.commit()
    delete_file(storage, key)
    return images(db)


CHAT_KEY = "chat"


@router.get("/chat")
def chat(db: Db) -> ChatContent:
    saved = db.get(SiteSetting, CHAT_KEY)
    return ChatContent.model_validate(saved.value) if saved else ChatContent()


@admin.get("/chat")
def admin_chat(db: Db) -> ChatContent:
    return chat(db)


@admin.put("/chat")
def save_chat(data: ChatContent, db: Db) -> ChatContent:
    db.merge(SiteSetting(key=CHAT_KEY, value=data.model_dump()))
    db.commit()
    return data


COMPANY_KEY = "company"


@router.get("/company")
def company(db: Db) -> CompanyContent | None:
    """Empty until the office saves its details: the website then uses its settings file."""
    saved = db.get(SiteSetting, COMPANY_KEY)
    return CompanyContent.model_validate(saved.value) if saved else None


@admin.get("/company")
def admin_company(db: Db) -> CompanyContent | None:
    return company(db)


@admin.put("/company")
def save_company(data: CompanyContent, db: Db) -> CompanyContent:
    db.merge(SiteSetting(key=COMPANY_KEY, value=data.model_dump()))
    db.commit()
    return data
