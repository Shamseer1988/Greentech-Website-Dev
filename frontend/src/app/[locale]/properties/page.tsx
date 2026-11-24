import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { cn } from "cn";
import { MapView, type MapPin } from "@/components/maps/map";
import { ListingFilters } from "@/components/property/listing-filters";
import { PropertyCard } from "@/components/property/property-card";
import { buttonVariants } from "@/components/ui/button";
import { WhatsAppIcon, WhatsAppLink } from "@/components/whatsapp-link";
import { Link } from "@/i18n/navigation";
import { allForMap, getLocations, getTypes, searchProperties } from "@/lib/api";
import { nameOf, num } from "@/lib/format";
import { apiParams, listingHref, parseListingQuery, type ListingQuery } from "@/lib/listing-query";
import { whatsappHref } from "@/lib/site";
import type { PropertyCard as Property } from "@/lib/types";

const PAGE_SIZE = "12";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("meta");
  return { title: t("properties"), description: t("description") };
}

export default async function PropertiesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = parseListingQuery(await searchParams);
  const t = await getTranslations("listings");
  const common = await getTranslations("common");
  const locale = await getLocale();

  const params = apiParams(query);
  const listParams = new URLSearchParams(params);
  listParams.set("page", String(query.page));
  listParams.set("page_size", PAGE_SIZE);
  const [types, locations, result, everything] = await Promise.all([
    getTypes(),
    getLocations(),
    searchProperties(listParams),
    allForMap(params),
  ]);

  const type = types.find((item) => item.slug === query.type);
  const heading = type ? nameOf(type, locale) : t("title");
  const pins = everything.flatMap((property) => toPin(property, locale));

  return (
    <>
      <ListingFilters query={query} types={types} locations={locations} />
      <section className="container-page flex max-w-[1360px] flex-col items-start gap-6 py-6 lg:flex-row">
        <div className="flex w-full min-w-0 flex-1 flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h1 className="text-2xl font-semibold text-slate">{heading}</h1>
            <span role="status" className="text-sm text-muted-foreground">
              {t("showing", { total: result.total, n: num(result.total) })}
            </span>
          </div>
          {result.items.length ? (
            <div className="grid gap-5 sm:grid-cols-2">
              {result.items.map((property) => (
                <PropertyCard key={property.code} property={property} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4 rounded-2xl border border-line bg-white px-6 py-16 text-center">
              <h2 className="text-xl font-semibold text-slate">{t("emptyTitle")}</h2>
              <p className="text-muted-foreground">{t("emptyText")}</p>
              <Link href="/properties" className={buttonVariants({ variant: "outline" })}>
                {t("clear")}
              </Link>
            </div>
          )}
          <Pagination query={query} pages={result.pages} />
        </div>

        <aside className="flex w-full flex-col gap-3 lg:sticky lg:top-6 lg:w-[400px] lg:flex-none">
          <div className="relative isolate h-90 overflow-hidden rounded-2xl border border-[#d6ded7] lg:h-[min(640px,calc(100svh-110px))]">
            <MapView pins={pins} />
            <span className="absolute end-3.5 top-3.5 z-10 rounded-md bg-white px-3 py-2 text-[13px] font-semibold shadow">
              {t("mapTitle")}
            </span>
          </div>
          <WhatsAppLink
            text={common("waGeneral")}
            className={cn(buttonVariants({ variant: "whatsapp" }), "py-3 whitespace-normal")}
          >
            <WhatsAppIcon />
            {whatsappHref() ? t("ask") : t("askForm")}
          </WhatsAppLink>
        </aside>
      </section>
    </>
  );
}

function toPin(property: Property, locale: string): MapPin[] {
  if (property.lat === null || property.lng === null) return [];
  return [
    {
      id: property.code,
      lat: property.lat,
      lng: property.lng,
      label: property.code,
      href: `/properties/${property.code}`,
      area: {
        slug: property.location.slug,
        name: nameOf(property.location, locale),
        lat: property.location.lat,
        lng: property.location.lng,
      },
    },
  ];
}

async function Pagination({ query, pages }: { query: ListingQuery; pages: number }) {
  if (pages < 2) return null;
  const t = await getTranslations("listings");
  const near = Array.from({ length: pages }, (_, i) => i + 1).filter(
    (page) => page === 1 || page === pages || Math.abs(page - query.page) <= 1,
  );
  const box = "flex h-11 min-w-11 items-center justify-center rounded-md border px-3";
  return (
    <nav aria-label={t("pages")} className="flex flex-wrap justify-center gap-2 py-4">
      {query.page > 1 && (
        <Link
          href={listingHref({ ...query, page: query.page - 1 })}
          className={cn(box, "border-field bg-white")}
        >
          {t("previous")}
        </Link>
      )}
      {near.map((page, i) => (
        <span key={page} className="flex items-center gap-2">
          {i > 0 && page - near[i - 1] > 1 && <span aria-hidden="true">…</span>}
          <Link
            href={listingHref({ ...query, page })}
            aria-label={t("page", { page: num(page) })}
            aria-current={page === query.page ? "page" : undefined}
            className={cn(
              box,
              page === query.page
                ? "border-green-700 bg-green-700 text-white"
                : "border-field bg-white",
            )}
          >
            {page}
          </Link>
        </span>
      ))}
      {query.page < pages && (
        <Link
          href={listingHref({ ...query, page: query.page + 1 })}
          className={cn(box, "border-field bg-white")}
        >
          {t("next")}
        </Link>
      )}
    </nav>
  );
}
