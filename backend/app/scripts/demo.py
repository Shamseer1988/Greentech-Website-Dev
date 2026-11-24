"""Fill a development database with demo listings, photos, videos and enquiries.

Run:     python -m app.scripts.demo            (safe to run again)
Remove:  python -m app.scripts.demo --remove

The photos come from the demo-media folder. Their sources are in docs/DEMO_MEDIA.md.
Listings whose description no longer starts with the demo mark are yours: they are left alone.
"""

import sys
import uuid
from datetime import UTC, datetime, timedelta
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import ROOT_DIR, settings
from app.core.db import SessionLocal
from app.models import (
    Enquiry,
    EnquiryStatus,
    Location,
    LookingFor,
    MediaKind,
    Property,
    PropertyMedia,
    PropertyStatus,
    PropertyType,
)
from app.scripts.seed import CAMP_AMENITIES, seed
from app.services.media import PHOTO_SIDE, to_webp, video_type
from app.services.storage import Storage, get_storage

MEDIA_DIR = ROOT_DIR / "demo-media"
VIDEO_SUFFIXES = (".mp4", ".webm")
OLD_MARK = "[Sample listing"  # written by seed.py
MARK_EN = "[Demo listing]"
MARK_AR = "[إعلان تجريبي]"
NOTE_EN = "Photos, price and address are examples only."
NOTE_AR = "الصور والسعر والعنوان أمثلة فقط."
# Not a real phone range, so a test reply never reaches anyone.
FAKE_PHONE = "+9740000000"

CAMP_EN = (
    "Clean worker accommodation with air-conditioned rooms, a shared kitchen and dining hall, "
    "washrooms on every floor and a laundry area. Close to main roads, with space for buses."
)
CAMP_AR = (
    "سكن عمال نظيف بغرف مكيفة ومطبخ وصالة طعام مشتركة ودورات مياه في كل طابق ومنطقة غسيل. "
    "قريب من الطرق الرئيسية مع مساحة لوقوف الحافلات."
)
STORE_EN = "Storage space with high ceiling, wide truck access and a small office area."
STORE_AR = "مساحة تخزين بسقف مرتفع ومدخل واسع للشاحنات ومكتب صغير."
CAFE_EN = "Cafeteria space with a serving counter, kitchen area and seating, near worker housing."
CAFE_AR = "مساحة كافتيريا مع كاونتر تقديم ومطبخ وجلسات، بالقرب من سكن العمال."
SHOP_EN = "Retail space for a supermarket or shop, with a wide front and good customer parking."
SHOP_AR = "مساحة تجارية لسوبرماركت أو محل، بواجهة واسعة ومواقف جيدة للزبائن."

TEXT = {
    "labour-accommodation": (CAMP_EN, CAMP_AR),
    "warehouse": (STORE_EN, STORE_AR),
    "cafeteria": (CAFE_EN, CAFE_AR),
    "supermarket-shop": (SHOP_EN, SHOP_AR),
}

# code: files in demo-media. The first photo is the cover.
MEDIA = {
    "GT-LA-101": "a115 a151 b167 b134 a464 tour-camp",
    "GT-LA-118": "a574 a145 a214 b219 b134",
    "GT-LA-125": "a228 b7 b11 a211 b167",
    "GT-LA-132": "a131 a145 a471 a522",
    "GT-LA-140": "a120 b11 a471",
    "GT-WH-204": "a17 a4 a13 a582 tour-warehouse",
    "GT-WH-221": "a484 a482 a489 b128",
    "GT-WH-230": "b129 a10 a5 b72 tour-warehouse",
    "GT-WH-238": "a3 a6 a12 a19",
    "GT-WH-245": "a8 a20 a9 a21",
    "GT-CF-310": "a268 b167 a276 a300 tour-cafe",
    "GT-CF-318": "a292 a290 a241",
    "GT-CF-325": "a244 a311 a243 a253",
    "GT-SM-412": "b173 a352 a359 a423 tour-shop",
    "GT-SM-420": "b212 b209 a353",
    "GT-SM-428": "b178 a356 a364 a411 a368",
}


def camp(code, place, en, ar, rent, rooms, persons, floors, area, **more):
    return {
        "code": code,
        "type": "labour-accommodation",
        "location": place,
        "title_en": en,
        "title_ar": ar,
        "rent_qar": rent,
        "rooms": rooms,
        "capacity_persons": persons,
        "floors": floors,
        "area_sqm": area,
        "amenities": [*CAMP_AMENITIES, "Civil Defence approved"],
        **more,
    }


def unit(code, kind, place, en, ar, rent, area, amenities, **more):
    return {
        "code": code,
        "type": kind,
        "location": place,
        "title_en": en,
        "title_ar": ar,
        "rent_qar": rent,
        "area_sqm": area,
        "amenities": amenities,
        **more,
    }


LISTINGS = [
    camp(
        "GT-LA-125", "al-khor", "Staff accommodation with large rooms", "سكن موظفين بغرف واسعة",
        65000, 60, 240, 4, 2100, featured=True,
    ),
    camp(
        "GT-LA-132", "umm-silal", "New camp building", "مبنى سكن عمال جديد",
        85000, 84, 336, 4, 2900,
    ),
    camp(
        "GT-LA-140", "industrial-area", "Small accommodation block", "مبنى سكن صغير",
        22000, 20, 80, 2, 700, status=PropertyStatus.RENTED,
    ),
    camp(
        "GT-LA-150", "abu-nakhla", "Camp under preparation", "سكن قيد التجهيز",
        None, 40, 160, 2, 1300, status=PropertyStatus.DRAFT,
    ),
    unit(
        "GT-WH-230", "warehouse", "industrial-area", "Warehouse with loading docks",
        "مستودع مع أرصفة تحميل", 48000, 1800, ["Loading bay", "Office", "Civil Defence approved"],
        featured=True,
    ),
    unit(
        "GT-WH-238", "warehouse", "abu-nakhla", "Industrial hall with overhead crane",
        "صالة صناعية مع رافعة علوية", 75000, 3200, ["Loading bay", "Open yard"],
    ),
    unit(
        "GT-WH-245", "warehouse", "al-khor", "Racked storage warehouse", "مستودع مع أرفف تخزين",
        27000, 900, ["Loading bay", "CCTV & security"], status=PropertyStatus.RESERVED,
    ),
    unit(
        "GT-CF-318", "cafeteria", "industrial-area", "Cafeteria near worker housing",
        "كافتيريا بالقرب من سكن العمال", 12000, 140, ["Kitchen fitted", "Near camps"],
    ),
    unit(
        "GT-CF-325", "cafeteria", "umm-silal", "Restaurant space with seating",
        "مساحة مطعم مع جلسات", 18000, 260, ["Kitchen fitted"],
    ),
    unit(
        "GT-SM-420", "supermarket-shop", "abu-nakhla", "Empty shop ready for fit-out",
        "محل فارغ جاهز للتجهيز", 9000, 120, ["Near camps"],
    ),
    unit(
        "GT-SM-428", "supermarket-shop", "al-khor", "Supermarket with cold storage",
        "سوبرماركت مع تخزين مبرد", 32000, 650, ["Loading bay", "Near camps"], featured=True,
    ),
]  # fmt: skip

ENQUIRIES = [
    ("Demo Construction", "GT-LA-101", LookingFor.LABOUR_ACCOMMODATION, EnquiryStatus.NEW,
     "We need rooms for 120 workers from next month."),
    ("Demo Trading", "GT-WH-230", LookingFor.WAREHOUSE, EnquiryStatus.NEW,
     "Is the loading dock suitable for 40 ft containers?"),
    ("Demo Catering", "GT-CF-318", LookingFor.CAFETERIA, EnquiryStatus.CONTACTED,
     "نرغب في معاينة الكافتيريا هذا الأسبوع."),
    ("Demo Mart", "GT-SM-428", LookingFor.SUPERMARKET_SHOP, EnquiryStatus.NEW,
     "Please share the contract period and deposit."),
    ("Demo Owner", None, LookingFor.LIST_MY_PROPERTY, EnquiryStatus.CLOSED,
     "I have a camp in Umm Silal to list."),
]  # fmt: skip

DEMO_CODES = {*MEDIA, *(item["code"] for item in LISTINGS)}


def is_demo(prop: Property) -> bool:
    return prop.code in DEMO_CODES and prop.description_en.startswith((MARK_EN, OLD_MARK))


def describe(prop: Property, type_slug: str) -> None:
    en, ar = TEXT[type_slug]
    prop.description_en = f"{MARK_EN} {NOTE_EN}\n\n{en}"
    prop.description_ar = f"{MARK_AR} {NOTE_AR}\n\n{ar}"


def files_for(names: str, folder: Path) -> list[Path]:
    found = []
    for name in names.split():
        path = next(iter(sorted(folder.glob(f"{name}.*"))), None)
        if path is None:
            print(f"  missing: {folder / name}")
        else:
            found.append(path)
    return found


def add_media(db: Session, storage: Storage, prop: Property, paths: list[Path]) -> int:
    last = max((m.sort_order for m in prop.media), default=-1)
    has_cover = any(m.is_cover for m in prop.media)
    for number, path in enumerate(paths):
        with path.open("rb") as file:
            width = height = None
            if path.suffix in VIDEO_SUFFIXES:
                kind, body = MediaKind.VIDEO, file
                extension, content_type = video_type(file)
            else:
                webp = to_webp(file, PHOTO_SIDE)
                kind, body, width, height = MediaKind.IMAGE, webp.file, webp.width, webp.height
                extension, content_type = "webp", "image/webp"
            key = f"properties/{prop.id}/{uuid.uuid4().hex}.{extension}"
            storage.save(key, body, content_type)
        db.add(
            PropertyMedia(
                property_id=prop.id,
                object_key=key,
                kind=kind,
                width=width,
                height=height,
                sort_order=last + 1 + number,
                is_cover=number == 0 and not has_cover and kind == MediaKind.IMAGE,
            )
        )
    return len(paths)


def load(db: Session, storage: Storage, folder: Path = MEDIA_DIR) -> dict[str, int]:
    seed(db, samples=True)
    types = {t.slug: t for t in db.scalars(select(PropertyType))}
    places = {loc.slug: loc for loc in db.scalars(select(Location))}
    props = {p.code: p for p in db.scalars(select(Property))}
    added = {"listings": 0, "photos and videos": 0, "enquiries": 0}
    now = datetime.now(UTC)

    for number, item in enumerate(LISTINGS):
        data = dict(item)
        kind, place = types[data.pop("type")], places[data.pop("location")]
        data.setdefault("status", PropertyStatus.AVAILABLE)
        if data["code"] in props:
            continue
        prop = Property(
            **data,
            type=kind,
            location=place,
            national_address="Zone [NO] · Street [NO] · Building [NO]",
            lat=place.lat + 0.004 * (number % 3 - 1),
            lng=place.lng + 0.005 * (number % 4 - 1),
            published_at=None
            if data["status"] == PropertyStatus.DRAFT
            else now - timedelta(days=number + 1),
        )
        describe(prop, kind.slug)
        db.add(prop)
        props[prop.code] = prop
        added["listings"] += 1
    db.flush()

    for code, names in MEDIA.items():
        prop = props[code]
        if not is_demo(prop):
            continue
        if prop.description_en.startswith(OLD_MARK):
            describe(prop, prop.type.slug)
        # Files that were missing the last time are added on the next run.
        has_photos, has_video = (
            any((m.kind == MediaKind.VIDEO) == video for m in prop.media) for video in (False, True)
        )
        wanted = [
            path
            for path in files_for(names, folder)
            if not (has_video if path.suffix in VIDEO_SUFFIXES else has_photos)
        ]
        added["photos and videos"] += add_media(db, storage, prop, wanted)
        db.commit()

    if db.scalar(select(Enquiry.id).where(Enquiry.phone.startswith(FAKE_PHONE)).limit(1)) is None:
        for number, (company, code, wants, state, message) in enumerate(ENQUIRIES, 1):
            db.add(
                Enquiry(
                    name=f"Demo visitor {number}",
                    company=company,
                    phone=f"{FAKE_PHONE}{number}",
                    property_id=props[code].id if code else None,
                    looking_for=wants,
                    status=state,
                    message=message,
                    reply_on_whatsapp=number % 2 == 0,
                )
            )
            added["enquiries"] += 1
    db.commit()
    return added


def remove(db: Session, storage: Storage) -> dict[str, int]:
    removed = {"listings": 0, "enquiries": 0}
    for enquiry in db.scalars(select(Enquiry).where(Enquiry.phone.startswith(FAKE_PHONE))):
        db.delete(enquiry)
        removed["enquiries"] += 1
    keys = []
    for prop in db.scalars(select(Property).where(Property.code.in_(DEMO_CODES))):
        if is_demo(prop):
            keys += [m.object_key for m in prop.media]
            db.delete(prop)
            removed["listings"] += 1
    db.commit()
    for key in keys:
        storage.delete(key)
    return removed


if __name__ == "__main__":
    if settings.app_env != "development":
        sys.exit("Demo data is only for development (APP_ENV=development).")
    with SessionLocal() as session:
        if "--remove" in sys.argv:
            done, verb = remove(session, get_storage()), "removed"
        else:
            done, verb = load(session, get_storage()), "added"
    for name, count in done.items():
        print(f"{name}: {count} {verb}")
