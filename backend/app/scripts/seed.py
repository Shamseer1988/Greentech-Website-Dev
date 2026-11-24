"""Fill the database with starting data. Safe to run again: existing rows are not changed.

Run:  python -m app.scripts.seed
"""

from datetime import UTC, datetime, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.db import SessionLocal
from app.models import Location, Property, PropertyStatus, PropertyType

TYPES = [
    ("labour-accommodation", "Labour Accommodation", "سكن عمال", False),
    ("warehouse", "Warehouse", "مستودع", False),
    ("cafeteria", "Cafeteria", "كافتيريا", False),
    ("supermarket-shop", "Supermarket / Shop", "سوبرماركت / محل", False),
    ("residential", "Residential", "سكني", True),
]

# Area centre points are approximate. Check them before going live.
LOCATIONS = [
    (
        "industrial-area",
        "Industrial Area",
        "المنطقة الصناعية",
        25.19,
        51.43,
        "Accommodation, warehouses and shops near the camps.",
        "سكن عمال ومستودعات ومحلات بالقرب من المجمعات السكنية.",
    ),
    (
        "umm-silal",
        "Umm Silal",
        "أم صلال",
        25.41,
        51.40,
        "Warehouses and accommodation close to Doha.",
        "مستودعات وسكن بالقرب من الدوحة.",
    ),
    (
        "al-khor",
        "Al Khor",
        "الخور",
        25.68,
        51.50,
        "Cafeterias and staff accommodation in the north.",
        "كافتيريات وسكن موظفين في الشمال.",
    ),
    (
        "abu-nakhla",
        "Abu Nakhla",
        "أبو نخلة",
        25.17,
        51.37,
        "Staff camps and open yards.",
        "مجمعات سكن عمال وساحات مفتوحة.",
    ),
]

CAMP_AMENITIES = [
    "Central / split A/C",
    "Common kitchen",
    "Washrooms per floor",
    "Laundry area",
    "CCTV & security",
    "Bus parking",
]

# Placeholder numbers, for testing filters and layout only.
SAMPLES = [
    {
        "code": "GT-LA-101",
        "type": "labour-accommodation",
        "location": "industrial-area",
        "title_en": "Labour accommodation block",
        "title_ar": "مبنى سكن عمال",
        "rent_qar": 50000,
        "rooms": 50,
        "capacity_persons": 200,
        "floors": 3,
        "area_sqm": 1500,
        "amenities": CAMP_AMENITIES,
        "featured": True,
    },
    {
        "code": "GT-WH-204",
        "type": "warehouse",
        "location": "umm-silal",
        "title_en": "Warehouse with office",
        "title_ar": "مستودع مع مكتب",
        "rent_qar": 30000,
        "area_sqm": 1000,
        "amenities": ["Loading bay", "Office"],
        "featured": True,
    },
    {
        "code": "GT-CF-310",
        "type": "cafeteria",
        "location": "al-khor",
        "title_en": "Cafeteria unit",
        "title_ar": "وحدة كافتيريا",
        "rent_qar": 10000,
        "area_sqm": 100,
        "amenities": ["Kitchen fitted"],
        "featured": True,
    },
    {
        "code": "GT-SM-412",
        "type": "supermarket-shop",
        "location": "industrial-area",
        "title_en": "Supermarket space",
        "title_ar": "مساحة سوبرماركت",
        "rent_qar": 20000,
        "area_sqm": 400,
        "amenities": ["Near camps"],
    },
    {
        "code": "GT-LA-118",
        "type": "labour-accommodation",
        "location": "abu-nakhla",
        "title_en": "Staff camp with kitchen",
        "title_ar": "سكن موظفين مع مطبخ",
        "rent_qar": 40000,
        "rooms": 40,
        "capacity_persons": 160,
        "floors": 2,
        "area_sqm": 1200,
        "amenities": CAMP_AMENITIES,
    },
    {
        "code": "GT-WH-221",
        "type": "warehouse",
        "location": "industrial-area",
        "title_en": "Open yard + store",
        "title_ar": "ساحة مفتوحة مع مخزن",
        "rent_qar": None,
        "area_sqm": 2000,
        "amenities": ["Open yard"],
    },
]


def seed(db: Session, *, samples: bool) -> dict[str, int]:
    added = {"property types": 0, "locations": 0, "sample properties": 0}

    types = {t.slug: t for t in db.scalars(select(PropertyType))}
    for order, (slug, en, ar, soon) in enumerate(TYPES):
        if slug not in types:
            types[slug] = PropertyType(
                slug=slug, name_en=en, name_ar=ar, coming_soon=soon, sort_order=order
            )
            db.add(types[slug])
            added["property types"] += 1

    locations = {loc.slug: loc for loc in db.scalars(select(Location))}
    for order, (slug, en, ar, lat, lng, desc_en, desc_ar) in enumerate(LOCATIONS):
        if slug not in locations:
            locations[slug] = Location(
                slug=slug,
                name_en=en,
                name_ar=ar,
                lat=lat,
                lng=lng,
                description_en=desc_en,
                description_ar=desc_ar,
                sort_order=order,
            )
            db.add(locations[slug])
            added["locations"] += 1

    if samples:
        codes = set(db.scalars(select(Property.code)))
        now = datetime.now(UTC)
        for number, sample in enumerate(SAMPLES):
            if sample["code"] in codes:
                continue
            data = dict(sample)
            kind = types[data.pop("type")]
            place = locations[data.pop("location")]
            db.add(
                Property(
                    **data,
                    type=kind,
                    location=place,
                    description_en="[Sample listing – placeholder details]",
                    description_ar="[إعلان تجريبي – بيانات مؤقتة]",
                    national_address="Zone [NO] · Street [NO] · Building [NO]",
                    lat=place.lat + number * 0.002,
                    lng=place.lng + number * 0.002,
                    status=PropertyStatus.AVAILABLE,
                    published_at=now - timedelta(days=number + 1),
                )
            )
            added["sample properties"] += 1
    db.commit()
    return added


if __name__ == "__main__":
    with SessionLocal() as session:
        # Sample listings must never reach the live site.
        result = seed(session, samples=settings.app_env == "development")
    for name, count in result.items():
        print(f"{name}: {count} added")
