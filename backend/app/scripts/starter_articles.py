"""Add five draft articles (English and Arabic) to start the blog.

Run:  python -m app.scripts.starter_articles

They are drafts: read, change and publish them in the admin panel. An article whose web name
already exists is left alone.
"""

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.db import SessionLocal
from app.models import Article, Location, PropertyType

CAMP = "labour-accommodation"
CHECK_EN = """## Check before you sign

- Visit the place and test water, electricity and air conditioning
- Ask who pays for water, electricity and maintenance
- Ask for the official approvals of the building
- Check the way to your work sites at rush hour

## Next step

See the available properties below, use the [capacity calculator](/calculator),
or [send us an enquiry](/contact)."""
CHECK_AR = """## تحقق قبل التوقيع

- زر المكان واختبر الماء والكهرباء والتكييف
- اسأل عمّن يدفع فواتير الماء والكهرباء والصيانة
- اطلب الموافقات الرسمية للمبنى
- تحقق من الطريق إلى مواقع العمل وقت الذروة

## الخطوة التالية

شاهد العقارات المتاحة أدناه، أو استخدم [حاسبة السعة](/ar/calculator)،
أو [أرسل استفسارك](/ar/contact)."""


def guide(place: str, name_en: str, name_ar: str, fits_en: str, fits_ar: str) -> dict:
    return {
        "slug": f"{place}-guide",
        "location": place,
        "title_en": f"Renting in {name_en}: a short guide",
        "title_ar": f"دليل مختصر للاستئجار في {name_ar}",
        "summary_en": f"What to check when renting business space or staff housing in {name_en}.",
        "summary_ar": f"ما الذي تبحث عنه عند استئجار مساحة تجارية أو سكن موظفين في {name_ar}.",
        "body_en": f"## Who is {name_en} good for?\n\n{fits_en}\n\n{CHECK_EN}",
        "body_ar": f"## لمن تناسب {name_ar}؟\n\n{fits_ar}\n\n{CHECK_AR}",
    }


ARTICLES = [
    guide(
        "industrial-area",
        "Industrial Area",
        "المنطقة الصناعية",
        "Companies that want staff housing, storage and workshops close together.",
        "الشركات التي تريد سكن الموظفين والتخزين والورش في مكان متقارب.",
    ),
    guide(
        "umm-silal",
        "Umm Silal",
        "أم صلال",
        "Companies that need storage or staff housing north of Doha.",
        "الشركات التي تحتاج إلى التخزين أو سكن الموظفين شمال الدوحة.",
    ),
    guide(
        "al-khor",
        "Al Khor",
        "الخور",
        "Companies with projects in the north of Qatar that want staff to live near work.",
        "الشركات التي لديها مشاريع في شمال قطر وتريد سكن الموظفين بالقرب من العمل.",
    ),
    guide(
        "abu-nakhla",
        "Abu Nakhla",
        "أبو نخلة",
        "Companies that need staff camps, open yards or shops near worker housing.",
        "الشركات التي تحتاج إلى سكن عمال أو ساحات مفتوحة أو محلات بالقرب من سكن العمال.",
    ),
    {
        "slug": "how-to-choose-labour-accommodation",
        "type": CAMP,
        "title_en": "How to choose labour accommodation: 8 questions to ask",
        "title_ar": "كيف تختار سكن العمال: 8 أسئلة مهمة",
        "summary_en": "A simple list of questions for companies renting worker housing in Qatar.",
        "summary_ar": "قائمة بسيطة من الأسئلة للشركات التي تستأجر سكن العمال في قطر.",
        "body_en": """## Eight questions

1. How many workers need a place now, and in six months?
2. How many workers will sleep in each room?
3. How far is it from the work sites?
4. Are there enough kitchens, washrooms and laundry machines?
5. Is there space for buses?
6. Who looks after cleaning, security and repairs?
7. Which official approvals does the building have?
8. What is in the rent, and what do you pay extra?

"""
        + CHECK_EN,
        "body_ar": """## ثمانية أسئلة

1. كم عدد العمال الذين يحتاجون إلى سكن الآن وبعد ستة أشهر؟
2. كم عاملاً سيسكن في كل غرفة؟
3. ما المسافة إلى مواقع العمل؟
4. هل المطابخ ودورات المياه وغسالات الملابس كافية؟
5. هل توجد مواقف للحافلات؟
6. من المسؤول عن النظافة والأمن والصيانة؟
7. ما الموافقات الرسمية للمبنى؟
8. ماذا يشمل الإيجار وما الذي تدفعه إضافياً؟

"""
        + CHECK_AR,
    },
]


def load(db: Session) -> int:
    places = dict(db.execute(select(Location.slug, Location.id)).tuples().all())
    types = dict(db.execute(select(PropertyType.slug, PropertyType.id)).tuples().all())
    known = set(db.scalars(select(Article.slug)))
    added = 0
    for item in ARTICLES:
        if item["slug"] in known:
            continue
        data = dict(item)
        db.add(
            Article(
                location_id=places.get(data.pop("location", "")),
                type_id=types.get(data.pop("type", "")),
                **data,
            )
        )
        added += 1
    db.commit()
    return added


if __name__ == "__main__":
    with SessionLocal() as session:
        print(f"{load(session)} draft articles added")
