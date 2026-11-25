"""One-page PDF of a property, in English or Arabic."""

from functools import lru_cache
from io import BytesIO
from pathlib import Path

import segno
from fpdf import FPDF
from PIL import Image, ImageDraw, ImageOps

from app.core.config import settings
from app.models import MediaKind, Property, PropertyStatus
from app.schemas.site import CompanyContent
from app.services.static_map import safe_map
from app.services.storage import Storage

ASSETS = Path(__file__).parents[1] / "assets"
GREEN, DEEP, ROSE = (31, 122, 82), (6, 42, 31), (163, 72, 111)
SLATE, INK, MUTED = (74, 84, 104), (30, 36, 48), (91, 100, 116)
TINT, LINE, SAGE, MINT = (227, 242, 234), (226, 231, 227), (211, 228, 220), (61, 220, 151)
MARGIN, WIDTH, HEIGHT = 12.0, 210.0, 297.0
INNER = WIDTH - 2 * MARGIN
FOOTER = 34.0

WORDS = {
    "en": {
        "available": "Available now",
        "reserved": "Reserved",
        "rented": "Rented",
        "rent": "QAR {n} / month",
        "request": "Price on request",
        "code": "Code {code}",
        "rooms": "Rooms",
        "capacity": "Capacity",
        "persons": "{n} persons",
        "area": "Built-up area",
        "sqm": "{n} sq.m",
        "floors": "Floors",
        "facilities": "Facilities",
        "about": "About this property",
        "location": "Location",
        "scan": "Scan for photos and map",
        "note": "Details can change. Please ask our team to confirm.",
    },
    "ar": {
        "available": "متاح الآن",
        "reserved": "محجوز",
        "rented": "مؤجر",
        "rent": "{n} ر.ق / شهرياً",
        "request": "السعر عند الطلب",
        "code": "الرمز {code}",
        "rooms": "الغرف",
        "capacity": "السعة",
        "persons": "{n} شخص",
        "area": "مساحة البناء",
        "sqm": "{n} متر مربع",
        "floors": "الطوابق",
        "facilities": "المرافق",
        "about": "عن العقار",
        "location": "الموقع",
        "scan": "امسح الرمز للصور والخريطة",
        "note": "قد تتغير التفاصيل. يرجى التأكد من فريقنا.",
    },
}
# The same Arabic names as on the website.
AMENITIES_AR = {
    "Central / split A/C": "تكييف مركزي / سبليت",
    "Common kitchen": "مطبخ مشترك",
    "Washrooms per floor": "دورات مياه في كل طابق",
    "Laundry area": "منطقة غسيل",
    "Water & electricity (KAHRAMAA)": "ماء وكهرباء (كهرماء)",
    "CCTV & security": "كاميرات مراقبة وأمن",
    "Bus parking": "مواقف حافلات",
    "Civil Defence approved": "معتمد من الدفاع المدني",
    "Loading bay": "رصيف تحميل",
    "Office": "مكتب",
    "Kitchen fitted": "مطبخ مجهز",
    "Near camps": "بالقرب من سكن العمال",
    "Open yard": "ساحة مفتوحة",
}


def number(value: float) -> str:
    return f"{value:,.0f}" if value == int(value) else f"{value:,.1f}"


def rounded(picture: Image.Image, width: float, height: float, radius: float = 3) -> BytesIO:
    """Crop to the box and round the corners (on white paper)."""
    dots = 7.5  # per mm, about 190 dpi
    size = (round(width * dots), round(height * dots))
    result = ImageOps.fit(picture.convert("RGB"), size, Image.Resampling.LANCZOS)
    mask = Image.new("L", size, 0)
    ImageDraw.Draw(mask).rounded_rectangle(
        (0, 0, size[0] - 1, size[1] - 1), radius * dots, fill=255
    )
    paper = Image.new("RGB", size, "white")
    paper.paste(result, mask=mask)
    out = BytesIO()
    paper.save(out, "JPEG", quality=84)
    out.seek(0)
    return out


class Page(FPDF):
    def __init__(self, language: str) -> None:
        super().__init__(format="A4")
        self.rtl = language == "ar"
        self.set_auto_page_break(False)
        self.set_margins(MARGIN, MARGIN)
        self.c_margin = 0
        fonts = ASSETS / "fonts"
        self.add_font("Inter", "", fonts / "Inter-400.ttf")
        self.add_font("Inter", "B", fonts / "Inter-700.ttf")
        self.add_font("Kufi", "", fonts / "NotoKufiArabic-400.ttf")
        self.add_font("Kufi", "B", fonts / "NotoKufiArabic-700.ttf")
        self.add_font("Grotesk", "B", fonts / "SpaceGrotesk-700.ttf")
        self.add_font("Grotesk", "", fonts / "SpaceGrotesk-700.ttf")
        self.set_fallback_fonts(["Kufi", "Inter"], exact_match=False)
        self.set_text_shaping(True)

    def x_of(self, x: float, width: float) -> float:
        """Mirror for Arabic."""
        return WIDTH - x - width if self.rtl else x

    def write_text(
        self,
        text: str,
        x: float,
        y: float,
        width: float,
        size: float,
        color: tuple = INK,
        bold: bool = False,
        title: bool = False,
        align: str = "",
        line: float = 1.35,
        max_lines: int = 1,
    ) -> float:
        """Write inside a box and return the y below it. Too long text ends with …"""
        family = "Kufi" if self.rtl else "Grotesk" if title else "Inter"
        self.set_font(family, "B" if bold or title else "", size)
        self.set_text_color(*color)
        height = size * 0.3528 * (line + (0.25 if self.rtl else 0))
        align = align or ("R" if self.rtl else "L")
        rows = self.multi_cell(
            width, height, text, align=align, dry_run=True, output="LINES", new_x="LEFT"
        )
        if len(rows) > max_lines:
            text = " ".join(" ".join(rows[:max_lines]).split())[:-3].rstrip() + "…"
            rows = rows[:max_lines]
        self.set_xy(self.x_of(x, width), y)
        self.multi_cell(width, height, text, align=align, new_x="LEFT", new_y="NEXT")
        return y + height * len(rows)

    def box(self, x: float, y: float, w: float, h: float, color: tuple, radius: float = 3) -> None:
        self.set_fill_color(*color)
        self.rect(
            self.x_of(x, w), y, w, h, style="F", round_corners=radius > 0, corner_radius=radius
        )

    def picture(self, source: BytesIO | Path, x: float, y: float, w: float, h: float = 0) -> None:
        self.image(source, self.x_of(x, w), y, w, h)


def photos(prop: Property, storage: Storage) -> list[Image.Image]:
    images = [m for m in prop.media if m.kind == MediaKind.IMAGE]
    images.sort(key=lambda m: not m.is_cover)
    found = []
    for media in images[:4]:
        try:
            with Image.open(BytesIO(storage.read(media.object_key))) as picture:
                found.append(picture.convert("RGB"))
        except Exception:  # a missing photo must not stop the brochure
            continue
    return found


def make(
    prop: Property, storage: Storage, language: str, company: CompanyContent | None, with_map: bool
) -> bytes:
    w = WORDS[language]
    arabic = language == "ar"

    def name(item) -> str:
        return (arabic and item.name_ar) or item.name_en

    title = (arabic and prop.title_ar) or prop.title_en
    pdf = Page(language)
    pdf.set_title(f"{title} - {prop.code}")
    pdf.set_author("Green Tech Real Estate Broker")
    pdf.add_page()

    # Header
    pdf.set_fill_color(*DEEP)
    pdf.rect(0, 0, WIDTH, 26, style="F")
    logo = ASSETS / "brand" / f"greentech-logo-compact-{language}-on-dark-600.png"
    pdf.picture(logo, MARGIN - 2, 4, 52 if not arabic else 45)
    status = w[prop.status.value]
    pdf.set_font("Kufi" if arabic else "Inter", "B", 10)
    badge = pdf.get_string_width(status) + 9
    available = prop.status == PropertyStatus.AVAILABLE
    pdf.box(WIDTH - MARGIN - badge, 9, badge, 8.4, MINT if available else ROSE, 4.1)
    pdf.write_text(
        status,
        WIDTH - MARGIN - badge,
        10.4 if not arabic else 9.8,
        badge,
        10,
        DEEP if available else (255, 255, 255),
        bold=True,
        align="C",
    )

    # Title and price
    y = 31.0
    top = y
    price = w["request"] if prop.rent_qar is None else w["rent"].format(n=f"{prop.rent_qar:,}")
    left = INNER - 66
    y = pdf.write_text(
        f"{name(prop.type)} · {w['code'].format(code=prop.code)}", MARGIN, y, left, 9.5, ROSE, True
    )
    y = pdf.write_text(title, MARGIN, y + 1, left, 19, SLATE, title=True, line=1.15, max_lines=2)
    place = name(prop.location)
    if prop.national_address and "[" not in prop.national_address:
        place += (" ، " if arabic else ", ") + prop.national_address
    y = pdf.write_text(place, MARGIN, y + 1, left, 10.5, MUTED)
    pdf.box(WIDTH - MARGIN - 62, top, 62, 17, TINT)
    pdf.write_text(
        price,
        WIDTH - MARGIN - 60,
        top + (5.4 if not arabic else 4.6),
        58,
        13.5,
        GREEN,
        True,
        align="C",
    )
    y = max(y, top + 18) + 4

    # Photos
    pictures = photos(prop, storage)
    gap = 3.0
    if len(pictures) >= 4:
        big, small = 126.0, INNER - 126.0 - gap
        pdf.picture(rounded(pictures[0], big, 78), MARGIN, y, big, 78)
        part = (78 - 2 * gap) / 3
        for i, picture in enumerate(pictures[1:4]):
            pdf.picture(
                rounded(picture, small, part),
                MARGIN + big + gap,
                y + i * (part + gap),
                small,
                part,
            )
        y += 78 + 5
    elif pictures:
        each = (INNER - gap * (len(pictures) - 1)) / len(pictures)
        tall = 78 if len(pictures) == 1 else 62
        for i, picture in enumerate(pictures):
            pdf.picture(rounded(picture, each, tall), MARGIN + i * (each + gap), y, each, tall)
        y += tall + 5

    # Facts
    facts = [
        (w["rooms"], prop.rooms and number(prop.rooms)),
        (
            w["capacity"],
            prop.capacity_persons and w["persons"].format(n=number(prop.capacity_persons)),
        ),
        (w["area"], prop.area_sqm and w["sqm"].format(n=number(prop.area_sqm))),
        (w["floors"], prop.floors and number(prop.floors)),
    ]
    facts = [(label, value) for label, value in facts if value]
    if facts:
        each = (INNER - gap * (len(facts) - 1)) / len(facts)
        for i, (label, value) in enumerate(facts):
            x = MARGIN + i * (each + gap)
            pdf.box(x, y, each, 17, (244, 245, 242))
            pdf.write_text(label, x + 3.5, y + 2.6, each - 7, 8.5, MUTED)
            pdf.write_text(value, x + 3.5, y + 7.8, each - 7, 13, SLATE, bold=True)
        y += 17 + 6

    # Facilities and text on one side, map on the other
    bottom = HEIGHT - FOOTER - 9
    side = 70.0
    has_map = with_map and prop.lat is not None and prop.lng is not None
    tall = min(62.0, bottom - y - 8)
    map_file = (
        safe_map(prop.lat, prop.lng, 560, round(560 * tall / side))
        if has_map and tall > 25
        else None
    )
    column = INNER - side - 8 if map_file else INNER
    start = y
    if prop.amenities:
        y = pdf.write_text(w["facilities"], MARGIN, y, column, 12.5, SLATE, title=True) + 1.5
        half = column / 2
        rows = prop.amenities[:12]
        for i, amenity in enumerate(rows):
            x = MARGIN + (i % 2) * half
            row_y = y + (i // 2) * 6.4
            if row_y > bottom - 6:
                break
            pdf.box(x, row_y + 1.7, 2.2, 2.2, GREEN, 1.0)
            text = AMENITIES_AR.get(amenity, amenity) if arabic else amenity
            pdf.write_text(text, x + 4.5, row_y, half - 6, 9.5, INK)
        y += (len(rows) + 1) // 2 * 6.4 + 4
    about = (arabic and prop.description_ar) or prop.description_en
    if about and bottom - y > 22:
        y = pdf.write_text(w["about"], MARGIN, y, column, 12.5, SLATE, title=True) + 1.5
        row = 9.5 * 0.3528 * (1.45 + (0.25 if arabic else 0))
        pdf.write_text(
            " ".join(about.split()),
            MARGIN,
            y,
            column,
            9.5,
            INK,
            line=1.45,
            max_lines=max(1, int((bottom - y) / row)),
        )
    if map_file:
        x = WIDTH - MARGIN - side
        top = pdf.write_text(w["location"], x, start, side, 12.5, SLATE, title=True) + 1.5
        with Image.open(BytesIO(map_file)) as picture:
            pdf.picture(rounded(picture, side, tall), x, top, side, tall)
        pdf.set_font("Inter", "", 6)
        pdf.set_text_color(*MUTED)
        pdf.set_xy(pdf.x_of(x, side), top + tall + 0.6)
        pdf.cell(side, 3, "© OpenStreetMap contributors", align="R")

    # Footer
    top = HEIGHT - FOOTER
    pdf.write_text(w["note"], MARGIN, top - 6, INNER, 7.5, MUTED, align="C")
    pdf.set_fill_color(*DEEP)
    pdf.rect(0, top, WIDTH, FOOTER, style="F")
    site = settings.site_url.rstrip("/")
    link = f"{site}{'/ar' if arabic else ''}/properties/{prop.code}"
    qr = BytesIO()
    segno.make(link, error="m").save(qr, kind="png", scale=8, border=1)
    qr.seek(0)
    pdf.box(WIDTH - MARGIN - 26, top + 4, 26, 26, (255, 255, 255), 2)
    pdf.picture(qr, WIDTH - MARGIN - 25, top + 5, 24, 24)
    pdf.write_text(
        w["scan"],
        WIDTH - MARGIN - 26 - 44,
        top + 14,
        40,
        8.5,
        SAGE,
        align="L" if arabic else "R",
        max_lines=2,
    )
    lines = []
    if company:
        phones = list(dict.fromkeys(n for n in (company.whatsapp, company.phone) if n))
        lines.append("   ·   ".join([*phones, *([company.email] if company.email else [])]))
        lines.append((arabic and company.address_ar) or company.address_en)
    lines.append(site.split("://", 1)[-1])
    y = top + 5
    pdf_title = "جرين تك للوساطة العقارية" if arabic else "Green Tech Real Estate Broker"
    y = pdf.write_text(pdf_title, MARGIN, y, 110, 11.5, (255, 255, 255), title=True) + 1
    for line in lines:
        if line:
            y = pdf.write_text(line, MARGIN, y, 110, 9, SAGE) + 0.4
    return bytes(pdf.output())


@lru_cache(maxsize=32)
def _cached(key: tuple, build) -> bytes:
    return build()


class _Build:
    """Equal builds share one finished PDF, whatever objects they were made with."""

    def __init__(self, run) -> None:
        self.run = run

    def __call__(self) -> bytes:
        return self.run()

    def __eq__(self, other: object) -> bool:
        return isinstance(other, _Build)

    def __hash__(self) -> int:
        return 0


def brochure(
    prop: Property,
    storage: Storage,
    language: str,
    company: CompanyContent | None,
    with_map: bool = True,
) -> bytes:
    key = (
        prop.code,
        language,
        prop.updated_at,
        prop.type.name_en + prop.type.name_ar + prop.location.name_en + prop.location.name_ar,
        tuple((m.object_key, m.is_cover) for m in prop.media),
        company.model_dump_json() if company else "",
        with_map,
    )
    return _cached(key, _Build(lambda: make(prop, storage, language, company, with_map)))
