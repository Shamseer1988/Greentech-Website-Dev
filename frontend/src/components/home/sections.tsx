import { getLocale, getTranslations } from "next-intl/server";
import { cn } from "cn";
import { Reveal } from "@/components/motion/reveal";
import { buttonVariants } from "@/components/ui/button";
import { WhatsAppLink } from "@/components/whatsapp-link";
import { Link } from "@/i18n/navigation";
import { nameOf, num } from "@/lib/format";
import { typeIcon } from "@/lib/type-icons";
import type { LocationOut, PropertyTypeOut } from "@/lib/types";

export async function Ticker({
  types,
  locations,
}: {
  types: PropertyTypeOut[];
  locations: LocationOut[];
}) {
  const locale = await getLocale();
  const rentable = types.filter((type) => !type.coming_soon);
  const words = Array.from({ length: Math.max(rentable.length, locations.length) }).flatMap(
    (_, i) =>
      [locations[i], rentable[i]].flatMap((item) => (item ? [nameOf(item, locale)] : [])),
  );
  if (!words.length) return null;

  // Two identical halves, so the loop has no visible jump.
  const half = [...words, ...words];
  return (
    <div aria-hidden="true" dir="ltr" className="overflow-hidden bg-rose text-white">
      <div className="flex w-max animate-marquee font-heading text-[22px] font-semibold whitespace-nowrap">
        {[0, 1].map((copy) => (
          <div key={copy} className="flex items-center gap-12 py-4.5 pe-12">
            {half.map((word, i) => (
              <span key={i} className="flex items-center gap-12">
                <bdi>{word}</bdi>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2l2.5 7.5H22l-6 4.5 2.5 7.5-6.5-4.5L5.5 21.5 8 14 2 9.5h7.5z" />
                </svg>
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function Icon({ slug, className }: { slug: string; className: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={typeIcon(slug)} />
    </svg>
  );
}

const TILT =
  "flex h-full flex-col justify-between rounded-3xl border transition duration-300 hover:-translate-y-2 hover:border-mint/60 hover:shadow-[0_28px_60px_rgb(4_29_21/.25)]";

export async function Categories({ types }: { types: PropertyTypeOut[] }) {
  const t = await getTranslations("home");
  const common = await getTranslations("common");
  const locale = await getLocale();
  const text = (slug: string) => (t.has(`catText.${slug}`) ? t(`catText.${slug}`) : "");
  const [big, ...rest] = types;

  return (
    <section id="services" className="container-page scroll-mt-6 pt-20 pb-16 lg:pt-28 lg:pb-20">
      <Reveal className="mb-10 flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2.5">
          <span className="eyebrow text-rose">{t("categoriesEyebrow")}</span>
          <h2 className="max-w-155 text-4xl leading-[1.05] font-bold tracking-tight text-slate lg:text-[52px]">
            {t("categoriesTitle")}
          </h2>
        </div>
        <Link href="/properties" className="py-2 font-semibold text-green-700 hover:text-green-800">
          {t("seeAll")} <Arrow />
        </Link>
      </Reveal>

      <div className="grid gap-4.5 sm:grid-cols-2 lg:auto-rows-[220px] lg:grid-cols-3">
        {big && (
          <Reveal className="min-h-80 sm:col-span-2 lg:col-span-1 lg:row-span-2">
            <Link
              href={`/properties?type=${big.slug}`}
              className={cn(TILT, "relative overflow-hidden border-green-700 bg-deep p-7 text-white")}
            >
              <span
                aria-hidden="true"
                className="absolute -end-15 -bottom-15 size-65 rounded-full bg-green-700 blur-2xl"
              />
              <span className="relative flex size-14 items-center justify-center rounded-2xl bg-mint text-deep">
                <Icon slug={big.slug} className="size-7" />
              </span>
              <span className="relative flex flex-col gap-2.5">
                <span className="font-heading text-[32px] leading-tight font-bold">
                  {nameOf(big, locale)}
                </span>
                <span className="leading-relaxed text-sage">{text(big.slug)}</span>
                <span className="font-semibold text-mint">
                  {t("available", { n: num(big.property_count) })} <Arrow />
                </span>
              </span>
            </Link>
          </Reveal>
        )}
        {rest.map((type, i) => (
          <Reveal key={type.slug} delay={0.08 * (i + 1)} className="min-h-50">
            <Link
              href={type.coming_soon ? "/contact?for=residential" : `/properties?type=${type.slug}`}
              className={cn(TILT, "border-line bg-white p-6")}
            >
              <span className="flex items-start justify-between">
                <span className="flex size-12.5 items-center justify-center rounded-xl bg-tint text-green-700">
                  <Icon slug={type.slug} className="size-6" />
                </span>
                <span
                  className={cn(
                    "rounded-full px-2.5 py-1 text-xs font-semibold",
                    type.coming_soon ? "bg-rose-tint text-rose-700" : "bg-tint text-deep",
                  )}
                >
                  {type.coming_soon
                    ? common("comingSoon")
                    : common("units", { count: type.property_count, n: num(type.property_count) })}
                </span>
              </span>
              <span className="flex flex-col gap-1">
                <span className="font-heading text-2xl font-semibold text-slate">
                  {nameOf(type, locale)}
                </span>
                <span className="text-sm text-muted-foreground">{text(type.slug)}</span>
              </span>
            </Link>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

export async function ResidentialCta() {
  const t = await getTranslations("home");
  const common = await getTranslations("common");
  return (
    <section className="container-page pb-20">
      <Reveal>
        <div className="grid-bg relative flex flex-wrap items-center justify-between gap-8 overflow-hidden rounded-[32px] bg-green-700 px-7 py-12 text-white lg:px-12 lg:py-16">
          <div className="flex min-w-0 flex-[1_1_300px] flex-col gap-3">
            <span className="eyebrow text-white">{t("soonEyebrow")}</span>
            <h2 className="text-4xl leading-[1.05] font-bold tracking-tight lg:text-[44px]">
              {t("soonTitle")}
            </h2>
            <p className="text-lg text-white">{t("soonText")}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/contact?for=residential"
              className={buttonVariants({ variant: "mint", size: "lg" })}
            >
              {t("register")}
            </Link>
            <WhatsAppLink
              text={common("waGeneral")}
              className={buttonVariants({ variant: "white", size: "lg" })}
            >
              {common("whatsappUs")}
            </WhatsAppLink>
          </div>
        </div>
      </Reveal>
    </section>
  );
}

export function Arrow() {
  return (
    <span aria-hidden="true" className="inline-block rtl:-scale-x-100">
      →
    </span>
  );
}
