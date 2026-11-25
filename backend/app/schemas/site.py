"""The editable home page."""

from typing import Annotated

from pydantic import BaseModel, Field

from app.schemas.common import CleanStr, Input

Short = Annotated[CleanStr, Field(max_length=80)]
Title = Annotated[CleanStr, Field(min_length=1, max_length=120)]
Word = Annotated[CleanStr, Field(min_length=1, max_length=40)]
Words = Annotated[list[Word], Field(min_length=1, max_length=10)]
Intro = Annotated[CleanStr, Field(max_length=400)]
Opacity = Annotated[int, Field(ge=10, le=100)]


class HomeContent(Input):
    badge_en: Short = ""
    badge_ar: Short = ""
    start_en: Short = ""
    start_ar: Short = ""
    words_en: Words
    words_ar: Words
    end_en: Short = ""
    end_ar: Short = ""
    intro_en: Intro = ""
    intro_ar: Intro = ""
    chip_label_en: Short = ""
    chip_label_ar: Short = ""
    chip_text_en: Short = ""
    chip_text_ar: Short = ""
    categories_eyebrow_en: Short = ""
    categories_eyebrow_ar: Short = ""
    categories_title_en: Title
    categories_title_ar: Title
    image_opacity: Opacity = 40
    show_search: bool = True
    show_whatsapp: bool = True
    show_scene: bool = True
    show_property: bool = True


class HeroImageOut(BaseModel):
    id: int
    url: str


class HomeOut(BaseModel):
    # Empty until the office saves its own texts: the website then uses its standard ones.
    content: HomeContent | None
    images: list[HeroImageOut]


class HeroOrder(Input):
    ids: list[int] = Field(max_length=100)
