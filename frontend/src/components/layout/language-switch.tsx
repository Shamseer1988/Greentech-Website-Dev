"use client";

import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { cn } from "cn";
import { Link, usePathname } from "@/i18n/navigation";

/** Same page in the other language, keeping the filters. */
export function LanguageSwitch({ dark }: { dark: boolean }) {
  const t = useTranslations("nav");
  const other = useLocale() === "ar" ? "en" : "ar";
  const pathname = usePathname();
  const query = useSearchParams().toString();

  return (
    <Link
      href={query ? `${pathname}?${query}` : pathname}
      locale={other}
      lang={other}
      hrefLang={other}
      aria-label={t("languageLabel")}
      className={cn(
        "flex h-11 items-center rounded-full border px-4 text-sm font-medium transition-colors",
        dark ? "border-white/20 hover:bg-white/10" : "border-field hover:bg-tint",
      )}
    >
      {t("language")}
    </Link>
  );
}
