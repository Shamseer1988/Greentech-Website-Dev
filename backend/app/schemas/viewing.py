from datetime import date
from typing import Annotated, Literal, Self

from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator

from app.models import Viewing, ViewingStatus
from app.schemas.common import MAX_INT, CleanStr, Input, Source
from app.schemas.enquiry import normalise_phone

Time = Annotated[str, Field(pattern=r"^([01]\d|2[0-3]):[0-5]\d$")]


class ViewingSettings(Input):
    enabled: bool = True
    # 0 = Monday ... 6 = Sunday. The office is closed on Friday (4).
    days: list[Annotated[int, Field(ge=0, le=6)]] = Field(default=[0, 1, 2, 3, 5, 6], max_length=7)
    start: Time = "09:00"
    end: Time = "17:00"
    minutes: Literal[30, 60, 90, 120] = 60
    # How long before a visit it can still be booked, and how far ahead.
    lead_hours: int = Field(default=4, ge=0, le=168)
    days_ahead: int = Field(default=21, ge=1, le=60)
    closed: list[date] = Field(default=[], max_length=100)

    @model_validator(mode="after")
    def hours(self) -> Self:
        if self.start >= self.end:
            raise ValueError("The end must be after the start")
        return self


class DaySlots(BaseModel):
    day: date
    times: list[str]


class ViewingIn(Input):
    property_code: str = Field(max_length=20)
    day: date
    time: Time
    name: CleanStr = Field(min_length=2, max_length=120)
    company: CleanStr = Field(default="", max_length=160)
    phone: str = Field(max_length=40)
    email: EmailStr | None = Field(default=None, max_length=254)
    people: int | None = Field(default=None, ge=1, le=100)
    note: CleanStr = Field(default="", max_length=1000)
    language: Literal["en", "ar"] = "en"
    source: Source = ""
    turnstile_token: str = Field(default="", max_length=2048)

    @field_validator("email", "people", mode="before")
    @classmethod
    def empty_is_none(cls, value: object) -> object:
        return None if isinstance(value, str) and not value.strip() else value

    @field_validator("phone")
    @classmethod
    def phone_number(cls, value: str) -> str:
        return normalise_phone(value)


class ViewingOut(BaseModel):
    reference: int


class ViewingUpdate(Input):
    status: ViewingStatus | None = None
    day: date | None = None
    time: Time | None = None
    assigned_to_id: int | None = Field(default=None, ge=1, le=MAX_INT)


class ViewingRow(BaseModel):
    id: int
    day: date
    time: str
    name: str
    company: str
    phone: str
    email: str | None
    people: int | None
    note: str
    language: str
    source: str
    status: ViewingStatus
    property_id: int | None
    property_code: str | None
    property_title: str | None
    assigned_to_id: int | None
    assigned_to_name: str | None

    @classmethod
    def build(cls, v: Viewing) -> Self:
        others = ("property_code", "property_title", "assigned_to_name")
        return cls(
            **{name: getattr(v, name) for name in cls.model_fields if name not in others},
            property_code=v.property.code if v.property else None,
            property_title=v.property.title_en if v.property else None,
            assigned_to_name=v.assigned_to.full_name if v.assigned_to else None,
        )


class ViewingRows(BaseModel):
    items: list[ViewingRow]
    total: int
    page: int
    pages: int
