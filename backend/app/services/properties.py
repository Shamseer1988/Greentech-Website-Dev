from enum import StrEnum

from sqlalchemy import ColumnElement, Select, func, or_, select
from sqlalchemy.orm import Session, joinedload, selectinload

from app.models import Location, Property, PropertyStatus, PropertyType

# Shown in lists. Rented units keep their own page but leave the lists.
LISTED = (PropertyStatus.AVAILABLE, PropertyStatus.RESERVED)


class Sort(StrEnum):
    NEWEST = "newest"
    PRICE_ASC = "price_asc"
    PRICE_DESC = "price_desc"
    CAPACITY_DESC = "capacity_desc"


ORDER = {
    Sort.NEWEST: Property.published_at.desc(),
    Sort.PRICE_ASC: Property.rent_qar.asc().nulls_last(),
    Sort.PRICE_DESC: Property.rent_qar.desc().nulls_last(),
    Sort.CAPACITY_DESC: Property.capacity_persons.desc().nulls_last(),
}


def is_public() -> ColumnElement[bool]:
    return (Property.status != PropertyStatus.DRAFT) & (Property.published_at <= func.now())


def is_listed() -> ColumnElement[bool]:
    return is_public() & Property.status.in_(LISTED)


def with_relations(stmt: Select) -> Select:
    return stmt.options(
        joinedload(Property.type), joinedload(Property.location), selectinload(Property.media)
    )


def get_public(db: Session, code: str) -> Property | None:
    return db.scalar(
        with_relations(select(Property).where(is_public(), Property.code == code.strip().upper()))
    )


def search(
    db: Session,
    *,
    conditions: list[ColumnElement[bool]],
    sort: Sort,
    page: int,
    page_size: int,
) -> tuple[list[Property], int]:
    base = (
        select(Property).join(Property.type).join(Property.location).where(is_listed(), *conditions)
    )
    total = db.scalar(select(func.count()).select_from(base.subquery())) or 0
    rows = db.scalars(
        with_relations(base)
        .order_by(ORDER[sort], Property.id.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    return list(rows), total


def text_match(query: str) -> ColumnElement[bool]:
    """Every word must appear somewhere in the property's text."""
    columns = (
        Property.code,
        Property.title_en,
        Property.title_ar,
        Property.description_en,
        Property.description_ar,
        Property.national_address,
        Location.name_en,
        Location.name_ar,
        PropertyType.name_en,
        PropertyType.name_ar,
    )
    result: ColumnElement[bool] | None = None
    for word in query.split():
        match = or_(*(c.icontains(word, autoescape=True) for c in columns))
        result = match if result is None else result & match
    if result is None:
        raise ValueError("Empty search")
    return result
