"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { cn } from "cn";
import { buttonVariants } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { nameOf, num } from "@/lib/format";
import { directionsHref } from "@/lib/site";
import type { LocationOut } from "@/lib/types";

// Places on the drawing. New areas from the admin panel use their map point instead.
const SPOTS: Record<string, [number, number]> = {
  "al-khor": [215, 120],
  "umm-silal": [200, 215],
  "industrial-area": [175, 275],
  "abu-nakhla": [150, 300],
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

function spot(location: LocationOut): [number, number] {
  return (
    SPOTS[location.slug] ?? [
      clamp(215 + (location.lng - 51.5) * 570, 70, 250),
      clamp(120 + (25.68 - location.lat) * 316, 50, 420),
    ]
  );
}

export function QatarMap({
  locations,
  residentialSoon,
  eyebrow,
  title,
}: {
  locations: LocationOut[];
  residentialSoon: boolean;
  eyebrow: string;
  title: string;
}) {
  const t = useTranslations("home");
  const common = useTranslations("common");
  const locale = useLocale();
  const [selected, setSelected] = useState(locations[0]?.slug ?? "doha");

  const areas = [
    ...locations.map((location) => ({
      slug: location.slug,
      name: nameOf(location, locale),
      text: (locale === "ar" && location.description_ar) || location.description_en,
      spot: spot(location),
      location: location as LocationOut | null,
    })),
    ...(residentialSoon
      ? [
          {
            slug: "doha",
            name: t("dohaName"),
            text: t("dohaText"),
            spot: [250, 250] as [number, number],
            location: null,
          },
        ]
      : []),
  ];
  const area = areas.find((a) => a.slug === selected) ?? areas[0];
  if (!area) return null;

  return (
    <section className="grid-bg bg-deep text-white">
      <div className="container-page flex flex-wrap items-center gap-14 py-20 lg:py-25">
        <div className="flex min-w-0 flex-[1_1_300px] flex-col gap-5 lg:flex-[1_1_420px]">
          {eyebrow && <span className="eyebrow text-mint">{eyebrow}</span>}
          <h2 className="text-4xl leading-[1.05] font-bold tracking-tight lg:text-5xl">
            {title}
          </h2>
          <div
            aria-live="polite"
            className="min-h-60 rounded-[22px] border border-white/14 bg-white/7 p-6.5 backdrop-blur-md"
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={area.slug}
                className="flex flex-col gap-3"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
              >
                <span className="text-[13px] text-sage">{t("selected")}</span>
                <span className="font-heading text-[34px] leading-tight font-bold text-mint">
                  {area.name}
                </span>
                <span className="leading-relaxed text-sage">{area.text}</span>
                <div className="mt-1.5 flex flex-wrap gap-2.5">
                  {area.location ? (
                    <>
                      <Link
                        href={`/properties?location=${area.slug}`}
                        className={buttonVariants({ variant: "white" })}
                      >
                        {t("viewListings", {
                          listings: common("listings", {
                            count: area.location.property_count,
                            n: num(area.location.property_count),
                          }),
                        })}
                      </Link>
                      <a
                        href={directionsHref(area.location.lat, area.location.lng)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={buttonVariants({ variant: "glass" })}
                      >
                        {common("directions")}
                      </a>
                    </>
                  ) : (
                    <Link
                      href="/contact?for=residential"
                      className={buttonVariants({ variant: "white" })}
                    >
                      {t("register")}
                    </Link>
                  )}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
          <div className="flex flex-wrap gap-2">
            {areas.map((a) => (
              <button
                key={a.slug}
                type="button"
                aria-pressed={a.slug === area.slug}
                onClick={() => setSelected(a.slug)}
                className={cn(
                  "h-11 rounded-full border px-4 transition-colors",
                  a.slug === area.slug
                    ? "border-mint bg-mint font-semibold text-deep"
                    : "border-white/25 hover:bg-white/10",
                )}
              >
                {a.name}
              </button>
            ))}
          </div>
        </div>

        <div className="flex min-w-0 flex-[1_1_300px] justify-center">
          <div dir="ltr" className="relative h-115 w-80">
            <svg
              viewBox="0 0 320 460"
              width="320"
              height="460"
              role="img"
              aria-label={t("mapLabel")}
            >
              <path
                d="M175 20 C200 30 215 60 225 100 C235 140 255 170 262 210 C270 240 258 260 252 285 C248 320 262 350 245 385 C232 410 215 430 190 445 L120 440 C110 420 95 410 80 390 C70 360 55 330 52 300 C48 270 70 250 80 220 C88 190 100 160 115 120 C128 85 150 40 175 20 Z"
                fill="#0A3D2D"
                stroke="#3DDC97"
                strokeWidth="1.5"
              />
              <path
                d="M215 120 L200 215 L250 250 L175 275 L150 300"
                fill="none"
                stroke="#3DDC97"
                strokeWidth="1.5"
                strokeDasharray="8 10"
                opacity=".7"
                className="animate-dashflow"
              />
            </svg>
            {areas.map((a) => (
              <button
                key={a.slug}
                type="button"
                aria-label={a.name}
                aria-pressed={a.slug === area.slug}
                onClick={() => setSelected(a.slug)}
                className="absolute -mt-5.5 -ml-5.5 size-11"
                style={{ left: a.spot[0], top: a.spot[1] }}
              >
                {[true, false].map((ring) => (
                  <span
                    key={String(ring)}
                    className={cn(
                      "absolute top-3.5 left-3.5 size-4 rounded-full",
                      a.slug === area.slug ? "bg-pink" : "bg-mint",
                      ring ? "animate-pulse-ring" : "shadow-[0_0_0_4px_rgb(6_42_31/.9)]",
                    )}
                  />
                ))}
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
