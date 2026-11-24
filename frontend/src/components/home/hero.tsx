import { Search } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { cn } from "cn";
import { buttonVariants } from "@/components/ui/button";
import { WhatsAppIcon, WhatsAppLink } from "@/components/whatsapp-link";
import { nameOf, specs } from "@/lib/format";
import { site } from "@/lib/site";
import type { LocationOut, PropertyCard, PropertyTypeOut } from "@/lib/types";
import { HeroScene } from "./hero-scene";
import { RotatingWord } from "./rotating-word";

type Props = {
  types: PropertyTypeOut[];
  locations: LocationOut[];
  highlight: PropertyCard | undefined;
};

export async function Hero({ types, locations, highlight }: Props) {
  const t = await getTranslations("home");
  const common = await getTranslations("common");
  const status = await getTranslations("status");
  const locale = await getLocale();
  const words = [t("words.0"), t("words.1"), t("words.2"), t("words.3")];

  return (
    <section className="grid-bg relative overflow-hidden bg-deep text-white">
      <div
        aria-hidden="true"
        className="absolute -end-30 top-20 size-155 rounded-full bg-green-700 opacity-55 blur-[120px]"
      />
      <div className="container-page relative flex flex-wrap items-center gap-10 pt-32 pb-20 lg:pt-36 lg:pb-30">
        <div className="flex min-w-0 flex-[1_1_300px] flex-col gap-6 lg:flex-[1_1_520px]">
          <span className="flex animate-rise items-center gap-2.5 self-start rounded-full border border-mint/35 bg-mint/12 px-3.5 py-2 text-[13px] text-[#bff5dc]">
            <span className="relative size-2">
              <span className="absolute inset-0 animate-pulse-ring rounded-full bg-mint" />
              <span className="absolute inset-0 rounded-full bg-mint" />
            </span>
            {t("badge")}
          </span>

          <h1
            className="animate-rise text-[clamp(2.4rem,6.2vw,4.5rem)] leading-[1.05] font-bold tracking-tight"
            style={{ animationDelay: ".1s" }}
          >
            <span className="sr-only">{t("headline")}</span>
            <span aria-hidden="true">
              {t("rent")} <RotatingWord words={words} />
              <br />
              {t("across")}
            </span>
          </h1>

          <p
            className="max-w-135 animate-rise text-lg leading-relaxed text-sage"
            style={{ animationDelay: ".2s" }}
          >
            {t("intro")}
          </p>

          <form
            action={locale === "ar" ? "/ar/properties" : "/properties"}
            className="flex max-w-160 animate-rise flex-wrap gap-2 rounded-[20px] border border-white/16 bg-white/8 p-2.5 backdrop-blur-lg"
            style={{ animationDelay: ".3s" }}
          >
            <HeroSelect name="type" label={t("type")} any={t("anyType")}>
              {types
                .filter((type) => !type.coming_soon)
                .map((type) => (
                  <option key={type.slug} value={type.slug} className="text-ink">
                    {nameOf(type, locale)}
                  </option>
                ))}
            </HeroSelect>
            <span aria-hidden="true" className="hidden w-px bg-white/16 sm:block" />
            <HeroSelect name="location" label={t("location")} any={t("anyLocation")}>
              {locations.map((location) => (
                <option key={location.slug} value={location.slug} className="text-ink">
                  {nameOf(location, locale)}
                </option>
              ))}
            </HeroSelect>
            <button
              type="submit"
              className={cn(
                buttonVariants({ variant: "mint", size: "lg" }),
                "min-h-14 flex-1 font-bold sm:flex-none",
              )}
            >
              <Search />
              {t("search")}
            </button>
          </form>

          <div
            className="flex animate-rise flex-wrap items-center gap-5 text-sm"
            style={{ animationDelay: ".4s" }}
          >
            <WhatsAppLink
              text={common("waGeneral")}
              className="flex items-center gap-2 font-semibold hover:text-mint"
            >
              <span className="flex size-10 items-center justify-center rounded-full bg-whatsapp text-white">
                <WhatsAppIcon />
              </span>
              {common("whatsapp")} <bdi dir="ltr">{site.whatsapp}</bdi>
            </WhatsAppLink>
          </div>
        </div>

        <HeroScene label={t("sceneLabel")}>
          {highlight && (
            <div
              className="absolute start-0 top-6 flex max-w-[75%] animate-float items-center gap-3 rounded-2xl border border-white/18 bg-white/10 px-4 py-3.5 backdrop-blur-lg sm:top-10"
              style={{ animationDelay: ".6s" }}
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-mint text-deep">
                <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M3 20h18M4 20v-8h16v8M4 12l8-6 8 6" />
                </svg>
              </span>
              <span className="flex flex-col">
                <span className="text-xs text-sage">
                  <bdi>{highlight.code}</bdi> · {status(highlight.status)}
                </span>
                <span className="text-sm font-semibold sm:text-base">
                  {[specs(highlight, common, locale)[0], nameOf(highlight.location, locale)]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              </span>
            </div>
          )}
          <div
            className="absolute end-0 bottom-8 flex animate-float items-center gap-3 rounded-2xl bg-white px-4 py-3.5 text-ink shadow-[0_20px_50px_rgb(0_0_0/.3)] sm:bottom-17"
            style={{ animationDelay: "1.8s" }}
          >
            <span className="flex size-10 items-center justify-center rounded-full bg-whatsapp text-white">
              <WhatsAppIcon />
            </span>
            <span className="flex flex-col">
              <span className="text-xs text-muted-foreground">{t("chipReply")}</span>
              <span className="text-sm font-semibold sm:text-base">{t("chipText")}</span>
            </span>
          </div>
        </HeroScene>
      </div>
    </section>
  );
}

function HeroSelect({
  name,
  label,
  any,
  children,
}: {
  name: string;
  label: string;
  any: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-[1_1_170px] flex-col gap-0.5 px-3.5 py-2 text-xs font-semibold text-sage">
      {label}
      <select
        name={name}
        defaultValue=""
        className="h-9 w-full bg-transparent text-base font-medium text-white"
      >
        <option value="" className="text-ink">
          {any}
        </option>
        {children}
      </select>
    </label>
  );
}
