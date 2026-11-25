import { Check, Minus } from "lucide-react";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { CompareRemove } from "@/components/property/compare-remove";
import { Price } from "@/components/property/price";
import { PropertyPhoto } from "@/components/property/property-photo";
import { buttonVariants } from "@/components/ui/button";
import { WhatsAppLink } from "@/components/whatsapp-link";
import { Link } from "@/i18n/navigation";
import { getPropertyCards } from "@/lib/api";
import { amenityOf, nameOf, num, titleOf } from "@/lib/format";
import { pageMetadata } from "@/lib/seo";
import type { PropertyCard } from "@/lib/types";

type Props = { searchParams: Promise<{ codes?: string | string[] }> };

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("saved");
  const brand = await getTranslations("brand");
  return pageMetadata({
    locale: await getLocale(),
    path: "/compare",
    title: t("compareTitle"),
    description: t("compareText"),
    siteName: brand("name"),
    hidden: true,
  });
}

export default async function ComparePage({ searchParams }: Props) {
  const t = await getTranslations("saved");
  const common = await getTranslations("common");
  const detail = await getTranslations("detail");
  const status = await getTranslations("status");
  const locale = await getLocale();
  const asked = [(await searchParams).codes].flat().join(",");
  const codes =
    asked
      .toUpperCase()
      .match(/[A-Z0-9-]{2,20}/g)
      ?.slice(0, 4) ?? [];
  const items = codes.length ? await getPropertyCards(codes) : [];

  const perPerson = (p: PropertyCard) =>
    p.rent_qar !== null && p.capacity_persons ? p.rent_qar / p.capacity_persons : null;
  const perMetre = (p: PropertyCard) =>
    p.rent_qar !== null && p.area_sqm ? p.rent_qar / p.area_sqm : null;
  const money = (value: number) => common("price", { price: num(value) });
  type Row = {
    label: string;
    value: (p: PropertyCard) => number | null;
    show: (n: number) => string;
    best: "low" | "high";
  };
  const rows: Row[] = [
    { label: detail("rent"), value: (p) => p.rent_qar, show: money, best: "low" },
    { label: t("perPerson"), value: perPerson, show: money, best: "low" },
    { label: t("perMetre"), value: perMetre, show: money, best: "low" },
    { label: detail("rooms"), value: (p) => p.rooms, show: num, best: "high" },
    {
      label: detail("capacity"),
      value: (p) => p.capacity_persons,
      show: (n) => detail("personsValue", { n: num(n) }),
      best: "high",
    },
    {
      label: detail("area"),
      value: (p) => p.area_sqm,
      show: (n) => common("sqm", { n: num(n) }),
      best: "high",
    },
    { label: detail("floors"), value: (p) => p.floors, show: num, best: "high" },
  ];
  const shown = rows.filter((row) => items.some((p) => row.value(p) !== null));
  const amenities = [...new Set(items.flatMap((p) => p.amenities))];

  function isBest(row: Row, p: PropertyCard): boolean {
    const values = items.flatMap((item) => row.value(item) ?? []);
    const value = row.value(p);
    if (value === null || values.length < 2 || row.label === detail("floors")) return false;
    const best = row.best === "low" ? Math.min(...values) : Math.max(...values);
    return value === best && values.some((v) => v !== best);
  }

  return (
    <div className="container-page max-w-[1240px] pt-12 pb-24">
      <h1 className="mb-2 text-4xl font-bold text-slate lg:text-5xl">{t("compareTitle")}</h1>
      <p className="mb-8 text-lg text-muted-foreground">{t("compareText")}</p>
      {items.length === 0 ? (
        <Link href="/properties" className={buttonVariants()}>
          {t("browse")}
        </Link>
      ) : (
        <div
          className="overflow-x-auto rounded-2xl border border-line bg-white"
          tabIndex={0}
          role="region"
          aria-label={t("compareTitle")}
        >
          <table
            className="w-full border-collapse text-start text-sm"
            style={{ minWidth: 150 + items.length * 210 }}
          >
            <thead>
              <tr>
                <th className="sticky start-0 z-10 w-36 bg-white p-3" />
                {items.map((p) => (
                  <th key={p.code} scope="col" className="p-3 text-start align-top font-normal">
                    <span className="relative mb-3 block h-32 overflow-hidden rounded-xl">
                      <PropertyPhoto property={p} sizes="260px" />
                      <CompareRemove code={p.code} codes={items.map((item) => item.code)} />
                    </span>
                    <span className="text-xs font-semibold text-rose">
                      {nameOf(p.type, locale)} · <bdi>{p.code}</bdi>
                    </span>
                    <Link
                      href={`/properties/${p.code}`}
                      className="block font-heading text-lg leading-snug font-semibold text-slate hover:text-green-700"
                    >
                      {titleOf(p, locale)}
                    </Link>
                    <span className="block text-muted-foreground">
                      {nameOf(p.location, locale)}
                    </span>
                    <Price value={p.rent_qar} className="mt-2 block text-base" />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-line">
                <th
                  scope="row"
                  className="sticky start-0 z-10 bg-white p-3 text-start font-semibold text-muted-foreground"
                >
                  {t("status")}
                </th>
                {items.map((p) => (
                  <td key={p.code} className="p-3">
                    {status(p.status)}
                  </td>
                ))}
              </tr>
              {shown.map((row) => (
                <tr key={row.label} className="border-t border-line">
                  <th
                    scope="row"
                    className="sticky start-0 z-10 bg-white p-3 text-start font-semibold text-muted-foreground"
                  >
                    {row.label}
                  </th>
                  {items.map((p) => {
                    const value = row.value(p);
                    return (
                      <td key={p.code} className="p-3">
                        {value === null ? "–" : row.show(Math.round(value * 10) / 10)}
                        {isBest(row, p) && (
                          <span className="ms-2 rounded-full bg-tint px-2 py-0.5 text-xs font-semibold whitespace-nowrap text-green-800">
                            {t("best")}
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
              {amenities.map((name) => (
                <tr key={name} className="border-t border-line">
                  <th
                    scope="row"
                    className="sticky start-0 z-10 bg-white p-3 text-start font-semibold text-muted-foreground"
                  >
                    {amenityOf(name, locale)}
                  </th>
                  {items.map((p) => (
                    <td key={p.code} className="p-3">
                      {p.amenities.includes(name) ? (
                        <Check className="size-5 text-green-700" aria-label={t("yes")} />
                      ) : (
                        <Minus className="size-5 text-field" aria-label={t("no")} />
                      )}
                    </td>
                  ))}
                </tr>
              ))}
              <tr className="border-t border-line">
                <td className="sticky start-0 z-10 bg-white p-3" />
                {items.map((p) => (
                  <td key={p.code} className="p-3">
                    <WhatsAppLink
                      text={common("waProperty", { code: p.code })}
                      className={buttonVariants({ variant: "whatsapp", size: "sm" })}
                    >
                      {common("whatsapp")}
                    </WhatsAppLink>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
