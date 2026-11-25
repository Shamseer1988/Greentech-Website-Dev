import { Check, MapPin as PinIcon } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { cn } from "cn";
import { PropertyView } from "@/components/counter";
import { EnquiryForm } from "@/components/forms/enquiry-form";
import { ViewingBooking } from "@/components/forms/viewing-booking";
import { JsonLd } from "@/components/json-ld";
import { MapView } from "@/components/maps/map";
import { BrochureLink } from "@/components/property/brochure-link";
import { Gallery } from "@/components/property/gallery";
import { Price } from "@/components/property/price";
import { SaveButtons } from "@/components/property/save-buttons";
import { Share } from "@/components/property/share";
import { buttonVariants } from "@/components/ui/button";
import { WhatsAppIcon, WhatsAppLink } from "@/components/whatsapp-link";
import { Link } from "@/i18n/navigation";
import { getProperty, getSite } from "@/lib/api";
import { amenityOf, ltr, nameOf, num, specs, titleOf } from "@/lib/format";
import { breadcrumbs, listing } from "@/lib/schema-org";
import { pageMetadata, shareImage, summary } from "@/lib/seo";
import { directionsHref } from "@/lib/site";

type Props = { params: Promise<{ code: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const property = await getProperty((await params).code);
  if (!property) return {};
  const locale = await getLocale();
  const brand = await getTranslations("brand");
  const common = await getTranslations("common");
  const title = `${titleOf(property, locale)} – ${nameOf(property.location, locale)}`;
  const facts = [
    common("code", { code: property.code }),
    property.rent_qar === null
      ? common("onRequest")
      : `${common("price", { price: num(property.rent_qar) })} ${common("perMonth")}`,
    ...specs(property, common, locale),
  ];
  const text = (locale === "ar" && property.description_ar) || property.description_en;
  return pageMetadata({
    locale,
    path: `/properties/${property.code}`,
    title,
    description: summary(`${facts.join(" · ")}. ${text}`),
    siteName: brand("name"),
    image: shareImage(property.code, property.cover_url),
  });
}

const CARD = "flex flex-col gap-4 rounded-2xl border border-line bg-white p-6";

export default async function PropertyPage({ params }: Props) {
  const property = await getProperty((await params).code);
  if (!property) notFound();

  const t = await getTranslations("detail");
  const nav = await getTranslations("nav");
  const common = await getTranslations("common");
  const site = await getSite();
  const status = await getTranslations("status");
  const locale = await getLocale();
  const title = titleOf(property, locale);
  const area = nameOf(property.location, locale);
  const type = nameOf(property.type, locale);
  const description = (locale === "ar" && property.description_ar) || property.description_en;

  const facts = [
    property.rooms !== null && [t("rooms"), num(property.rooms)],
    property.capacity_persons !== null && [
      t("capacity"),
      t("personsValue", { n: num(property.capacity_persons) }),
    ],
    property.area_sqm !== null && [t("area"), common("sqm", { n: num(property.area_sqm) })],
    property.floors !== null && [t("floors"), num(property.floors)],
  ].filter((fact): fact is string[] => Boolean(fact));

  return (
    <>
      <PropertyView code={property.code} />
      <JsonLd data={listing(property, locale)} />
      <JsonLd
        data={breadcrumbs(
          [
            { name: nav("home"), path: "/" },
            { name: type, path: `/properties?type=${property.type.slug}` },
            { name: title, path: `/properties/${property.code}` },
          ],
          locale,
        )}
      />
      <nav
        aria-label={t("breadcrumb")}
        className="no-print container-page max-w-[1240px] pt-5 text-sm text-muted-foreground"
      >
        <ol className="flex flex-wrap gap-x-2">
          <li>
            <Link href="/" className="text-green-700 hover:underline">
              {nav("home")}
            </Link>{" "}
            /
          </li>
          <li>
            <Link
              href={`/properties?type=${property.type.slug}`}
              className="text-green-700 hover:underline"
            >
              {type}
            </Link>{" "}
            /
          </li>
          <li>
            <Link
              href={`/properties?location=${property.location.slug}`}
              className="text-green-700 hover:underline"
            >
              {area}
            </Link>
          </li>
        </ol>
      </nav>

      <section className="container-page flex max-w-[1240px] flex-wrap items-end justify-between gap-4 py-4">
        <div className="flex min-w-0 flex-col gap-2">
          <div className="flex flex-wrap gap-2 text-[13px]">
            <span className="rounded-full bg-tint px-3 py-1 font-semibold text-green-700">
              {type}
            </span>
            <span
              className={cn(
                "rounded-full px-3 py-1 font-semibold",
                property.status === "available" ? "bg-mint text-deep" : "bg-rose text-white",
              )}
            >
              {status(property.status)}
            </span>
            <span className="rounded-full border border-field bg-white px-3 py-1">
              {common("code", { code: property.code })}
            </span>
          </div>
          <h1 className="text-3xl leading-tight font-bold text-slate lg:text-[40px]">
            {title} – {area}
          </h1>
          {property.national_address && (
            <span className="text-muted-foreground">
              <bdi>{property.national_address}</bdi>
            </span>
          )}
        </div>
        <div className="flex flex-col gap-1 sm:items-end">
          <span className="text-sm text-muted-foreground">{t("rent")}</span>
          <Price value={property.rent_qar} className="font-heading text-3xl lg:text-[34px]" />
        </div>
      </section>

      <section className="container-page max-w-[1240px] pt-2 pb-6">
        <Gallery media={property.media} title={title} />
      </section>

      <section className="container-page flex max-w-[1240px] flex-col items-start gap-8 pt-2 pb-16 lg:flex-row">
        <div className="flex w-full min-w-0 flex-1 flex-col gap-7">
          {facts.length > 0 && (
            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {facts.map(([name, value]) => (
                <div
                  key={name}
                  className="flex flex-col gap-1 rounded-xl border border-line bg-white p-4"
                >
                  <dt className="text-[13px] text-muted-foreground">{name}</dt>
                  <dd className="font-heading text-xl font-semibold text-slate">{value}</dd>
                </div>
              ))}
            </dl>
          )}

          {description && (
            <div className={CARD}>
              <h2 className="text-2xl font-bold text-slate">{t("about")}</h2>
              <p dir="auto" className="leading-[1.7] whitespace-pre-line">
                {description}
              </p>
            </div>
          )}

          {property.amenities.length > 0 && (
            <div className={CARD}>
              <h2 className="text-2xl font-bold text-slate">{t("facilities")}</h2>
              <ul className="grid gap-3 sm:grid-cols-2">
                {property.amenities.map((name) => (
                  <li key={name} className="flex items-center gap-2.5 text-[15px]">
                    <Check className="size-4.5 shrink-0 text-green-700" aria-hidden="true" />
                    {amenityOf(name, locale)}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {property.lat !== null && property.lng !== null && (
            <div className={CARD}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-2xl font-bold text-slate">{t("location")}</h2>
                <a
                  href={directionsHref(property.lat, property.lng)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(buttonVariants({ size: "sm" }), "no-print")}
                >
                  <PinIcon />
                  {t("directions")}
                </a>
              </div>
              <div className="relative isolate h-80 overflow-hidden rounded-xl">
                <MapView
                  pins={[
                    {
                      id: property.code,
                      lat: property.lat,
                      lng: property.lng,
                      label: property.code,
                    },
                  ]}
                />
              </div>
              {property.national_address && (
                <span className="text-sm text-muted-foreground">
                  {t("address", { address: property.national_address })}
                </span>
              )}
            </div>
          )}
        </div>

        <aside className="flex w-full flex-col gap-4 lg:w-[380px] lg:flex-none">
          <div className={cn(CARD, "no-print shadow-[0_12px_32px_rgb(19_32_27/.08)]")} id="enquire">
            <h2 className="text-[22px] font-bold text-slate">{t("enquire")}</h2>
            {property.status === "rented" && (
              <p className="rounded-xl bg-rose-tint p-4 text-rose-700">{t("rented")}</p>
            )}
            {property.status !== "rented" && <ViewingBooking code={property.code} title={title} />}
            <EnquiryForm kind="property" code={property.code} />
            <div className="flex items-center gap-2.5 text-[13px] text-muted-foreground before:h-px before:flex-1 before:bg-line after:h-px after:flex-1 after:bg-line">
              {t("or")}
            </div>
            <WhatsAppLink
              text={common("waProperty", { code: property.code })}
              className={buttonVariants({ variant: "whatsapp" })}
            >
              <WhatsAppIcon />
              {t("waAbout", { code: property.code })}
            </WhatsAppLink>
            {site.phone && site.phoneHref ? (
              <a href={site.phoneHref} className={buttonVariants({ variant: "outline" })}>
                {common("call", { phone: ltr(site.phone) })}
              </a>
            ) : (
              <span className={cn(buttonVariants({ variant: "outline" }), "pointer-events-none")}>
                {common("callNow")}
              </span>
            )}
          </div>
          <div className="no-print flex flex-col gap-2.5 rounded-2xl border border-line bg-white p-4.5">
            <SaveButtons code={property.code} wide />
            <BrochureLink code={property.code} />
          </div>
          <Share title={`${title} – ${property.code}`} />
        </aside>
      </section>
    </>
  );
}
