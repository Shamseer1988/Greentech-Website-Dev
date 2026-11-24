// Company details. Set them in frontend/.env.local (see .env.example).
// Next.js needs each NEXT_PUBLIC_ name written out in full.
const digits = (value: string | undefined) => (value ?? "").replace(/\D/g, "");

const whatsapp = digits(process.env.NEXT_PUBLIC_WHATSAPP);
const phone = digits(process.env.NEXT_PUBLIC_PHONE);

function parseLatLng(value: string | undefined): [number, number] | null {
  const [lat, lng] = (value ?? "").split(",").map((part) => Number.parseFloat(part));
  return Number.isFinite(lat) && Number.isFinite(lng) ? [lat, lng] : null;
}

export const site = {
  url: process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
  hasWhatsapp: Boolean(whatsapp),
  whatsapp: whatsapp ? `+${whatsapp}` : "+974 [NUMBER]",
  phone: phone ? `+${phone}` : "+974 [PHONE]",
  phoneHref: phone ? `tel:+${phone}` : null,
  email: process.env.NEXT_PUBLIC_EMAIL || null,
  addressEn: process.env.NEXT_PUBLIC_OFFICE_ADDRESS_EN || "[Office address], Doha, Qatar",
  addressAr: process.env.NEXT_PUBLIC_OFFICE_ADDRESS_AR || "[عنوان المكتب]، الدوحة، قطر",
  hours: process.env.NEXT_PUBLIC_OFFICE_HOURS || "[HOURS]",
  officeLatLng: parseLatLng(process.env.NEXT_PUBLIC_OFFICE_LATLNG),
  crNumber: process.env.NEXT_PUBLIC_CR_NUMBER || "[CR NUMBER]",
  social: [
    { name: "Instagram", href: process.env.NEXT_PUBLIC_INSTAGRAM || null },
    { name: "Facebook", href: process.env.NEXT_PUBLIC_FACEBOOK || null },
    { name: "YouTube", href: process.env.NEXT_PUBLIC_YOUTUBE || null },
    { name: "TikTok", href: process.env.NEXT_PUBLIC_TIKTOK || null },
  ],
  portals: [
    { name: "Property Finder Qatar", href: process.env.NEXT_PUBLIC_PROPERTY_FINDER || null },
    { name: "Qatar Living", href: process.env.NEXT_PUBLIC_QATAR_LIVING || null },
    { name: "Mzad Qatar", href: process.env.NEXT_PUBLIC_MZAD_QATAR || null },
  ],
};

/** wa.me link, or null until the WhatsApp number is set. */
export function whatsappHref(text?: string): string | null {
  if (!whatsapp) return null;
  return `https://wa.me/${whatsapp}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
}

export function directionsHref(lat: number, lng: number): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
}
