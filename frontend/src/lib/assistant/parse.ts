// Reading what a visitor wants: which category, area, budget, size and facilities.
import { AMENITIES_AR } from "@/lib/format";
import type { LocationOut, PropertyCard, PropertyTypeOut } from "@/lib/types";
import { clean, same, set, words } from "./words";

export type Wish = {
  type?: string;
  location?: string;
  minRent?: number;
  maxRent?: number;
  persons?: number;
  rooms?: number;
  minArea?: number;
  maxArea?: number;
  amenities?: string[];
  available?: boolean;
  sort?: "cheap" | "expensive" | "large" | "new";
};

/** Other words people use for the first categories. New categories use their own names. */
const TYPE_WORDS: Record<string, string> = {
  "labour-accommodation":
    "labour labor camp accommodation accomodation worker staff employee housing dormitory bachelor سكن عمال عمالة عامل مجمع كمب كامب موظفين",
  warehouse: "warehouse godown storage store depot مستودع مخزن مخازن تخزين",
  cafeteria: "cafeteria cafe coffee restaurant canteen kitchenette كافتيريا كافيه مقهى مطعم مطاعم",
  "supermarket-shop":
    "supermarket shop grocery retail mart minimart baqala سوبرماركت محل متجر بقالة دكان",
  residential:
    "residential flat villa apartment family house studio شقة شقق فيلا فلل سكني عائلي بيت",
};
const PLAIN = set(
  "area areas al el umm abu city street road zone new the and of for near at منطقة ام ابو مدينة شارع",
);
/** Places in Qatar, to say honestly when we have nothing there. */
const PLACES =
  "wakra wukair lusail rayyan doha mesaieed dukhan gharafa barwa birkat logistics salwa sadd pearl shamal ruwais khalifa wakrah thakhira simaisma muaither الوكرة الوكير لوسيل الريان الدوحة مسيعيد دخان الغرافة بروة سلوى السد اللؤلؤة الشمال الرويس الذخيرة سميسمة معيذر";

const AMENITY_PLAIN = set(
  "and per floor common area central split near fitted & في كل قريب من منطقة مشترك مركزي بالقرب",
);
const AMENITY_WORDS: Record<string, string> = {
  "Central / split A/C":
    "ac aircon conditioning conditioned conditioner cooling مكيف مكيفة تكييف مكيفات",
  "Common kitchen": "kitchen cooking مطبخ مطابخ",
  "Kitchen fitted": "kitchen cooking مطبخ مطابخ",
  "Washrooms per floor": "washroom bathroom toilet حمام حمامات دورات",
  "Laundry area": "laundry washing غسيل مغسلة",
  "Water & electricity (KAHRAMAA)": "water electricity kahramaa utilities ماء كهرباء كهرماء",
  "CCTV & security": "cctv security camera guard كاميرا كاميرات حراسة امن",
  "Bus parking": "bus parking باص حافلات مواقف موقف",
  "Civil Defence approved": "civil defence defense الدفاع المدني",
  "Loading bay": "loading dock truck تحميل رصيف شاحنات",
};

const UNDER =
  /(under|below|less|max(?:imum)?|up to|upto|within|budget|not more|cheaper than|اقل|تحت|حد اقصي|بحدود|ميزانيه|لا يزيد|لغايه|حتي)/;
const OVER = /(over|above|more than|at least|min(?:imum)?|from|اكثر|فوق|علي الاقل|ابتداء|حد ادني)/;
const PERSON =
  /^(persons?|people|pax|workers?|staff|labou?rs?|labou?rers?|men|employees?|beds?|عامل|عمال|شخص|اشخاص|موظف|موظفين|سرير)$/;
const ROOM = /^(rooms?|غرفه|غرف)$/;
const AREA = /^(sqm|meters?|metres?|square|متر|امتار|م)$/;
const MONEY = /^(qar|qr|riyals?|rials?|ريال|ر\.ق)$/;

/** What a text says about words it uses: e.g. "cafe" -> cafeteria. */
export function findType(list: string[], types: PropertyTypeOut[]): PropertyTypeOut | undefined {
  let best: { type: PropertyTypeOut; score: number } | undefined;
  for (const type of types) {
    const known = set(
      `${type.name_en} ${type.name_ar} ${type.slug} ${TYPE_WORDS[type.slug] ?? ""}`,
    );
    let score = 0;
    for (const word of list) {
      if (PLAIN.has(word)) continue;
      if (known.has(word)) score += 2;
      else if ([...known].some((k) => same(k, word))) score += 1;
    }
    if (score && (!best || score > best.score)) best = { type, score };
  }
  return best?.type;
}

export function findLocation(list: string[], locations: LocationOut[]): LocationOut | undefined {
  return locations.find((location) => {
    const names = [...set(`${location.name_en} ${location.name_ar} ${location.slug}`)];
    const own = names.filter((w) => !PLAIN.has(w));
    return list.some((word) => !PLAIN.has(word) && own.some((name) => same(name, word)));
  });
}

/** A place we know of but have no listings in. */
export function otherPlace(text: string): string | undefined {
  const known = set(PLACES);
  return clean(text)
    .split(" ")
    .find((word) => words(word).some((w) => known.has(w)));
}

export function findAmenities(list: string[], properties: PropertyCard[]): string[] {
  const all = [...new Set(properties.flatMap((p) => p.amenities))];
  return all.filter((name) => {
    const known = set(`${name} ${AMENITIES_AR[name] ?? ""} ${AMENITY_WORDS[name] ?? ""}`);
    return list.some((word) => known.has(word) && !AMENITY_PLAIN.has(word));
  });
}

function findNumbers(message: string): Wish {
  const wish: Wish = {};
  const text = clean(message).replace(/(\d)\s*-\s*(\d)/g, "$1 - $2");
  const found = [...text.matchAll(/(\d+(?:\.\d+)?)\s*(k\b|thousand|الف)?/g)].map((m) => {
    const value = Number(m[1]) * (m[2] ? 1000 : 1);
    const after = text
      .slice(m.index + m[0].length)
      .trim()
      .split(" ")
      .slice(0, 2);
    const before = text.slice(Math.max(0, m.index - 26), m.index);
    const word = after[0] ?? "";
    const kind = PERSON.test(word)
      ? "persons"
      : ROOM.test(word)
        ? "rooms"
        : AREA.test(word)
          ? "area"
          : MONEY.test(word) || /(qar|qr|ريال)\s*$/.test(before) || m[2] || value >= 1000
            ? "money"
            : UNDER.test(before) && value >= 500
              ? "money"
              : null;
    return { value, kind, before };
  });
  for (const item of found) {
    const { value, kind, before } = item;
    if (kind === "persons") wish.persons = value;
    if (kind === "rooms") wish.rooms = value;
    if (kind === "area") {
      if (UNDER.test(before)) wish.maxArea = value;
      else wish.minArea = value;
    }
    if (kind === "money") {
      if (
        wish.maxRent !== undefined &&
        wish.minRent === undefined &&
        /(to|and|-|الي|و)\s*(qar|qr|ريال)?\s*$/.test(before)
      ) {
        wish.minRent = Math.min(wish.maxRent, value);
        wish.maxRent = Math.max(wish.maxRent, value);
      } else if (OVER.test(before) && !UNDER.test(before) && !/between|from\s*$/.test(before)) {
        wish.minRent = value;
      } else if (/(around|about|near|approx|حوالي|تقريبا)/.test(before)) {
        wish.minRent = Math.round(value * 0.8);
        wish.maxRent = Math.round(value * 1.2);
      } else wish.maxRent = value;
    }
  }
  return wish;
}

const CHEAP = set("cheap cheapest cheaper lowest affordable economical low ارخص رخيص الاقل");
const DEAR = set("expensive highest luxury premium اغلى");
const LARGE = set("biggest largest big large bigger larger spacious huge اكبر كبير كبيرة واسع");
const FRESH = set("newest latest recent new احدث جديد جديدة");
const FREE = set("available vacant ready متاح متاحة متوفر متوفرة شاغر جاهز");

export function parseWish(
  message: string,
  data: { types: PropertyTypeOut[]; locations: LocationOut[]; properties: PropertyCard[] },
): Wish {
  const list = words(message);
  const wish = findNumbers(message);
  const location = findLocation(list, data.locations);
  const type = findType(list, data.types);
  const typeWords = type
    ? set(`${type.name_en} ${type.name_ar} ${TYPE_WORDS[type.slug] ?? ""}`)
    : new Set<string>();
  const amenities = findAmenities(
    list.filter((w) => !typeWords.has(w)),
    data.properties,
  );
  if (type) wish.type = type.slug;
  if (location) wish.location = location.slug;
  if (amenities.length) wish.amenities = amenities;
  const has = (known: Set<string>) => list.some((w) => known.has(w));
  if (has(CHEAP)) wish.sort = "cheap";
  else if (has(DEAR)) wish.sort = "expensive";
  else if (has(LARGE)) wish.sort = "large";
  else if (has(FRESH)) wish.sort = "new";
  if (has(FREE)) wish.available = true;
  return wish;
}

/** One facility is asked by several listing names ("Common kitchen", "Kitchen fitted"): any will do. */
function amenityMatch(property: PropertyCard, wanted: string[]): boolean {
  const groups = new Map<string, string[]>();
  for (const name of wanted) {
    const key = AMENITY_WORDS[name]?.split(" ")[0] ?? name;
    groups.set(key, [...(groups.get(key) ?? []), name]);
  }
  return [...groups.values()].every((names) => names.some((n) => property.amenities.includes(n)));
}

export function search(properties: PropertyCard[], wish: Wish): PropertyCard[] {
  const found = properties.filter(
    (p) =>
      (!wish.type || p.type.slug === wish.type) &&
      (!wish.location || p.location.slug === wish.location) &&
      (!wish.available || p.status === "available") &&
      (wish.minRent === undefined || (p.rent_qar !== null && p.rent_qar >= wish.minRent)) &&
      (wish.maxRent === undefined || (p.rent_qar !== null && p.rent_qar <= wish.maxRent)) &&
      (wish.persons === undefined || (p.capacity_persons ?? 0) >= wish.persons) &&
      (wish.rooms === undefined || (p.rooms ?? 0) >= wish.rooms) &&
      (wish.minArea === undefined || (p.area_sqm ?? 0) >= wish.minArea) &&
      (wish.maxArea === undefined || (p.area_sqm !== null && p.area_sqm <= wish.maxArea)) &&
      (!wish.amenities?.length || amenityMatch(p, wish.amenities)),
  );
  const rent = (p: PropertyCard, none: number) => p.rent_qar ?? none;
  const size = (p: PropertyCard) => p.area_sqm ?? p.capacity_persons ?? 0;
  const order = {
    cheap: (a: PropertyCard, b: PropertyCard) => rent(a, Infinity) - rent(b, Infinity),
    expensive: (a: PropertyCard, b: PropertyCard) => rent(b, -1) - rent(a, -1),
    large: (a: PropertyCard, b: PropertyCard) => size(b) - size(a),
    new: (a: PropertyCard, b: PropertyCard) => b.published_at.localeCompare(a.published_at),
  };
  // Available ones come first.
  const first = (p: PropertyCard) => (p.status === "available" ? 0 : 1);
  return wish.sort
    ? found.sort(order[wish.sort])
    : found.sort((a, b) => first(a) - first(b) || Number(b.featured) - Number(a.featured));
}

/** Without the least important wishes, until something is found. */
export function closest(properties: PropertyCard[], wish: Wish): PropertyCard[] {
  const steps: (keyof Wish)[][] = [
    ["amenities", "available"],
    ["minRent", "maxRent"],
    ["rooms", "persons", "minArea", "maxArea"],
    ["location"],
  ];
  const left = { ...wish };
  for (const step of steps) {
    for (const key of step) delete left[key];
    if (!Object.keys(left).some((key) => key !== "sort")) return [];
    // Nothing within the budget: the cheapest are the closest.
    const found = search(
      properties,
      wish.maxRent === undefined ? left : { ...left, sort: "cheap" },
    );
    if (found.length) return found;
  }
  return [];
}
