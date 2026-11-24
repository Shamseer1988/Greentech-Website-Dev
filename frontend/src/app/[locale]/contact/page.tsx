import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { cn } from "cn";
import { EnquiryForm } from "@/components/forms/enquiry-form";
import { MapView } from "@/components/maps/map";
import { buttonVariants } from "@/components/ui/button";
import { WhatsAppIcon, WhatsAppLink } from "@/components/whatsapp-link";
import { getLocations } from "@/lib/api";
import { ltr } from "@/lib/format";
import { directionsHref, site } from "@/lib/site";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("meta");
  return { title: t("contact"), description: t("description") };
}

type Props = { searchParams: Promise<{ for?: string | string[] }> };

const CARD = "flex flex-col gap-2.5 rounded-2xl border border-line bg-white p-5.5 text-[15px]";
const CELL = "flex min-h-12 items-center rounded-md border border-field px-3 text-sm font-semibold";

export default async function ContactPage({ searchParams }: Props) {
  const t = await getTranslations("contact");
  const common = await getTranslations("common");
  const brand = await getTranslations("brand");
  const locale = await getLocale();
  const locations = await getLocations();
  const lookingFor = (await searchParams).for;

  return (
    <div className="container-page max-w-[1240px]">
      <section className="pt-14 pb-6">
        <h1 className="mb-2.5 text-4xl font-bold text-slate lg:text-5xl">{t("title")}</h1>
        <p className="text-lg text-muted-foreground">{t("text")}</p>
      </section>

      <section className="flex flex-col items-start gap-6 pt-4 pb-8 lg:flex-row">
        <div className="w-full min-w-0 flex-1 rounded-[20px] border border-line bg-white p-6 lg:p-7">
          <EnquiryForm
            kind="contact"
            locations={locations.map(({ slug, name_en, name_ar }) => ({ slug, name_en, name_ar }))}
            lookingFor={lookingFor === "residential" ? "residential" : undefined}
          />
        </div>

        <aside className="flex w-full flex-col gap-4 lg:w-[380px] lg:flex-none">
          {site.hasWhatsapp && (
            <WhatsAppLink
              text={common("waGeneral")}
              className="flex items-center gap-3.5 rounded-2xl bg-whatsapp p-5.5 text-white transition-colors hover:bg-[#12703c]"
            >
              <WhatsAppIcon className="size-9" />
              <span className="flex flex-col">
                <span className="text-lg font-bold">{common("whatsappUs")}</span>
                <span>
                  <bdi dir="ltr">{site.whatsapp}</bdi> · {t("quick")}
                </span>
              </span>
            </WhatsAppLink>
          )}
          <div className={CARD}>
            <h2 className="text-[19px] font-semibold text-slate">{t("office")}</h2>
            <span>{brand("name")}</span>
            <span className="text-muted-foreground">
              {locale === "ar" ? site.addressAr : site.addressEn}
            </span>
            {site.phoneHref ? (
              <a href={site.phoneHref}>{t("phone", { phone: ltr(site.phone) })}</a>
            ) : (
              <span>{t("phone", { phone: ltr(site.phone) })}</span>
            )}
            {site.email && (
              <a href={`mailto:${site.email}`} className="text-green-700">
                {t("email", { email: site.email })}
              </a>
            )}
            <span className="text-muted-foreground">{t("hours", { hours: site.hours })}</span>
          </div>
          <div className={CARD}>
            <h2 className="text-[19px] font-semibold text-slate">{t("follow")}</h2>
            <div className="grid grid-cols-2 gap-2">
              {[...site.social, ...site.portals.slice(0, 2)].map(({ name, href }) =>
                href ? (
                  <a
                    key={name}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(CELL, "text-green-700 hover:bg-tint")}
                  >
                    {name}
                  </a>
                ) : (
                  <span key={name} className={cn(CELL, "text-muted-foreground")}>
                    {name}
                  </span>
                ),
              )}
            </div>
          </div>
        </aside>
      </section>

      {site.officeLatLng && (
        <section className="pb-18">
          <div className="relative isolate h-80 overflow-hidden rounded-[20px] border border-[#d6ded7]">
            <MapView
              pins={[
                {
                  id: "office",
                  lat: site.officeLatLng[0],
                  lng: site.officeLatLng[1],
                  label: t("officePin"),
                },
              ]}
            />
            <a
              href={directionsHref(...site.officeLatLng)}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                buttonVariants({ variant: "white", size: "sm" }),
                "absolute end-4 bottom-8 z-10 shadow",
              )}
            >
              {t("openMaps")}
            </a>
          </div>
        </section>
      )}
    </div>
  );
}
