import { Clock, Mail, MapPin, Navigation, Phone } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { cn } from "cn";
import { buttonVariants } from "@/components/ui/button";
import { getSite } from "@/lib/api";
import { directionsHref, inLanguage } from "@/lib/site";

/** Footer: the office on Google Maps, with address, hours and contact. */
export async function OfficeCard({ className }: { className?: string }) {
  const t = await getTranslations("footer");
  const common = await getTranslations("common");
  const brand = await getTranslations("brand");
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
        "grid overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-[0_24px_60px_rgb(0_0_0/.35)] sm:grid-cols-2",
        className,
      )}
    >
      {point && (
        <div className="relative min-h-60 bg-deep">
          <iframe
            title={t("map")}
            src={`https://maps.google.com/maps?q=${point.join(",")}&z=15&hl=${locale}&output=embed`}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            className="absolute inset-0 size-full border-0"
          />
        </div>
      )}
      <div className={cn("flex flex-col gap-3.5 p-6", !point && "sm:col-span-2")}>
        <div>
          <span className="eyebrow text-mint">{t("office")}</span>
          <h2 className="mt-1 text-lg leading-snug font-semibold text-white">{brand("name")}</h2>
        </div>
        {address && <Row icon={<MapPin />}>{address}</Row>}
        {hours && <Row icon={<Clock />}>{hours}</Row>}
        {site.phone && site.phoneHref && (
          <Row icon={<Phone />}>
            <a href={site.phoneHref} className="hover:text-white">
              <bdi dir="ltr">{site.phone}</bdi>
            </a>
          </Row>
        )}
        {site.email && (
          <Row icon={<Mail />}>
            <a href={`mailto:${site.email}`} className="[overflow-wrap:anywhere] hover:text-white">
              {site.email}
            </a>
          </Row>
        )}
        {point && (
          <a
            href={directionsHref(...point)}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(buttonVariants({ variant: "mint", size: "sm" }), "mt-auto self-start")}
          >
            <Navigation />
            {common("directions")}
          </a>
        )}
      </div>
    </section>
  );
}

function Row({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <div className="flex items-center gap-3 leading-relaxed">
      <span className="flex size-9 flex-none items-center justify-center rounded-xl bg-mint/12 text-mint [&_svg]:size-4.5">
        {icon}
      </span>
      <span className="min-w-0">{children}</span>
    </div>
  );
}
