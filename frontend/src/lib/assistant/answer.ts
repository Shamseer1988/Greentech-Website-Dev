// The chat assistant. It answers only from what the website shows: no outside service is used.
import "server-only";
import { getTranslations } from "next-intl/server";
import { getAllProperties, getChat, getLocations, getProperty, getSite, getTypes } from "@/lib/api";
import { amenityOf, ltr, nameOf, num, titleOf } from "@/lib/format";
import { getHomeContent, homeTexts } from "@/lib/home-content";
import { inLanguage, whatsappHref } from "@/lib/site";
import type {
  ChatAnswer,
  LocationOut,
  PropertyCard,
  PropertyDetail,
  PropertyTypeOut,
} from "@/lib/types";
import { closest, findAmenities, otherPlace, parseWish, search, type Wish } from "./parse";
import { clean, hasAny, isArabic, same, set, words } from "./words";

export type ChatState = { wish?: Wish; code?: string; offset?: number };
export type ChatLink = { label: string; href: string };
export type ChatReply = {
  lang: "en" | "ar";
  text: string;
  properties: PropertyCard[];
  links: ChatLink[];
  suggestions: string[];
  state: ChatState;
};

const SHOWN = 3;
const HELLO = set(
  "hi hello hey salam salaam good morning evening afternoon marhaba مرحبا السلام عليكم اهلا هلا صباح مساء الخير",
);
const THANKS = set("thank thanks thx thankyou great شكرا مشكور ممتاز");
const BYE = set("bye goodbye مع السلامة وداعا");
const CONTACT = set(
  "contact phone call telephone mobile number whatsapp email mail reach agent human speak talk هاتف اتصال اتصل رقم جوال واتساب ايميل بريد تواصل موظف",
);
const OFFICE =
  /(office|your) (address|location)|where are you|your office|head office|visit you|عنوان|مكتبكم|موقعكم|وين انتم|اين انتم/;
const HOURS =
  /(office|working|opening|work) (hours?|time)|when (are|do) you open|timings?|ساعات|دوام|مواعيد العمل/;
const SOCIAL = set("instagram facebook youtube tiktok social انستغرام انستقرام فيسبوك يوتيوب");
const AREAS = set("area areas location locations where place منطقة مناطق موقع مواقع اين وين");
const HOW =
  /how (do|can|to|does)( i| we| it)? ?(rent|book|work|start|lease|apply|reserve)?|process|procedure|steps|viewing|visit|book|كيف|خطوات|طريقه|معاينه|زياره|حجز/;
const SERVICES =
  /what (do|can) you (rent|offer|have|do)|services?|categor|types?|kind|who are you|about (you|green ?tech|the company)|ماذا تؤجر|خدمات|انواع|من انتم|عن الشركه|ماذا لديكم/;
const COUNT = /how many|number of|total|count|كم عدد|عدد/;
const PRICE = /price|rent(al)? (cost|amount)|how much|cost|rate|سعر|اسعار|بكم|كم (ال)?ايجار|تكلفه/;
const SEARCH = set(
  "property properties listing listings rent rental available show list find need want looking search unit have any عقار عقارات وحدة ايجار للايجار استئجار اريد ابحث اعرض احتاج عندكم لديكم",
);
const NEW_SEARCH = set("anything any property properties listing listings all عقار عقارات جميع");
const MORE = /^(show )?(me )?more|next|other options|others|المزيد|اكثر|غيرها|خيارات اخري/;
const ALL = /\ball\b|everything|reset|جميع|كل العقارات/;
const OWNER =
  /(list|advertise|add|rent out|market) (my|our|a) |i (have|own) an? .*(to rent|for rent|lease)|owner|landlord|اعرض عقاري|عندي عقار|لدي عقار|مالك/;
const TERMS =
  /deposit|commission|contract|agreement|cheque|payment|pay |negotia|discount|lease (term|period)|minimum period|insurance|maintenance|furnish|عموله|تامين|عقد|شيك|دفع|خصم|تفاوض|صيانه|مفروش/;
const THIS = /\b(it|its|this|that|there|one)\b|هذا|هذه|هل هو|هل هي|فيه|فيها/;
const DETAIL = /detail|tell me|more about|info|describe|تفاصيل|معلومات|اخبرني/;
const WHERE = /where|address|location|map|direction|اين|وين|عنوان|موقع|خريطه/;
const ALSO = /^(and|what about|how about|also|و|ماذا عن|وماذا|طيب)/;
const STOP = set(
  "a an the is are do does did you your i we my me in on at of for to and or can could would will with have has there any what how when which it this that please from be if هل ما في من على الى عن هو هي مع او لو كم انا نحن يوجد هناك",
);

type Data = {
  types: PropertyTypeOut[];
  locations: LocationOut[];
  properties: PropertyCard[];
};

/** Anything unexpected from the browser is ignored. */
export function safeState(value: unknown): ChatState {
  const raw = (value ?? {}) as { wish?: Record<string, unknown>; code?: unknown; offset?: unknown };
  const state: ChatState = {};
  if (typeof raw.code === "string") state.code = raw.code.slice(0, 20);
  if (typeof raw.offset === "number" && raw.offset >= 0 && raw.offset < 1000) {
    state.offset = Math.floor(raw.offset);
  }
  if (raw.wish && typeof raw.wish === "object") {
    const wish: Record<string, unknown> = {};
    for (const key of ["type", "location"]) {
      if (typeof raw.wish[key] === "string") wish[key] = raw.wish[key];
    }
    for (const key of ["minRent", "maxRent", "persons", "rooms", "minArea", "maxArea"]) {
      if (Number.isFinite(raw.wish[key])) wish[key] = raw.wish[key];
    }
    if (Array.isArray(raw.wish.amenities)) {
      wish.amenities = raw.wish.amenities.filter((a) => typeof a === "string").slice(0, 20);
    }
    if (raw.wish.available === true) wish.available = true;
    if (["cheap", "expensive", "large", "new"].includes(String(raw.wish.sort))) {
      wish.sort = raw.wish.sort;
    }
    state.wish = wish as Wish;
  }
  return state;
}

/** "gt-la-101", "GT LA 101", "la101" -> GT-LA-101 */
function findCode(message: string, properties: PropertyCard[]): string | undefined {
  const flat = clean(message).replace(/[\s.\-]/g, "");
  const known = properties.find((p) => {
    const code = p.code.toLowerCase().replace(/[^a-z0-9]/g, "");
    const short = code.replace(/^gt/, "");
    const match = flat.includes(code)
      ? code
      : short.length >= 4 && flat.includes(short)
        ? short
        : null;
    // "la10" must not be found inside "la101".
    return match && !/\d/.test(flat[flat.indexOf(match) + match.length] ?? "");
  });
  if (known) return known.code;
  return /\b[a-z]{2}-[a-z]{2}-\d{2,5}\b/.exec(clean(message))?.[0].toUpperCase();
}

/** The office's own questions and answers (admin panel). */
function ownAnswer(list: string[], answers: ChatAnswer[]): ChatAnswer | undefined {
  const asked = list.filter((w) => !STOP.has(w));
  if (!asked.length) return undefined;
  let best: { answer: ChatAnswer; score: number } | undefined;
  for (const answer of answers) {
    let score = 0;
    for (const question of [answer.question_en, answer.question_ar]) {
      const wanted = words(question).filter((w) => !STOP.has(w));
      if (!wanted.length) continue;
      const hits = wanted.filter((w) => asked.some((a) => same(a, w))).length;
      const part = hits / wanted.length;
      if (part >= 0.6 && hits / asked.length >= 0.5) score = Math.max(score, part);
    }
    for (const phrase of answer.keywords.split(/[,،\n]/)) {
      const wanted = words(phrase);
      if (wanted.length && wanted.every((w) => list.some((l) => same(l, w)))) {
        score = Math.max(score, 0.7 + wanted.length * 0.1);
      }
    }
    if (score && (!best || score > best.score)) best = { answer, score };
  }
  return best?.answer;
}

const real = (value: string | null) => (value && !value.includes("[") ? value : null);

export async function reply(
  message: string,
  siteLocale: "en" | "ar",
  before: ChatState,
): Promise<ChatReply> {
  const lang = isArabic(message) ? "ar" : /[a-z]/i.test(message) ? "en" : siteLocale;
  const [t, common, statusText, types, locations, properties, chat, home, site] = await Promise.all(
    [
      getTranslations({ locale: lang, namespace: "chat" }),
      getTranslations({ locale: lang, namespace: "common" }),
      getTranslations({ locale: lang, namespace: "status" }),
      getTypes(),
      getLocations(),
      getAllProperties(),
      getChat(),
      getHomeContent(),
      getSite(),
    ],
  );
  const data: Data = { types, locations, properties };
  const text = clean(message);
  const list = words(message);
  const content = list.filter((w) => !STOP.has(w));

  const wa = whatsappHref(site, t("waQuestion", { question: message.slice(0, 200) }));
  const contactLinks: ChatLink[] = [
    ...(wa ? [{ label: common("whatsappUs"), href: wa }] : []),
    { label: t("sendEnquiry"), href: "/contact" },
  ];
  const standard = [
    ...types
      .filter((type) => !type.coming_soon)
      .slice(0, 3)
      .map((type) => nameOf(type, lang)),
    t("askAreas"),
    t("askHow"),
    t("askContact"),
  ];
  const make = (part: Partial<ChatReply> & { text: string }): ChatReply => ({
    lang,
    properties: [],
    links: [],
    suggestions: standard,
    state: { wish: before.wish },
    ...part,
  });
  const price = (value: number) => common("price", { price: num(value) });
  const rentOf = (p: PropertyCard) =>
    p.rent_qar === null ? common("onRequest") : `${price(p.rent_qar)} ${common("perMonth")}`;

  const address = inLanguage(site.address, lang);
  const hours = inLanguage(site.hours, lang);
  const contactText = () =>
    [
      t("contactIntro"),
      site.whatsapp && `${common("whatsapp")}: ${ltr(site.whatsapp)}`,
      site.phone && `${t("phone")}: ${ltr(site.phone)}`,
      site.email && `${t("email")}: ${ltr(site.email)}`,
      address && `${t("address")}: ${address}`,
      hours && `${t("hours")}: ${hours}`,
    ]
      .filter(Boolean)
      .join("\n");
  const contact = () =>
    make({
      text: contactText(),
      links: [
        ...contactLinks,
        ...(site.phoneHref ? [{ label: common("callNow"), href: site.phoneHref }] : []),
        ...(site.officeLatLng
          ? [
              {
                label: common("directions"),
                href: `https://www.google.com/maps/dir/?api=1&destination=${site.officeLatLng.join(",")}`,
              },
            ]
          : []),
      ],
    });

  // 1. Small talk
  if (content.length <= 4 && content.length > 0) {
    const only = (known: Set<string>) => content.every((w) => known.has(w));
    if (only(HELLO)) return make({ text: t("hello") });
    if (only(THANKS)) return make({ text: t("thanks") });
    if (only(BYE)) return make({ text: t("bye") });
  }

  // 2. One property: by its code, or the one talked about
  const wish = parseWish(message, data);
  const named = findCode(message, properties);
  const follows =
    before.code &&
    !wish.type &&
    !wish.location &&
    !wish.sort &&
    wish.maxRent === undefined &&
    (THIS.test(text) ||
      WHERE.test(text) ||
      PRICE.test(text) ||
      DETAIL.test(text) ||
      wish.available ||
      wish.amenities);
  const code = named ?? (follows ? before.code : undefined);
  if (code) {
    const property = await getProperty(code);
    if (property) {
      const asked = findAmenities(list, properties);
      return about(property, asked);
    }
    if (named) return make({ text: t("unknownCode", { code: ltr(named) }), links: contactLinks });
  }

  // 3. The office's own answers
  const own = ownAnswer(list, chat.answers);
  if (own) {
    return make({ text: (lang === "ar" && own.answer_ar) || own.answer_en, links: contactLinks });
  }

  // 4. Questions about the company
  const asksType = Boolean(wish.type);
  const filters = Object.keys(wish).filter((key) => key !== "available");
  if (OWNER.test(text)) return make({ text: t("owner"), links: contactLinks });
  if (OFFICE.test(text) || HOURS.test(text)) return contact();
  if (TERMS.test(text)) return make({ text: t("terms"), links: contactLinks });
  if (!asksType && hasAny(list, SOCIAL)) {
    const links = [...site.social, ...site.portals].flatMap(({ name, href }) =>
      href ? [{ label: name, href }] : [],
    );
    return make({
      text: links.length ? t("social") : t("noSocial"),
      links: links.length ? links : contactLinks,
    });
  }
  if (!filters.length && hasAny(list, CONTACT)) return contact();

  // 5. Show more of the last search
  if (MORE.test(text) && before.wish && !asksType)
    return results(before.wish, (before.offset ?? 0) + SHOWN);

  // 6. Property search
  const place = wish.location ? undefined : otherPlace(message);
  if (!asksType && filters.length === 0 && !place) {
    if (COUNT.test(text))
      return make({
        text: t("total", { count: properties.length, n: num(properties.length) }),
        links: [{ label: t("seeAll"), href: "/properties" }],
      });
    if (hasAny(list, AREAS) && !PRICE.test(text)) return areas();
    if (HOW.test(text) && !PRICE.test(text) && !hasAny(list, set("available"))) return how();
    if (SERVICES.test(text)) return services();
  }
  if (ALL.test(text) && !filters.length) return results({}, 0);
  if (place && !filters.length) {
    return make({
      text: t("noPlace", {
        areas: locations.map((l) => nameOf(l, lang)).join(lang === "ar" ? "، " : ", "),
      }),
      links: contactLinks,
    });
  }
  if (filters.length) {
    // "under 20,000" or "in Al Khor" continues the last search; a full question starts a new one.
    const short = content.length <= 4 && !hasAny(list, NEW_SEARCH);
    const merged =
      ALSO.test(text) || (!asksType && short) ? { ...before.wish, ...wish } : { ...wish };
    const soon = types.find((type) => type.slug === merged.type && type.coming_soon);
    if (soon && !search(properties, { type: soon.slug }).length) {
      return make({
        text: t("soon", { name: nameOf(soon, lang) }),
        links: [
          { label: t("register"), href: `/contact?for=${soon.slug}` },
          ...contactLinks.slice(0, 1),
        ],
      });
    }
    return results(merged, 0, place);
  }
  if (PRICE.test(text) || hasAny(list, SEARCH) || wish.available) return results(wish, 0);
  if (HOW.test(text)) return how();

  return make({ text: t("unknown"), links: contactLinks, state: before });

  function about(property: PropertyDetail, asked: string[]): ChatReply {
    const separator = lang === "ar" ? "، " : ", ";
    const has = asked.filter((a) => property.amenities.includes(a));
    const name = (a: string) => amenityOf(a, lang);
    const facts = [
      property.rooms !== null && common("rooms", { count: property.rooms, n: num(property.rooms) }),
      property.capacity_persons !== null &&
        common("persons", { count: property.capacity_persons, n: num(property.capacity_persons) }),
      property.area_sqm !== null && common("sqm", { n: num(property.area_sqm) }),
      property.floors !== null && t("floors", { n: num(property.floors) }),
    ].filter(Boolean);
    const address = real(property.national_address);
    const description = (lang === "ar" && property.description_ar) || property.description_en;
    const lines = [
      asked.length > 0 &&
        (has.length
          ? t("hasAmenity", { name: has.map(name).join(separator) })
          : t("noAmenity", { name: asked.map(name)[0] })),
      `${titleOf(property, lang)} (${ltr(property.code)})`,
      `${t("status")}: ${statusText(property.status)}`,
      `${t("rent")}: ${rentOf(property)}`,
      `${t("area")}: ${nameOf(property.location, lang)}${address ? `${separator}${address}` : ""}`,
      facts.length > 0 && facts.join(" · "),
      property.amenities.length > 0 &&
        `${t("facilities")}: ${property.amenities.map(name).join(separator)}`,
      DETAIL.test(text) && description.slice(0, 350),
    ];
    const book = whatsappHref(site, common("waProperty", { code: property.code }));
    return make({
      text: lines.filter(Boolean).join("\n"),
      properties: [property],
      links: [
        ...(book ? [{ label: common("whatsappUs"), href: book }] : []),
        ...(property.lat !== null && property.lng !== null
          ? [
              {
                label: common("directions"),
                href: `https://www.google.com/maps/dir/?api=1&destination=${property.lat},${property.lng}`,
              },
            ]
          : []),
      ],
      suggestions: [
        t("askSimilar", { type: nameOf(property.type, lang) }),
        t("askHow"),
        t("askContact"),
      ],
      state: { code: property.code, wish: { type: property.type.slug } },
    });
  }

  function areas(): ChatReply {
    const lines = locations.map(
      (l) =>
        `• ${nameOf(l, lang)} – ${common("listings", { count: l.property_count, n: num(l.property_count) })}`,
    );
    return make({
      text: [t("areas"), ...lines].join("\n"),
      links: [{ label: t("openMap"), href: "/locations?map=1" }],
      suggestions: locations.slice(0, 5).map((l) => nameOf(l, lang)),
    });
  }

  function how(): ChatReply {
    const texts = homeTexts(home.content, lang);
    const lines = ([1, 2, 3] as const).map(
      (n) => `${n}. ${texts[`step${n}_title`]}: ${texts[`step${n}_text`]}`,
    );
    return make({ text: [texts.how_title, ...lines].join("\n"), links: contactLinks });
  }

  function services(): ChatReply {
    const lines = types.map((type) => {
      const note = (lang === "ar" && type.text_ar) || type.text_en;
      const count = type.coming_soon
        ? common("comingSoon")
        : common("units", { count: type.property_count, n: num(type.property_count) });
      return `• ${nameOf(type, lang)} (${count})${note ? ` – ${note}` : ""}`;
    });
    return make({ text: [t("services"), ...lines].join("\n") });
  }

  function results(query: Wish, offset: number, place?: string): ChatReply {
    const found = search([...properties], query);
    const type = types.find((item) => item.slug === query.type);
    const location = locations.find((item) => item.slug === query.location);
    const params = new URLSearchParams();
    if (type) params.set("type", type.slug);
    if (location) params.set("location", location.slug);
    if (query.sort === "cheap") params.set("sort", "price_asc");
    const all = { label: t("seeAll"), href: params.size ? `/properties?${params}` : "/properties" };
    const names = [type && nameOf(type, lang), location && nameOf(location, lang)]
      .filter(Boolean)
      .join(" · ");
    const state = { wish: query, offset };

    if (!found.length) {
      const near = closest([...properties], query);
      if (!near.length) return make({ text: t("none"), links: [all, ...contactLinks] });
      return make({
        text: t("closest"),
        properties: near.slice(0, SHOWN),
        links: [...contactLinks],
        state: { wish: { type: query.type, location: query.location } },
      });
    }
    const page = found.slice(offset, offset + SHOWN);
    if (!page.length) return make({ text: t("noMore"), links: [all, ...contactLinks], state });
    const rents = found.flatMap((p) => (p.rent_qar === null ? [] : [p.rent_qar]));
    const low = Math.min(...rents);
    const high = Math.max(...rents);
    const lines = [
      place && t("noPlaceShort"),
      COUNT.test(text) || offset === 0
        ? `${t("found", { count: found.length, n: num(found.length) })}${names ? ` (${names})` : ""}`
        : t("moreResults"),
      offset === 0 &&
        rents.length > 1 &&
        low !== high &&
        t("range", { low: price(low), high: price(high) }),
    ];
    const rest = found.length - offset - page.length;
    return make({
      text: lines.filter(Boolean).join("\n"),
      properties: page,
      links: found.length > page.length ? [all] : contactLinks.slice(0, 1),
      suggestions: [
        ...(rest > 0 ? [t("askMore")] : []),
        ...(query.sort !== "cheap" && found.length > 1 ? [t("askCheapest")] : []),
        ...(location ? [] : locations.slice(0, 3).map((l) => nameOf(l, lang))),
        t("askContact"),
      ],
      state,
    });
  }
}

export async function welcome(locale: "en" | "ar") {
  const [t, chat, types] = await Promise.all([
    getTranslations({ locale, namespace: "chat" }),
    getChat(),
    getTypes(),
  ]);
  return {
    enabled: chat.enabled,
    text: (locale === "ar" ? chat.welcome_ar : chat.welcome_en) || t("welcome"),
    suggestions: [
      ...types
        .filter((type) => !type.coming_soon)
        .slice(0, 3)
        .map((type) => nameOf(type, locale)),
      t("askAreas"),
      t("askHow"),
      t("askContact"),
    ],
  };
}
