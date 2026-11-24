import { useLocale, useTranslations } from "next-intl";
import { cn } from "cn";
import { WhatsAppLink } from "@/components/whatsapp-link";
import { Link } from "@/i18n/navigation";
import { nameOf, num, specs, titleOf } from "@/lib/format";
import { directionsHref } from "@/lib/site";
import type { PropertyCard as Property } from "@/lib/types";
import { Price } from "./price";
import { PropertyPhoto } from "./property-photo";

const ACTION =
  "relative z-10 inline-flex min-h-11 items-center rounded-md border px-3 text-[13px] font-semibold transition-colors";

export function PropertyCard({ property }: { property: Property }) {
  const t = useTranslations("common");
  const status = useTranslations("status");
  const locale = useLocale();

  return (
    <article className="relative flex flex-col overflow-hidden rounded-2xl border border-line bg-white transition duration-300 hover:-translate-y-1 hover:shadow-[0_18px_40px_rgb(4_29_21/.14)]">
      <div className="relative h-48">
        <PropertyPhoto property={property} sizes="(min-width: 1280px) 420px, (min-width: 640px) 50vw, 100vw" />
        <span className="absolute start-3 top-3 rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-green-700">
          {nameOf(property.type, locale)}
        </span>
        {property.status !== "available" && (
          <span className="absolute end-3 top-3 rounded-full bg-rose px-2.5 py-1 text-xs font-semibold text-white">
            {status(property.status)}
          </span>
        )}
        <span className="absolute start-3 bottom-3 rounded-md bg-deep/85 px-2 py-1 text-xs text-white">
          {t("code", { code: property.code })}
        </span>
        {property.photo_count > 0 && (
          <span className="absolute end-3 bottom-3 rounded-md bg-deep/85 px-2 py-1 text-xs text-white">
            {t("photos", { count: property.photo_count, n: num(property.photo_count) })}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="text-lg font-semibold text-slate">
          <Link
            href={`/properties/${property.code}`}
            className="after:absolute after:inset-0 hover:text-green-700"
          >
            {titleOf(property, locale)}
          </Link>
        </h3>
        <span className="text-sm text-muted-foreground">{nameOf(property.location, locale)}</span>
        <div className="flex flex-wrap gap-x-3.5 gap-y-1 text-[13px]">
          {specs(property, t, locale).map((fact) => (
            <span key={fact}>{fact}</span>
          ))}
        </div>
        <div className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-[#eef1ee] pt-3">
          <Price value={property.rent_qar} />
          <span className="flex gap-2">
            <WhatsAppLink
              text={t("waProperty", { code: property.code })}
              className={cn(ACTION, "border-[#bfe0cc] text-whatsapp hover:bg-tint")}
            >
              {t("whatsapp")}
            </WhatsAppLink>
            {property.lat !== null && property.lng !== null && (
              <a
                href={directionsHref(property.lat, property.lng)}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(ACTION, "border-field text-green-700 hover:bg-tint")}
              >
                {t("map")}
              </a>
            )}
          </span>
        </div>
      </div>
    </article>
  );
}
