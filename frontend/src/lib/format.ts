import type { PropertyCard, Ref } from "./types";

/** 50000 -> "50,000" (Western digits in both languages). */
export const num = (value: number) =>
  new Intl.NumberFormat("en", { maximumFractionDigits: 1 }).format(value);

/** Keeps phone numbers in the right order inside Arabic text. */
export const ltr = (text: string) => `\u2066${text}\u2069`;

export const nameOf = (ref: Ref, locale: string) =>
  (locale === "ar" && ref.name_ar) || ref.name_en;

export const titleOf = (p: PropertyCard, locale: string) =>
  (locale === "ar" && p.title_ar) || p.title_en;

export const AMENITIES_AR: Record<string, string> = {
  "Central / split A/C": "تكييف مركزي / سبليت",
  "Common kitchen": "مطبخ مشترك",
  "Washrooms per floor": "دورات مياه في كل طابق",
  "Laundry area": "منطقة غسيل",
  "Water & electricity (KAHRAMAA)": "ماء وكهرباء (كهرماء)",
  "CCTV & security": "كاميرات مراقبة وأمن",
  "Bus parking": "مواقف حافلات",
  "Civil Defence approved": "معتمد من الدفاع المدني",
  "Loading bay": "رصيف تحميل",
  Office: "مكتب",
  "Kitchen fitted": "مطبخ مجهز",
  "Near camps": "بالقرب من سكن العمال",
  "Open yard": "ساحة مفتوحة",
};

export const amenityOf = (name: string, locale: string) =>
  (locale === "ar" && AMENITIES_AR[name]) || name;

type Translate = (key: string, values?: Record<string, string | number>) => string;

/** Up to two short facts for a card, e.g. "50 rooms", "200 persons". */
export function specs(p: PropertyCard, t: Translate, locale: string): string[] {
  const facts = [
    p.rooms !== null && t("rooms", { count: p.rooms, n: num(p.rooms) }),
    p.capacity_persons !== null &&
      t("persons", { count: p.capacity_persons, n: num(p.capacity_persons) }),
    p.area_sqm !== null && t("sqm", { n: num(p.area_sqm) }),
    ...p.amenities.map((a) => amenityOf(a, locale)),
  ];
  return facts.filter((fact): fact is string => Boolean(fact)).slice(0, 2);
}

export const BUDGETS = ["0-15000", "15000-30000", "30000-50000", "50000-"] as const;
export const SORTS = ["newest", "price_asc", "price_desc", "capacity_desc"] as const;

export function budgetRange(value: string): { min: string; max: string } {
  const [min = "", max = ""] = value.split("-");
  return { min: min === "0" ? "" : min, max };
}
