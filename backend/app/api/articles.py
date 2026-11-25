"""Blog articles and area guides."""

import uuid
from datetime import UTC, datetime
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload

from app.core.db import get_db
from app.core.security import require_admin
from app.models import Article, Location, PropertyType
from app.schemas.article import ArticleCard, ArticleDetail, ArticleFull, ArticleIn
from app.schemas.common import Id
from app.services.media import PHOTO_SIDE, read_photo
from app.services.storage import Storage, delete_file, get_storage

router = APIRouter(tags=["public"])
admin = APIRouter(prefix="/admin/articles", tags=["admin"], dependencies=[Depends(require_admin)])
Db = Annotated[Session, Depends(get_db)]
Files = Annotated[Storage, Depends(get_storage)]


def public():
    return (
        select(Article)
        .where(Article.published, Article.published_at <= datetime.now(UTC))
        .options(joinedload(Article.location), joinedload(Article.type))
    )


@router.get("/articles")
def list_articles(db: Db) -> list[ArticleCard]:
    rows = db.scalars(public().order_by(Article.published_at.desc()).limit(500))
    return [ArticleCard.build(a) for a in rows]


@router.get("/articles/{slug}")
def get_article(slug: str, db: Db) -> ArticleDetail:
    article = db.scalar(public().where(Article.slug == slug)) if "\x00" not in slug else None
    if article is None:
        raise HTTPException(404, "Article not found")
    return ArticleDetail.build(article, body_en=article.body_en, body_ar=article.body_ar)


# --- admin ----------------------------------------------------------------


def find(db: Session, article_id: int) -> Article:
    article = db.scalar(select(Article).where(Article.id == article_id).with_for_update())
    if article is None:
        raise HTTPException(404, "Article not found")
    return article


def save(db: Session, article: Article, data: ArticleIn) -> ArticleFull:
    if data.location_id and db.get(Location, data.location_id) is None:
        raise HTTPException(422, "Choose an existing location")
    if data.type_id and db.get(PropertyType, data.type_id) is None:
        raise HTTPException(422, "Choose an existing category")
    for name, value in data.model_dump().items():
        setattr(article, name, value)
    if article.published and article.published_at is None:
        article.published_at = datetime.now(UTC)
    db.add(article)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(409, f"The web name “{data.slug}” is already used") from exc
    db.refresh(article)
    return ArticleFull.build(article)


@admin.get("")
def admin_articles(db: Db) -> list[ArticleFull]:
    return [ArticleFull.build(a) for a in db.scalars(select(Article).order_by(Article.id.desc()))]


@admin.get("/{article_id}")
def admin_article(article_id: Id, db: Db) -> ArticleFull:
    return ArticleFull.build(find(db, article_id))


@admin.post("", status_code=status.HTTP_201_CREATED)
def create_article(data: ArticleIn, db: Db) -> ArticleFull:
    return save(db, Article(), data)


@admin.put("/{article_id}")
def update_article(article_id: Id, data: ArticleIn, db: Db) -> ArticleFull:
    return save(db, find(db, article_id), data)


@admin.delete("/{article_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_article(article_id: Id, db: Db, storage: Files) -> None:
    article = find(db, article_id)
    key = article.cover_key
    db.delete(article)
    db.commit()
    if key:
        delete_file(storage, key)


@admin.post("/{article_id}/cover", status_code=status.HTTP_201_CREATED)
def upload_cover(article_id: Id, file: UploadFile, db: Db, storage: Files) -> ArticleFull:
    webp = read_photo(file, PHOTO_SIDE)
    article = find(db, article_id)
    old, key = article.cover_key, f"articles/{uuid.uuid4().hex}.webp"
    storage.save(key, webp.file, "image/webp")
    try:
        article.cover_key = key
        db.commit()
    except Exception:
        db.rollback()
        delete_file(storage, key)
        raise
    if old:
        delete_file(storage, old)
    db.refresh(article)
    return ArticleFull.build(article)


@admin.delete("/{article_id}/cover")
def delete_cover(article_id: Id, db: Db, storage: Files) -> ArticleFull:
    article = find(db, article_id)
    old, article.cover_key = article.cover_key, None
    db.commit()
    if old:
        delete_file(storage, old)
    db.refresh(article)
    return ArticleFull.build(article)
