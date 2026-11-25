"""The editable home page, menu and chat assistant."""

from typing import Annotated, Literal, Self

from pydantic import BaseModel, Field, model_validator

from app.schemas.common import CleanStr, Input

Short = Annotated[CleanStr, Field(max_length=80)]
Long = Annotated[CleanStr, Field(max_length=120)]
Title = Annotated[CleanStr, Field(min_length=1, max_length=120)]
Word = Annotated[CleanStr, Field(min_length=1, max_length=40)]
Words = Annotated[list[Word], Field(min_length=1, max_length=10)]
Intro = Annotated[CleanStr, Field(max_length=400)]
Opacity = Annotated[int, Field(ge=10, le=100)]


class MenuItem(Input):
    key: Literal["properties", "locations", "services", "how", "contact"]
    label_en: Annotated[CleanStr, Field(min_length=1, max_length=30)]
    label_ar: Annotated[CleanStr, Field(min_length=1, max_length=30)]
    show: bool = True


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
    # Empty = the website uses its standard text.
    featured_eyebrow_en: Short | None = None
    featured_eyebrow_ar: Short | None = None
    featured_title_en: Long | None = None
    featured_title_ar: Long | None = None
    map_eyebrow_en: Short | None = None
    map_eyebrow_ar: Short | None = None
    map_title_en: Long | None = None
    map_title_ar: Long | None = None
    how_eyebrow_en: Short | None = None
    how_eyebrow_ar: Short | None = None
    how_title_en: Long | None = None
    how_title_ar: Long | None = None
    step1_title_en: Short | None = None
    step1_title_ar: Short | None = None
    step1_text_en: Intro | None = None
    step1_text_ar: Intro | None = None
    step2_title_en: Short | None = None
    step2_title_ar: Short | None = None
    step2_text_en: Intro | None = None
    step2_text_ar: Intro | None = None
    step3_title_en: Short | None = None
    step3_title_ar: Short | None = None
    step3_text_en: Intro | None = None
    step3_text_ar: Intro | None = None
    soon_eyebrow_en: Short | None = None
    soon_eyebrow_ar: Short | None = None
    soon_title_en: Long | None = None
    soon_title_ar: Long | None = None
    soon_text_en: Intro | None = None
    soon_text_ar: Intro | None = None
    soon_button_en: Short | None = None
    soon_button_ar: Short | None = None
    show_ticker: bool = True
    show_categories: bool = True
    show_featured: bool = True
    show_map: bool = True
    show_how: bool = True
    show_soon: bool = True
    menu: list[MenuItem] | None = None

    @model_validator(mode="after")
    def whole_menu(self) -> Self:
        if self.menu is not None and len({item.key for item in self.menu}) != len(self.menu):
            raise ValueError("A menu item is listed twice")
        return self


class HeroImageOut(BaseModel):
    id: int
    url: str


class HomeOut(BaseModel):
    # Empty until the office saves its own texts: the website then uses its standard ones.
    content: HomeContent | None
    images: list[HeroImageOut]


class HeroOrder(Input):
    ids: list[int] = Field(max_length=100)


Question = Annotated[CleanStr, Field(max_length=200)]
Answer = Annotated[CleanStr, Field(max_length=1000)]


class ChatAnswer(Input):
    question_en: Annotated[CleanStr, Field(min_length=3, max_length=200)]
    question_ar: Question = ""
    answer_en: Annotated[CleanStr, Field(min_length=1, max_length=1000)]
    answer_ar: Answer = ""
    # Separated by commas, in both languages.
    keywords: Annotated[CleanStr, Field(max_length=300)] = ""


class ChatContent(Input):
    enabled: bool = True
    welcome_en: Annotated[CleanStr, Field(max_length=300)] = ""
    welcome_ar: Annotated[CleanStr, Field(max_length=300)] = ""
    answers: list[ChatAnswer] = Field(default=[], max_length=200)
