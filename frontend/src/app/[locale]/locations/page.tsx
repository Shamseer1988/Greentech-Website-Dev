import Image from "next/image";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { cn } from "cn";
import { Arrow } from "@/components/home/sections";
import { MapView } from "@/components/maps/map";
import { Reveal } from "@/components/motion/reveal";
import { buttonVariants } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { getLocations } from "@/lib/api";
import { nameOf, num } from "@/lib/format";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("meta");
  return { title: t("locations"), description: t("description") };
}

const DOHA = { lat: 25.2854, lng: 51.531 };

export default async function LocationsPage() {
  const t = await getTranslations("locations");
  const common = await getTranslations("common");
  const locale = await getLocale();
  const locations = await getLocations();

  const cards = [
    ...locations.map((location) => ({
      key: location.slug,
      href: `/properties?location=${location.slug}`,
      name: nameOf(location, locale),
      text: (locale === "ar" && location.description_ar) || location.description_en,
      action: common("listings", {
        count: location.property_count,
        n: num(location.property_count),
      }),
      arrow: true,
    })),
    {
      key: "more",
      href: "/contact",
      name: t("more"),
      text: t("moreText"),
      action: t("ask"),
      arrow: true,
    },
    {
      key: "doha",
      href: "/contact?for=residential",
      name: t("doha"),
      text: t("dohaText"),
      action: common("comingSoon"),
      arrow: false,
    },
  ];

  const pins = [
    ...locations.map((location) => ({
      id: location.slug,
      lat: location.lat,
      lng: location.lng,
      label: `${nameOf(location, locale)} · ${num(location.property_count)}`,
      href: `/properties?location=${location.slug}`,
    })),
    {
      id: "doha",
      ...DOHA,
      label: `${t("doha")} (${common("comingSoon")})`,
      href: "/contact?for=residential",
      accent: true,
    },
  ];

  return (
    <div className="container-page max-w-[1240px]">
      <section className="flex flex-col gap-3 pt-14 pb-6">
        <h1 className="text-4xl font-bold text-slate lg:text-5xl">{t("title")}</h1>
        <p className="max-w-180 text-lg leading-relaxed text-muted-foreground">{t("text")}</p>
      </section>

      <section className="grid gap-6 pt-4 pb-8 lg:grid-cols-[460fr_560fr]">
        <div className="relative isolate h-100 overflow-hidden rounded-[20px] border border-[#d6ded7] lg:h-auto lg:min-h-130">
          <MapView pins={pins} />
          <span className="absolute end-4 top-4 z-10 rounded-md bg-white px-3 py-2 text-[13px] font-semibold shadow">
            {t("mapTitle")}
          </span>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {cards.map((card, i) => (
            <Reveal key={card.key} delay={i * 0.05}>
              <Link
                href={card.href}
                className="flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-white transition duration-300 hover:-translate-y-1 hover:shadow-[0_18px_40px_rgb(4_29_21/.14)]"
              >
                <span className="photo-empty flex h-27 items-center justify-center">
                  <Image
                    src="/brand/greentech-emblem.svg"
                    alt=""
                    width={56}
                    height={56}
                    unoptimized
                    className="h-12 w-auto opacity-70"
                  />
                </span>
                <span className="flex flex-1 flex-col gap-1.5 px-4 py-3.5">
                  <span className="font-heading text-[19px] font-semibold text-slate">
                    {card.name}
                  </span>
                  <span className="text-[13px] text-muted-foreground">{card.text}</span>
                  <span className="mt-auto text-sm font-semibold text-green-700">
                    {card.action} {card.arrow && <Arrow />}
                  </span>
                </span>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="pt-6 pb-20">
        <div className="flex flex-wrap items-center justify-between gap-5 rounded-[20px] bg-green-700 p-8 text-white lg:p-9">
          <div className="flex flex-col gap-1.5">
            <h2 className="text-[26px] font-semibold">{t("ctaTitle")}</h2>
            <p>{t("ctaText")}</p>
          </div>
          <Link href="/contact" className={cn(buttonVariants({ variant: "mint" }))}>
            {t("ctaButton")}
          </Link>
        </div>
      </section>
    </div>
  );
}
