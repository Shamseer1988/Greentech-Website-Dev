import type { CompanyContent } from "./types";

// Company details come from the admin panel. Until they are saved there, the values from
// frontend/.env.local are used. Next.js needs each NEXT_PUBLIC_ name written out in full.
const digits = (value: string | undefined) => (value ?? "").replace(/\D/g, "");
const phone = (value: string | undefined) => (digits(value) ? `+${digits(value)}` : "");

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

function envCompany(): CompanyContent {
  const [lat, lng] = (process.env.NEXT_PUBLIC_OFFICE_LATLNG ?? "")
    .split(",")
    .map((part) => Number.parseFloat(part));
  const hasPoint = Number.isFinite(lat) && Number.isFinite(lng);
  const hours = process.env.NEXT_PUBLIC_OFFICE_HOURS;
  const links = (group: "social" | "portal", list: [string, string | undefined][]) =>
    list.flatMap(([name, url]) => (url ? [{ name, url, group }] : []));
  return {
    whatsapp: phone(process.env.NEXT_PUBLIC_WHATSAPP),
    phone: phone(process.env.NEXT_PUBLIC_PHONE),
    email: process.env.NEXT_PUBLIC_EMAIL || null,
    address_en: process.env.NEXT_PUBLIC_OFFICE_ADDRESS_EN || "",
    address_ar: process.env.NEXT_PUBLIC_OFFICE_ADDRESS_AR || "",
    hours_en: hours ? `Sat–Thu · ${hours}` : "",
    hours_ar: hours ? `السبت–الخميس · ${hours}` : "",
    cr_number: process.env.NEXT_PUBLIC_CR_NUMBER || "",
    lat: hasPoint ? lat : null,
    lng: hasPoint ? lng : null,
    links: [
      ...links("social", [
        ["Instagram", process.env.NEXT_PUBLIC_INSTAGRAM],
        ["Facebook", process.env.NEXT_PUBLIC_FACEBOOK],
        ["YouTube", process.env.NEXT_PUBLIC_YOUTUBE],
        ["TikTok", process.env.NEXT_PUBLIC_TIKTOK],
      ]),
      ...links("portal", [
        ["Property Finder Qatar", process.env.NEXT_PUBLIC_PROPERTY_FINDER],
        ["Qatar Living", process.env.NEXT_PUBLIC_QATAR_LIVING],
        ["Mzad Qatar", process.env.NEXT_PUBLIC_MZAD_QATAR],
      ]),
    ],
  };
}

export const companyContent = (saved: CompanyContent | null) => saved ?? envCompany();

export type Site = ReturnType<typeof buildSite>;

/** Empty details are null, so a page shows only what is known. */
export function buildSite(saved: CompanyContent | null) {
  const c = companyContent(saved);
  const list = (group: "social" | "portal") =>
    c.links.filter((l) => l.group === group).map(({ name, url }) => ({ name, href: url }));
  return {
    whatsapp: c.whatsapp || null,
    phone: c.phone || null,
    phoneHref: c.phone ? `tel:${c.phone}` : null,
    email: c.email || null,
    address: { en: c.address_en || null, ar: c.address_ar || c.address_en || null },
    hours: { en: c.hours_en || null, ar: c.hours_ar || c.hours_en || null },
    crNumber: c.cr_number || null,
    officeLatLng: c.lat !== null && c.lng !== null ? ([c.lat, c.lng] as [number, number]) : null,
    social: list("social"),
    portals: list("portal"),
  };
}

/** "ar" or "en" part of a detail. */
export const inLanguage = <T>(value: { en: T; ar: T }, locale: string): T =>
  locale === "ar" ? value.ar : value.en;

/** wa.me link, or null until the WhatsApp number is set. */
export function whatsappHref(site: Site, text?: string): string | null {
  if (!site.whatsapp) return null;
  const number = digits(site.whatsapp);
  return `https://wa.me/${number}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
}

export function directionsHref(lat: number, lng: number): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
}
