"use client";

import { useLocale, useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { cn } from "cn";
import { PropertyPhoto } from "@/components/property/property-photo";
import { buttonVariants } from "@/components/ui/button";
import { WhatsAppIcon, WhatsAppLink } from "@/components/whatsapp-link";
import { Link } from "@/i18n/navigation";
import { findOptions, placesIn, rentPerWorker } from "@/lib/calculator";
import { nameOf, num, titleOf } from "@/lib/format";
import type { PropertyCard } from "@/lib/types";

const PER_ROOM = [2, 4, 6, 8];
const SHOWN = 6;
const limit = (text: string, max: number) =>
  Math.min(max, Math.max(0, Math.floor(Number(text) || 0)));

export function Calculator({ properties }: { properties: PropertyCard[] }) {
  const t = useTranslations("calculator");
  const common = useTranslations("common");
  const locale = useLocale();
  const [workers, setWorkers] = useState("150");
  const [perRoom, setPerRoom] = useState(4);
  const [location, setLocation] = useState("");
  const [budget, setBudget] = useState("");
  const count = limit(workers, 100_000);
  const max = limit(budget, 100_000_000);

  const places = [...new Map(properties.map((p) => [p.location.slug, p.location])).values()];
  const inArea = properties.filter((p) => !location || p.location.slug === location);
  const options = useMemo(
    () =>
      count
        ? findOptions(properties, { workers: count, perRoom, location, budget: max || null })
        : [],
    [properties, count, perRoom, location, max],
  );
  const usual = rentPerWorker(inArea, perRoom);
  const money = (value: number) => common("price", { price: num(Math.round(value)) });
  const results = [
    [t("rooms"), num(Math.ceil(count / perRoom))],
    [t("budget"), usual ? `${money(usual.low * count)} – ${money(usual.high * count)}` : "–"],
    [t("perWorker"), usual ? `${money(usual.middle)}` : "–"],
  ];

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[380px_1fr]">
      <div className="flex flex-col gap-5 rounded-3xl border border-line bg-white p-6 lg:sticky lg:top-6">
        <label className="flex flex-col gap-1.5 text-[13px] font-semibold text-muted-foreground">
          {t("workers")}
          <input
            type="number"
            name="workers"
            inputMode="numeric"
            min={1}
            max={100000}
            value={workers}
            onChange={(event) => setWorkers(event.target.value)}
            className="field text-lg font-bold"
          />
        </label>
        <fieldset>
          <legend className="mb-1.5 text-[13px] font-semibold text-muted-foreground">
            {t("perRoom")}
          </legend>
          <div className="grid grid-cols-4 gap-2">
            {PER_ROOM.map((n) => (
              <button
                key={n}
                type="button"
                aria-pressed={n === perRoom}
                onClick={() => setPerRoom(n)}
                className={cn(
                  "min-h-11 rounded-lg border font-semibold transition-colors",
                  n === perRoom
                    ? "border-green-700 bg-green-700 text-white"
                    : "border-field hover:border-green-700",
                )}
              >
                {n}
              </button>
            ))}
          </div>
        </fieldset>
        <label className="flex flex-col gap-1.5 text-[13px] font-semibold text-muted-foreground">
          {t("area")}
          <select
            name="location"
            value={location}
            onChange={(event) => setLocation(event.target.value)}
            className="field"
          >
            <option value="">{t("anyArea")}</option>
            {places.map((place) => (
              <option key={place.slug} value={place.slug}>
                {nameOf(place, locale)}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-[13px] font-semibold text-muted-foreground">
          {t("maxBudget")}
          <input
            type="number"
            name="budget"
            inputMode="numeric"
            min={0}
            step={1000}
            value={budget}
            placeholder={t("noLimit")}
            onChange={(event) => setBudget(event.target.value)}
            className="field"
          />
        </label>
        <p className="text-[13px] leading-relaxed text-muted-foreground">{t("note")}</p>
      </div>

      <div className="flex min-w-0 flex-col gap-5">
        <dl aria-live="polite" className="grid gap-3 sm:grid-cols-3">
          {results.map(([label, value]) => (
            <div key={label} className="flex flex-col gap-1 rounded-2xl bg-deep p-5 text-white">
              <dt className="text-[13px] text-sage">{label}</dt>
              <dd className="font-heading text-xl font-bold text-mint">{value}</dd>
            </div>
          ))}
        </dl>
        <h2 role="status" className="text-2xl font-bold text-slate">
          {t("found", { count: options.length, n: num(options.length) })}
        </h2>
        {options.length === 0 && (
          <div className="flex flex-col items-start gap-4 rounded-2xl border border-line bg-white p-6">
            <p>{count ? t("none") : t("enter")}</p>
            <WhatsAppLink
              text={t("wa", { workers: num(count) })}
              className={buttonVariants({ variant: "whatsapp" })}
            >
              <WhatsAppIcon />
              {common("whatsappUs")}
            </WhatsAppLink>
          </div>
        )}
        {options.slice(0, SHOWN).map((option) => (
          <article
            key={option.properties.map((p) => p.code).join()}
            className="flex flex-col gap-4 rounded-2xl border border-line bg-white p-5"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <strong className="text-lg text-green-700">
                {option.rent === null
                  ? common("onRequest")
                  : `${money(option.rent)} ${common("perMonth")}`}
              </strong>
              <span className="text-sm text-muted-foreground">
                {t("places", { n: num(option.places) })}
                {option.rent !== null &&
                  count > 0 &&
                  ` · ${t("each", { price: money(option.rent / count) })}`}
              </span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {option.properties.map((p) => (
                <Link
                  key={p.code}
                  href={`/properties/${p.code}`}
                  className="flex gap-3 rounded-xl border border-line p-2 transition-colors hover:border-green-700"
                >
                  <span className="relative h-18 w-22 flex-none overflow-hidden rounded-lg">
                    <PropertyPhoto property={p} sizes="88px" />
                  </span>
                  <span className="flex min-w-0 flex-col text-sm">
                    <span className="text-xs font-semibold text-rose">
                      <bdi>{p.code}</bdi> · {nameOf(p.location, locale)}
                    </span>
                    <span className="truncate font-semibold text-slate">{titleOf(p, locale)}</span>
                    <span className="text-xs text-muted-foreground">
                      {p.rooms !== null &&
                        `${common("rooms", { count: p.rooms, n: num(p.rooms) })} · `}
                      {t("places", { n: num(placesIn(p, perRoom)) })}
                    </span>
                  </span>
                </Link>
              ))}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
