"""What the public API returns. Only fields safe for visitors belong here."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.core.config import settings
from app.models import MediaKind, Property, PropertyMedia, PropertyStatus


class Schema(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class TypeRef(Schema):
    slug: str
    name_en: str
    name_ar: str


class LocationRef(TypeRef):
    lat: float
    lng: float


class PropertyTypeOut(TypeRef):
    coming_soon: bool
    property_count: int


class LocationOut(LocationRef):
    description_en: str
    description_ar: str
    property_count: int


class MediaOut(BaseModel):
    id: int
    url: str
    kind: MediaKind
    width: int | None
    height: int | None
    sort_order: int
    is_cover: bool

    @classmethod
    def build(cls, media: PropertyMedia) -> "MediaOut":
        return cls(
            id=media.id,
            url=f"{settings.media_public_url.rstrip('/')}/{media.object_key}",
            kind=media.kind,
            width=media.width,
            height=media.height,
            sort_order=media.sort_order,
            is_cover=media.is_cover,
        )


class PropertyCard(BaseModel):
    code: str
    title_en: str
    title_ar: str
    type: TypeRef
    location: LocationRef
    status: PropertyStatus
    rent_qar: int | None
    rooms: int | None
    capacity_persons: int | None
    area_sqm: float | None
    floors: int | None
    amenities: list[str]
    lat: float | None
    lng: float | None
    featured: bool
    published_at: datetime
    cover_url: str | None
    photo_count: int

    @classmethod
    def build(cls, prop: Property) -> "PropertyCard":
        return cls(**card_fields(prop))


class PropertyDetail(PropertyCard):
    description_en: str
    description_ar: str
    national_address: str
    media: list[MediaOut]

    @classmethod
    def build(cls, prop: Property) -> "PropertyDetail":
        return cls(
            **card_fields(prop),
            description_en=prop.description_en,
            description_ar=prop.description_ar,
            national_address=prop.national_address,
            media=[MediaOut.build(m) for m in prop.media],
        )


class PropertyPage(BaseModel):
    items: list[PropertyCard]
    total: int
    page: int
    page_size: int
    pages: int


def card_fields(prop: Property) -> dict:
    images = [m for m in prop.media if m.kind == MediaKind.IMAGE]
    cover = next((m for m in images if m.is_cover), images[0] if images else None)
    return {
        "code": prop.code,
        "title_en": prop.title_en,
        "title_ar": prop.title_ar,
        "type": TypeRef.model_validate(prop.type),
        "location": LocationRef.model_validate(prop.location),
        "status": prop.status,
        "rent_qar": prop.rent_qar,
        "rooms": prop.rooms,
        "capacity_persons": prop.capacity_persons,
        "area_sqm": prop.area_sqm,
        "floors": prop.floors,
        "amenities": prop.amenities,
        "lat": prop.lat,
        "lng": prop.lng,
        "featured": prop.featured,
        "published_at": prop.published_at,
        "cover_url": MediaOut.build(cover).url if cover else None,
        "photo_count": len(images),
    }
