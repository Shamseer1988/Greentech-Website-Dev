"use client";

import { Expand, MapPin, Navigation, X } from "lucide-react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "cn";
import { Price } from "@/components/property/price";
import { PropertyPhoto } from "@/components/property/property-photo";
import { buttonVariants } from "@/components/ui/button";
import { WhatsAppIcon, WhatsAppLink } from "@/components/whatsapp-link";
import { Link } from "@/i18n/navigation";
import { nameOf, num, specs, titleOf } from "@/lib/format";
import { directionsHref } from "@/lib/site";
import type { PropertyCard, Ref } from "@/lib/types";
import type { MapProperty } from "./property-map";

const PropertyMap = dynamic(() => import("./property-map"), {
  ssr: false,
  loading: () => <div className="size-full animate-pulse bg-[#e7ece6]" />,
});

const PARAM = "map";
type Placed = PropertyCard & { lat: number; lng: number };

/** The button on the small map, and the full-screen map it opens (also at /locations?map=1). */
export function FullMap({ properties }: { properties: PropertyCard[] }) {
  const t = useTranslations("fullMap");
  const open = useSearchParams().has(PARAM);
  const dialog = useRef<HTMLDialogElement>(null);
  const pushed = useRef(false);

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (!open) {
      pushed.current = false;
      element.close();
      return;
    }
    if (!element.open) element.showModal();
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = "";
    };
  }, [open]);

  // The map has its own address, so the phone's Back button closes it.
  function show() {
    pushed.current = true;
    window.history.pushState(null, "", `?${PARAM}=1`);
  }
  function hide() {
    if (pushed.current) window.history.back();
    else window.history.replaceState(null, "", window.location.pathname);
  }

  return (
    <>
      <button
        type="button"
        onClick={show}
        className={cn(
          buttonVariants({ size: "sm" }),
          "absolute bottom-5 left-1/2 z-10 -translate-x-1/2 rounded-full px-5 whitespace-nowrap shadow-[0_12px_30px_rgb(4_29_21/.35)] ring-4 ring-white/60",
        )}
      >
        <Expand />
        {t("open")}
      </button>
      <dialog
        ref={dialog}
        aria-label={t("title")}
        data-lenis-prevent
        onCancel={(event) => {
          event.preventDefault();
          hide();
        }}
        className="fixed inset-0 m-0 h-dvh max-h-none w-screen max-w-none overflow-hidden bg-deep p-0 text-ink open:animate-in open:fade-in open:zoom-in-95 motion-reduce:animate-none"
      >
        {open && <Explorer properties={properties} onClose={hide} />}
      </dialog>
    </>
  );
}

function Explorer({ properties, onClose }: { properties: PropertyCard[]; onClose: () => void }) {
  const t = useTranslations("fullMap");
  const common = useTranslations("common");
  const locale = useLocale();
  const [type, setType] = useState("");
  const [area, setArea] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const list = useRef<HTMLUListElement>(null);

  const placed = useMemo(
    () => properties.filter((p): p is Placed => p.lat !== null && p.lng !== null),
    [properties],
  );
  const shown = useMemo(
    () =>
      placed.filter(
        (p) => (!type || p.type.slug === type) && (!area || p.location.slug === area),
      ),
    [placed, type, area],
  );
  const pins = useMemo(
    () =>
      shown.map(
        (p): MapProperty => ({
          code: p.code,
          lat: p.lat,
          lng: p.lng,
          label: p.rent_qar === null ? p.code : common("price", { price: num(p.rent_qar) }),
          title: `${titleOf(p, locale)} · ${p.code}`,
          icon: p.type.icon,
          area: nameOf(p.location, locale),
          reserved: p.status !== "available",
        }),
      ),
    [shown, common, locale],
  );
  const current = shown.find((p) => p.code === selected);

  useEffect(() => {
    list.current
      ?.querySelector(`[data-code="${selected}"]`)
      ?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [selected]);

  const unique = (refs: Ref[]) => [...new Map(refs.map((r) => [r.slug, r])).values()];
  const types = unique(placed.map((p) => p.type));
  const areas = unique(placed.map((p) => p.location));
  const chip = (active: boolean) =>
    cn(
      "flex h-10 flex-none items-center rounded-full border px-4 text-[13px] font-medium transition-colors",
      active
        ? "border-mint bg-mint font-semibold text-deep"
        : "border-white/20 bg-white/5 text-sage hover:border-mint/70 hover:text-white",
    );

  return (
    <div className="flex size-full flex-col">
      <header className="flex flex-none flex-col gap-3 bg-deep px-4 py-3 text-white lg:px-6 [@media(max-height:500px)]:gap-1.5 [@media(max-height:500px)]:py-1.5">
        <div className="flex items-center gap-3.5">
          <Image
            src="/brand/greentech-emblem-on-dark.svg"
            alt=""
            width={56}
            height={56}
            unoptimized
            className="h-9 w-auto flex-none"
          />
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-lg leading-tight font-bold lg:text-xl">{t("title")}</h2>
            <p role="status" className="text-[13px] text-sage">
              {common("listings", { count: shown.length, n: num(shown.length) })}
            </p>
          </div>
          <label className="hidden sm:block">
            <span className="sr-only">{t("area")}</span>
            <select
              value={area}
              onChange={(event) => setArea(event.target.value)}
              className="h-11 rounded-xl border border-white/20 bg-deepest px-3.5 text-sm text-white"
            >
              <option value="">{t("allAreas")}</option>
              {areas.map((item) => (
                <option key={item.slug} value={item.slug}>
                  {nameOf(item, locale)}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            autoFocus
            onClick={onClose}
            aria-label={t("close")}
            className="flex size-11 flex-none items-center justify-center rounded-full border border-white/20 transition-colors hover:bg-white/10"
          >
            <X className="size-5" />
          </button>
        </div>
        <div
          role="group"
          aria-label={t("type")}
          className="-mx-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none]"
        >
          <button type="button" aria-pressed={!type} onClick={() => setType("")} className={chip(!type)}>
            {t("allTypes")}
          </button>
          {types.map((item) => (
            <button
              key={item.slug}
              type="button"
              aria-pressed={type === item.slug}
              onClick={() => setType(item.slug)}
              className={chip(type === item.slug)}
            >
              {nameOf(item, locale)}
            </button>
          ))}
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <aside className="hidden w-[380px] flex-none overflow-y-auto bg-ivory lg:block">
          <ul ref={list} className="flex flex-col gap-2.5 p-4">
            {shown.map((p) => (
              <li key={p.code} data-code={p.code}>
                <button
                  type="button"
                  aria-pressed={p.code === selected}
                  onClick={() => setSelected(p.code)}
                  className={cn(
                    "flex w-full gap-3.5 rounded-2xl border bg-white p-2.5 text-start transition duration-200 hover:border-green-700 hover:shadow-[0_10px_26px_rgb(4_29_21/.12)]",
                    p.code === selected ? "border-green-700 ring-2 ring-green-700/25" : "border-line",
                  )}
                >
                  <span className="relative h-24 w-28 flex-none overflow-hidden rounded-xl">
                    <PropertyPhoto property={p} sizes="112px" />
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5 py-0.5">
                    <span className="text-[11px] font-semibold text-rose">
                      {nameOf(p.type, locale)} · <bdi>{p.code}</bdi>
                    </span>
                    <span className="line-clamp-2 font-heading text-[15px] leading-snug font-semibold text-slate">
                      {titleOf(p, locale)}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="size-3.5" aria-hidden="true" />
                      {nameOf(p.location, locale)}
                    </span>
                    <Price value={p.rent_qar} className="mt-auto text-sm" />
                  </span>
                </button>
              </li>
            ))}
            {shown.length === 0 && (
              <li className="p-6 text-center text-muted-foreground">{t("empty")}</li>
            )}
          </ul>
        </aside>

        <div className="relative isolate min-w-0 flex-1">
          <PropertyMap
            properties={pins}
            selected={current ? selected : null}
            onSelect={setSelected}
            labels={{ zoomIn: t("zoomIn"), zoomOut: t("zoomOut"), showAll: t("showAll") }}
          />
          {current && (
            <SelectedCard key={current.code} property={current} onClose={() => setSelected(null)} />
          )}
        </div>
      </div>
    </div>
  );
}

function SelectedCard({ property, onClose }: { property: Placed; onClose: () => void }) {
  const t = useTranslations("fullMap");
  const common = useTranslations("common");
  const status = useTranslations("status");
  const locale = useLocale();
  return (
    <article className="absolute inset-x-3 bottom-3 z-10 overflow-hidden rounded-2xl bg-white shadow-[0_24px_60px_rgb(4_29_21/.35)] animate-in fade-in slide-in-from-bottom-6 duration-300 motion-reduce:animate-none sm:inset-x-auto sm:start-5 sm:bottom-7 sm:w-[370px]">
      <div className="relative h-32 sm:h-48 [@media(max-height:500px)]:h-14">
        <PropertyPhoto property={property} sizes="(min-width: 640px) 370px, 100vw" />
        <span
          className={cn(
            "absolute start-3 top-3 rounded-full px-3 py-1 text-xs font-semibold",
            property.status === "available" ? "bg-mint text-deep" : "bg-rose text-white",
          )}
        >
          {status(property.status)}
        </span>
        <span className="absolute start-3 bottom-3 rounded-md bg-deep/85 px-2 py-1 text-xs text-white [@media(max-height:500px)]:hidden">
          {common("code", { code: property.code })}
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label={t("closeCard")}
          className="absolute end-3 top-3 flex size-10 items-center justify-center rounded-full bg-white/95 text-slate shadow transition-colors hover:bg-tint"
        >
          <X className="size-4.5" />
        </button>
      </div>
      <div className="flex flex-col gap-2 p-4">
        <span className="text-xs font-semibold text-rose">
          {nameOf(property.type, locale)} · {nameOf(property.location, locale)}
        </span>
        <h3 className="text-lg leading-snug font-semibold text-slate">
          {titleOf(property, locale)}
        </h3>
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
          <Price value={property.rent_qar} className="text-lg" />
          <span className="flex gap-2 text-[13px] text-muted-foreground">
            {specs(property, common, locale).map((fact) => (
              <span key={fact} className="rounded-full bg-ivory px-2.5 py-1">
                {fact}
              </span>
            ))}
          </span>
        </div>
        <div className="mt-1 flex gap-2">
          <Link
            href={`/properties/${property.code}`}
            className={cn(buttonVariants({ size: "sm" }), "flex-1")}
          >
            {t("details")}
          </Link>
          <a
            href={directionsHref(property.lat, property.lng)}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={common("directions")}
            title={common("directions")}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }), "px-3.5")}
          >
            <Navigation />
          </a>
          <WhatsAppLink
            text={common("waProperty", { code: property.code })}
            aria-label={common("whatsapp")}
            title={common("whatsapp")}
            className={cn(buttonVariants({ variant: "whatsapp", size: "sm" }), "px-3.5")}
          >
            <WhatsAppIcon />
          </WhatsAppLink>
        </div>
      </div>
    </article>
  );
}
