from math import ceil
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from pydantic import BaseModel, ConfigDict, Field, field_validator
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.db import get_db
from app.models import Location, Property, PropertyType
from app.schemas.common import MAX_INT
from app.schemas.public import (
    LocationOut,
    PropertyCard,
    PropertyDetail,
    PropertyPage,
    PropertyTypeOut,
    media_url,
)
from app.services import properties as service
from app.services.share_image import cover_key, share_jpeg
from app.services.storage import Storage, get_storage

router = APIRouter(tags=["public"])
Db = Annotated[Session, Depends(get_db)]


class PropertyFilters(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    q: str | None = Field(default=None, max_length=100, description="Code, street, area or title")
    type: list[str] = Field(default=[], description="Type slug; repeat for several")
    location: list[str] = Field(default=[], description="Location slug; repeat for several")
    min_rent: int | None = Field(default=None, ge=0, le=MAX_INT)
    max_rent: int | None = Field(default=None, ge=0, le=MAX_INT)
    min_capacity: int | None = Field(default=None, ge=0, le=MAX_INT)
    min_area: float | None = Field(default=None, ge=0, allow_inf_nan=False)
    featured: bool | None = None
    sort: service.Sort = service.Sort.NEWEST
    page: int = Field(default=1, ge=1, le=10_000)
    page_size: int = Field(default=12, ge=1, le=48)

    @field_validator("q")
    @classmethod
    def no_nul(cls, value: str | None) -> str | None:
        return value.replace("\x00", "") if value else value

    def conditions(self) -> list:
        found = []
        if self.q and self.q.strip():
            found.append(service.text_match(self.q))
        if self.type:
            found.append(PropertyType.slug.in_([s.replace("\x00", "") for s in self.type]))
        if self.location:
            found.append(Location.slug.in_([s.replace("\x00", "") for s in self.location]))
        if self.min_rent is not None:
            found.append(Property.rent_qar >= self.min_rent)
        if self.max_rent is not None:
            found.append(Property.rent_qar <= self.max_rent)
        if self.min_capacity is not None:
            found.append(Property.capacity_persons >= self.min_capacity)
        if self.min_area is not None:
            found.append(Property.area_sqm >= self.min_area)
        if self.featured is not None:
            found.append(Property.featured.is_(self.featured))
        return found


@router.get("/properties")
def list_properties(filters: Annotated[PropertyFilters, Query()], db: Db) -> PropertyPage:
    rows, total = service.search(
        db,
        conditions=filters.conditions(),
        sort=filters.sort,
        page=filters.page,
        page_size=filters.page_size,
    )
    return PropertyPage(
        items=[PropertyCard.build(p) for p in rows],
        total=total,
        page=filters.page,
        page_size=filters.page_size,
        pages=ceil(total / filters.page_size),
    )


@router.get("/properties/featured")
def featured_properties(
    db: Db, limit: Annotated[int, Query(ge=1, le=12)] = 6
) -> list[PropertyCard]:
    rows, _ = service.search(
        db,
        conditions=[Property.featured.is_(True)],
        sort=service.Sort.NEWEST,
        page=1,
        page_size=limit,
    )
    return [PropertyCard.build(p) for p in rows]


@router.get("/properties/{code}/share.jpg")
def share_image(code: str, db: Db, storage: Annotated[Storage, Depends(get_storage)]) -> Response:
    prop = service.get_public(db, code) if "\x00" not in code else None
    key = cover_key(prop) if prop else None
    if key is None:
        raise HTTPException(404, "No photo")
    return Response(
        share_jpeg(storage, key),
        media_type="image/jpeg",
        headers={"Cache-Control": "public, max-age=3600"},
    )


@router.get("/properties/{code}")
def get_property(code: str, db: Db) -> PropertyDetail:
    prop = service.get_public(db, code) if "\x00" not in code else None
    if prop is None:
        raise HTTPException(404, "Property not found")
    return PropertyDetail.build(prop)


def listed_count(column):
    return select(func.count(Property.id)).where(service.is_listed(), column).scalar_subquery()


@router.get("/property-types")
def list_property_types(db: Db) -> list[PropertyTypeOut]:
    count = listed_count(Property.type_id == PropertyType.id)
    rows = db.execute(
        select(PropertyType, count)
        .where(PropertyType.is_active)
        .order_by(PropertyType.sort_order, PropertyType.id)
    )
    return [
        PropertyTypeOut(
            slug=t.slug,
            name_en=t.name_en,
            name_ar=t.name_ar,
            icon=t.icon,
            text_en=t.text_en,
            text_ar=t.text_ar,
            image_url=t.image_key and media_url(t.image_key),
            image_opacity=t.image_opacity,
            coming_soon=t.coming_soon,
            property_count=n,
        )
        for t, n in rows
    ]


def location_query():
    count = listed_count(Property.location_id == Location.id)
    return select(Location, count).where(Location.is_active)


def build_location(loc: Location, count: int) -> LocationOut:
    return LocationOut(
        slug=loc.slug,
        name_en=loc.name_en,
        name_ar=loc.name_ar,
        lat=loc.lat,
        lng=loc.lng,
        description_en=loc.description_en,
        description_ar=loc.description_ar,
        property_count=count,
    )


@router.get("/locations")
def list_locations(db: Db) -> list[LocationOut]:
    rows = db.execute(location_query().order_by(Location.sort_order, Location.id))
    return [build_location(loc, n) for loc, n in rows]


@router.get("/locations/{slug}")
def get_location(slug: str, db: Db) -> LocationOut:
    row = (
        db.execute(location_query().where(Location.slug == slug)).first()
        if "\x00" not in slug
        else None
    )
    if row is None:
        raise HTTPException(404, "Location not found")
    return build_location(*row)
