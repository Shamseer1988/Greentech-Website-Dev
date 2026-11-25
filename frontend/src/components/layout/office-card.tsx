import { Clock, Mail, MapPin, Navigation, Phone } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { cn } from "cn";
import { getSite } from "@/lib/api";
import { directionsHref, inLanguage } from "@/lib/site";

/** Footer: the office on Google Maps, with address, hours and contact. */
export async function OfficeCard({ className }: { className?: string }) {
  const t = await getTranslations("footer");
  const common = await getTranslations("common");
  const locale = await getLocale();
  const site = await getSite();
  const address = inLanguage(site.address, locale);
  const hours = inLanguage(site.hours, locale);
  const point = site.officeLatLng;
  if (!point && !address) return null;

  return (
    <section
      aria-label={t("office")}
      className={cn(
        "grid overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-[0_24px_60px_rgb(0_0_0/.35)] sm:grid-cols-2 xl:min-h-58 xl:grid-cols-[250px_1fr]",
        className,
      )}
    >
      {point && (
        <div className="relative min-h-60 bg-deep xl:min-h-0">
          <iframe
            title={t("map")}
            src={`https://maps.google.com/maps?q=${point.join(",")}&z=15&hl=${locale}&output=embed`}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            className="absolute inset-0 size-full border-0"
          />
        </div>
      )}
      <div className={cn("flex flex-col justify-center gap-3 p-5", !point && "sm:col-span-2")}>
        <div className="flex items-center justify-between gap-3">
          <h2 className="eyebrow text-mint">{t("office")}</h2>
          {point && (
            <a
              href={directionsHref(...point)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-10 items-center gap-2 rounded-full bg-mint px-4 text-[13px] font-semibold text-deep transition-colors hover:bg-mint/85"
            >
              <Navigation className="size-4" />
              {common("directions")}
            </a>
          )}
        </div>
        {address && <Row icon={<MapPin />}>{address}</Row>}
        {hours && <Row icon={<Clock />}>{hours}</Row>}
        <div className="flex flex-wrap gap-x-5 gap-y-3">
          {site.phone && site.phoneHref && (
            <Row icon={<Phone />}>
              <a href={site.phoneHref} className="hover:text-white">
                <bdi dir="ltr">{site.phone}</bdi>
              </a>
            </Row>
          )}
          {site.email && (
            <Row icon={<Mail />}>
              <a
                href={`mailto:${site.email}`}
                className="[overflow-wrap:anywhere] hover:text-white"
              >
                {site.email}
              </a>
            </Row>
          )}
        </div>
      </div>
    </section>
  );
}

function Row({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <div className="flex min-w-0 items-center gap-2.5 text-[13px] leading-snug">
      <span className="flex size-8.5 flex-none items-center justify-center rounded-lg bg-mint/12 text-mint [&_svg]:size-4">
        {icon}
      </span>
      <span className="min-w-0">{children}</span>
    </div>
  );
}
