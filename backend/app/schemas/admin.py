from datetime import datetime
from typing import Annotated, Self

from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator

from app.models import (
    Enquiry,
    EnquiryStatus,
    LookingFor,
    Property,
    PropertyStatus,
    User,
    UserRole,
)
from app.schemas.common import MAX_INT, CleanStr, Input
from app.schemas.public import LocationRef, MediaOut, TypeRef, card_fields

Positive = Annotated[int, Field(ge=0, le=MAX_INT)]
Lat = Annotated[float, Field(ge=-90, le=90)]
Lng = Annotated[float, Field(ge=-180, le=180)]
Password = Annotated[str, Field(min_length=10, max_length=128)]

# --- login and users ------------------------------------------------------


class LoginIn(BaseModel):
    email: str = Field(max_length=254)
    password: str = Field(max_length=128)


class UserOut(BaseModel):
    id: int
    email: str
    full_name: str
    role: UserRole
    is_active: bool

    @classmethod
    def build(cls, user: User) -> Self:
        return cls(
            id=user.id,
            email=user.email,
            full_name=user.full_name,
            role=user.role,
            is_active=user.is_active,
        )


class LoginOut(BaseModel):
    token: str
    expires_in: int
    user: UserOut


class PasswordIn(BaseModel):
    current_password: str = Field(max_length=128)
    new_password: Password


class UserIn(BaseModel):
    email: EmailStr = Field(max_length=254)
    full_name: CleanStr = Field(min_length=2, max_length=120)
    password: Password
    role: UserRole = UserRole.AGENT

    @field_validator("email")
    @classmethod
    def lower(cls, value: str) -> str:
        return value.lower()


class UserUpdate(BaseModel):
    """Fields left out (or null) stay as they are."""

    full_name: CleanStr | None = Field(default=None, min_length=2, max_length=120)
    password: Password | None = None
    role: UserRole | None = None
    is_active: bool | None = None


# --- properties -----------------------------------------------------------


class PropertyIn(Input):
    code: str = Field(min_length=2, max_length=20)
    title_en: CleanStr = Field(min_length=2, max_length=160)
    title_ar: CleanStr = Field(default="", max_length=160)
    description_en: CleanStr = Field(default="", max_length=10_000)
    description_ar: CleanStr = Field(default="", max_length=10_000)
    type_id: int = Field(ge=1, le=MAX_INT)
    location_id: int = Field(ge=1, le=MAX_INT)
    status: PropertyStatus = PropertyStatus.DRAFT
    rent_qar: Positive | None = None
    rooms: Positive | None = None
    capacity_persons: Positive | None = None
    area_sqm: float | None = Field(default=None, ge=0, le=MAX_INT)
    floors: Positive | None = None
    amenities: list[Annotated[CleanStr, Field(min_length=1, max_length=80)]] = Field(
        default=[], max_length=40
    )
    lat: Lat | None = None
    lng: Lng | None = None
    national_address: CleanStr = Field(default="", max_length=200)
    featured: bool = False

    @field_validator("code", mode="after")
    @classmethod
    def code_format(cls, value: str) -> str:
        value = value.upper()
        if not value.isascii() or not value.replace("-", "").isalnum():
            raise ValueError("Use only letters, numbers and -")
        if value == "FEATURED":
            raise ValueError("This word is reserved")
        return value

    @field_validator("amenities", mode="after")
    @classmethod
    def no_repeats(cls, value: list[str]) -> list[str]:
        return list(dict.fromkeys(value))

    @model_validator(mode="after")
    def both_coordinates(self) -> Self:
        if (self.lat is None) != (self.lng is None):
            raise ValueError("Enter both latitude and longitude, or neither")
        return self


class PropertyQuickEdit(Input):
    status: PropertyStatus | None = None
    featured: bool | None = None


class PropertyRow(BaseModel):
    id: int
    code: str
    title_en: str
    title_ar: str
    type: TypeRef
    location: LocationRef
    status: PropertyStatus
    rent_qar: int | None
    featured: bool
    cover_url: str | None
    photo_count: int
    enquiry_count: int

    @classmethod
    def build(cls, prop: Property, enquiry_count: int) -> Self:
        fields = card_fields(prop)
        return cls(
            id=prop.id,
            enquiry_count=enquiry_count,
            **{k: fields[k] for k in cls.model_fields if k in fields},
        )


class PropertyRows(BaseModel):
    items: list[PropertyRow]
    total: int
    page: int
    pages: int


class PropertyFull(PropertyIn):
    id: int
    published_at: datetime | None
    updated_at: datetime
    media: list[MediaOut]

    @classmethod
    def build(cls, prop: Property) -> Self:
        own = {name: getattr(prop, name) for name in PropertyIn.model_fields}
        # Saved data is shown as it is, even if an input rule changed later.
        return cls.model_construct(
            **own,
            id=prop.id,
            published_at=prop.published_at,
            updated_at=prop.updated_at,
            media=[MediaOut.build(m) for m in prop.media],
        )


class MediaOrder(BaseModel):
    ids: list[int] = Field(max_length=500)


# --- locations ------------------------------------------------------------


class LocationIn(Input):
    slug: str = Field(min_length=2, max_length=60, pattern=r"^[a-z0-9]+(-[a-z0-9]+)*$")
    name_en: CleanStr = Field(min_length=2, max_length=80)
    name_ar: CleanStr = Field(min_length=2, max_length=80)
    lat: Lat
    lng: Lng
    description_en: CleanStr = Field(default="", max_length=2000)
    description_ar: CleanStr = Field(default="", max_length=2000)
    sort_order: int = Field(default=0, ge=0, le=10_000)
    is_active: bool = True


class LocationFull(LocationIn):
    id: int
    property_count: int


class TypeFull(TypeRef):
    id: int


# --- enquiries ------------------------------------------------------------


class EnquiryUpdate(Input):
    status: EnquiryStatus | None = None
    # Sent as null = remove the agent; left out = no change.
    assigned_to_id: int | None = Field(default=None, ge=1, le=MAX_INT)


class EnquiryRow(BaseModel):
    id: int
    created_at: datetime
    name: str
    company: str
    phone: str
    email: str | None
    looking_for: LookingFor | None
    area: str
    space_needed: str
    message: str
    reply_on_whatsapp: bool
    status: EnquiryStatus
    property_id: int | None
    property_code: str | None
    assigned_to_id: int | None
    assigned_to_name: str | None

    @classmethod
    def build(cls, e: Enquiry) -> Self:
        own = {
            name: getattr(e, name)
            for name in cls.model_fields
            if name not in ("property_code", "assigned_to_name")
        }
        return cls(
            **own,
            property_code=e.property.code if e.property else None,
            assigned_to_name=e.assigned_to.full_name if e.assigned_to else None,
        )


class EnquiryRows(BaseModel):
    items: list[EnquiryRow]
    total: int
    page: int
    pages: int


class Stats(BaseModel):
    total: int
    available: int
    new_enquiries_7_days: int
    open_enquiries: int
