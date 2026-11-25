"use client";

import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { cn } from "cn";
import { useReducedMotion } from "@/components/motion/use-reduced-motion";
import { PropertyPhoto } from "@/components/property/property-photo";
import { Price } from "@/components/property/price";
import { buttonVariants } from "@/components/ui/button";
import { WhatsAppLink } from "@/components/whatsapp-link";
import { Link } from "@/i18n/navigation";
import { nameOf, num, specs, titleOf } from "@/lib/format";
import type { PropertyCard } from "@/lib/types";

const SECONDS = 4.5;

export function FeaturedSlider({
  items,
  eyebrow,
  title,
}: {
  items: PropertyCard[];
  eyebrow: string;
  title: string;
}) {
  const t = useTranslations("home");
  const common = useTranslations("common");
  const locale = useLocale();
  const reduced = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [held, setHeld] = useState(false);
  const running = !reduced && !paused && !held && items.length > 1;
  const go = (i: number) => setIndex((i + items.length) % items.length);

  useEffect(() => {
    if (!running) return;
    const timer = setTimeout(() => setIndex((i) => (i + 1) % items.length), SECONDS * 1000);
    return () => clearTimeout(timer);
  }, [running, index, items.length]);

  if (!items.length) return null;
  const direction = locale === "ar" ? 1 : -1;

  return (
    <section className="container-page pb-20 lg:pb-28">
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2.5">
          {eyebrow && <span className="eyebrow text-rose">{eyebrow}</span>}
          <h2 className="text-4xl font-bold tracking-tight text-slate lg:text-[44px]">
            {title}
          </h2>
        </div>
        {items.length > 1 && (
          <div className="flex gap-2.5">
            {!reduced && (
              <button
                type="button"
                aria-label={paused ? t("play") : t("pause")}
                onClick={() => setPaused(!paused)}
                className={buttonVariants({ variant: "outline", size: "icon" })}
              >
                {paused ? <Play /> : <Pause />}
              </button>
            )}
            <button
              type="button"
              aria-label={t("previous")}
              onClick={() => go(index - 1)}
              className={buttonVariants({ variant: "outline", size: "icon" })}
            >
              <ChevronLeft className="rtl:rotate-180" />
            </button>
            <button
              type="button"
              aria-label={t("next")}
              onClick={() => go(index + 1)}
              className={buttonVariants({ size: "icon" })}
            >
              <ChevronRight className="rtl:rotate-180" />
            </button>
          </div>
        )}
      </div>

      <div
        className="overflow-hidden rounded-4xl"
        onMouseEnter={() => setHeld(true)}
        onMouseLeave={() => setHeld(false)}
        onFocus={() => setHeld(true)}
        onBlur={() => setHeld(false)}
      >
        <motion.div
          className="flex"
          initial={false}
          animate={{ x: `${direction * index * 100}%` }}
          transition={{ duration: 0.9, ease: [0.7, 0, 0.2, 1] }}
        >
          {items.map((item, i) => (
            <article
              key={item.code}
              inert={i !== index}
              className="flex w-full flex-none flex-wrap overflow-hidden rounded-4xl border border-line bg-white"
            >
              <div className="relative min-h-65 flex-[1_1_300px] lg:min-h-105 lg:flex-[1_1_560px]">
                <PropertyPhoto property={item} sizes="(min-width: 1024px) 760px, 100vw" />
                <span className="absolute start-5 top-5 rounded-full bg-deep px-3.5 py-1.5 text-[13px] font-semibold text-white">
                  {item.code}
                </span>
                {item.photo_count > 0 && (
                  <span className="absolute start-5 bottom-5 rounded-md bg-white/90 px-3 py-2 text-[13px] font-semibold">
                    {common("photos", { count: item.photo_count, n: num(item.photo_count) })}
                  </span>
                )}
              </div>
              <div className="flex flex-[1_1_300px] flex-col justify-center gap-4 p-6 lg:flex-[1_1_380px] lg:p-10">
                <span className="self-start rounded-full bg-tint px-3.5 py-1.5 text-[13px] font-semibold text-green-700">
                  {nameOf(item.type, locale)}
                </span>
                <h3 className="text-3xl leading-tight font-bold text-slate lg:text-4xl">
                  {titleOf(item, locale)}
                </h3>
                <span className="text-muted-foreground">{nameOf(item.location, locale)}</span>
                <div className="grid grid-cols-2 gap-3">
                  {specs(item, common, locale).map((fact) => (
                    <span key={fact} className="rounded-xl bg-ivory p-3 font-bold">
                      {fact}
                    </span>
                  ))}
                </div>
                <Price value={item.rent_qar} className="font-heading text-[28px]" />
                <div className="flex flex-wrap gap-2.5">
                  <Link href={`/properties/${item.code}`} className={buttonVariants()}>
                    {t("details")}
                  </Link>
                  <WhatsAppLink
                    text={common("waProperty", { code: item.code })}
                    className={buttonVariants({ variant: "whatsapp" })}
                  >
                    {common("whatsapp")}
                  </WhatsAppLink>
                </div>
              </div>
            </article>
          ))}
        </motion.div>
      </div>

      {items.length > 1 && (
        <div className="mt-5 flex gap-2.5">
          {items.map((item, i) => (
            <button
              key={item.code}
              type="button"
              aria-label={t("show", { title: titleOf(item, locale) })}
              aria-current={i === index}
              onClick={() => go(i)}
              className="flex h-11 flex-1 items-center"
            >
              <span className="block h-1 w-full overflow-hidden rounded bg-[#d6ded7]">
                {i === index && (
                  <motion.span
                    key={`${index}-${running}`}
                    className={cn("block h-full origin-left bg-green-700 rtl:origin-right")}
                    initial={{ scaleX: running ? 0 : 1 }}
                    animate={{ scaleX: 1 }}
                    transition={{ duration: running ? SECONDS : 0, ease: "linear" }}
                  />
                )}
              </span>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
