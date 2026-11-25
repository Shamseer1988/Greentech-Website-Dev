from datetime import datetime
from typing import Annotated, Self

from pydantic import BaseModel, Field, model_validator

from app.models import Article
from app.schemas.common import MAX_INT, CleanStr, Input
from app.schemas.public import TypeRef, media_url

Body = Annotated[CleanStr, Field(max_length=30_000)]
Ref = Annotated[int | None, Field(ge=1, le=MAX_INT)]


class ArticleIn(Input):
    slug: str = Field(min_length=3, max_length=80, pattern=r"^[a-z0-9]+(-[a-z0-9]+)*$")
    title_en: CleanStr = Field(min_length=3, max_length=160)
    title_ar: CleanStr = Field(default="", max_length=160)
    summary_en: CleanStr = Field(default="", max_length=300)
    summary_ar: CleanStr = Field(default="", max_length=300)
    body_en: Body = ""
    body_ar: Body = ""
    location_id: Ref = None
    type_id: Ref = None
    published: bool = False

    @model_validator(mode="after")
    def has_text(self) -> Self:
        if self.published and not self.body_en:
            raise ValueError("Write the English text before publishing")
        return self


class ArticleFull(ArticleIn):
    id: int
    cover_url: str | None
    published_at: datetime | None
    updated_at: datetime

    @classmethod
    def build(cls, a: Article) -> Self:
        return cls.model_construct(
            **{name: getattr(a, name) for name in ArticleIn.model_fields},
            id=a.id,
            cover_url=a.cover_key and media_url(a.cover_key),
            published_at=a.published_at,
            updated_at=a.updated_at,
        )


class ArticleCard(BaseModel):
    slug: str
    title_en: str
    title_ar: str
    summary_en: str
    summary_ar: str
    cover_url: str | None
    published_at: datetime
    updated_at: datetime
    location: TypeRef | None
    type: TypeRef | None

    @classmethod
    def build(cls, a: Article, **more) -> Self:
        names = ("slug", "title_en", "title_ar", "summary_en", "summary_ar")
        return cls(
            **{name: getattr(a, name) for name in names},
            cover_url=a.cover_key and media_url(a.cover_key),
            published_at=a.published_at,
            updated_at=a.updated_at,
            location=TypeRef.model_validate(a.location) if a.location else None,
            type=TypeRef.model_validate(a.type) if a.type else None,
            **more,
        )


class ArticleDetail(ArticleCard):
    body_en: str
    body_ar: str
