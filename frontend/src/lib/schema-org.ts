import { nameOf, titleOf, amenityOf } from "./format";
import { absoluteUrl, shareImage, summary } from "./seo";
import { inLanguage, type Site } from "./site";
import type { PropertyDetail } from "./types";

const AGENT_ID = `${absoluteUrl("/")}#company`;

/** Placeholders such as "[HOURS]" must not reach search engines. */
const real = (value: string | null) => (value && !value.includes("[") ? value : undefined);

export function company(name: string, locale: string, site: Site) {
  return {
    "@type": "RealEstateAgent",
    "@id": AGENT_ID,
    name,
    url: absoluteUrl("/", locale),
    logo: absoluteUrl("/android-chrome-512x512.png"),
    image: absoluteUrl("/brand/og-image-1200x630.png"),
    telephone: real(site.phone),
    email: site.email ?? undefined,
    areaServed: { "@type": "Country", name: "Qatar" },
    address: {
      "@type": "PostalAddress",
      streetAddress: real(inLanguage(site.address, locale)),
      addressLocality: "Doha",
      addressCountry: "QA",
    },
    geo: site.officeLatLng
      ? { "@type": "GeoCoordinates", latitude: site.officeLatLng[0], longitude: site.officeLatLng[1] }
      : undefined,
    sameAs: [...site.social, ...site.portals].flatMap(({ href }) => href ?? []),
  };
}

export function listing(property: PropertyDetail, locale: string) {
  const url = absoluteUrl(`/properties/${property.code}`, locale);
  const title = titleOf(property, locale);
  const text = (locale === "ar" && property.description_ar) || property.description_en;
  const images = property.media.filter((m) => m.kind === "image").map((m) => m.url);
  return {
    "@type": "RealEstateListing",
    "@id": url,
    url,
    name: `${title} – ${nameOf(property.location, locale)}`,
    description: summary(text || title, 500),
    datePosted: property.published_at,
    inLanguage: locale,
    image: images.length
      ? images
      : [absoluteUrl(shareImage(property.code, property.cover_url))],
    provider: { "@id": AGENT_ID },
    offers: {
      "@type": "Offer",
      url,
      businessFunction: "http://purl.org/goodrelations/v1#LeaseOut",
      availability: `https://schema.org/${
        { available: "InStock", reserved: "LimitedAvailability", rented: "SoldOut" }[property.status]
      }`,
      ...(property.rent_qar !== null && {
        price: property.rent_qar,
        priceCurrency: "QAR",
        priceSpecification: {
          "@type": "UnitPriceSpecification",
          price: property.rent_qar,
          priceCurrency: "QAR",
          unitCode: "MON",
        },
      }),
    },
    mainEntity: {
      "@type": "Accommodation",
      name: title,
      identifier: property.code,
      additionalType: nameOf(property.type, locale),
      numberOfRooms: property.rooms ?? undefined,
      occupancy:
        property.capacity_persons !== null
          ? { "@type": "QuantitativeValue", maxValue: property.capacity_persons }
          : undefined,
      floorSize:
        property.area_sqm !== null
          ? { "@type": "QuantitativeValue", value: property.area_sqm, unitCode: "MTK" }
          : undefined,
      amenityFeature: property.amenities.map((name) => ({
        "@type": "LocationFeatureSpecification",
        name: amenityOf(name, locale),
        value: true,
      })),
      address: {
        "@type": "PostalAddress",
        streetAddress: real(property.national_address),
        addressLocality: nameOf(property.location, locale),
        addressCountry: "QA",
      },
      geo:
        property.lat !== null && property.lng !== null
          ? { "@type": "GeoCoordinates", latitude: property.lat, longitude: property.lng }
          : undefined,
    },
  };
}

export function breadcrumbs(items: { name: string; path: string }[], locale: string) {
  return {
    "@type": "BreadcrumbList",
    itemListElement: items.map(({ name, path }, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name,
      item: absoluteUrl(path, locale),
    })),
  };
}
