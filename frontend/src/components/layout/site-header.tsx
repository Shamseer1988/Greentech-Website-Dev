"use client";

import { Menu, X } from "lucide-react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { Suspense, useEffect, useState } from "react";
import { cn } from "cn";
import { buttonVariants } from "@/components/ui/button";
import { Link, usePathname } from "@/i18n/navigation";
import { FavouritesLink } from "@/components/property/save-buttons";
import { LanguageSwitch } from "./language-switch";

export type MenuLink = { key: string; href: string; label: string };

export function SiteHeader({ links }: { links: MenuLink[] }) {
  const t = useTranslations("nav");
  const brand = useTranslations("brand");
  const locale = useLocale();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const dark = pathname === "/";

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const isActive = (href: string) => !href.includes("#") && pathname.startsWith(href);
  const logo = `/brand/greentech-logo-compact-${locale}${dark ? "-on-dark" : ""}.svg`;

  return (
    <header
      className={cn(
        "no-print z-30",
        dark ? "absolute inset-x-0 top-0 text-white" : "relative border-b border-line bg-white",
      )}
    >
      <nav className="container-page flex items-center justify-between gap-4 py-3 lg:py-4">
        <Link href="/" aria-label={`${brand("name")} – ${t("home")}`} className="shrink-0">
          <Image
            src={logo}
            alt={brand("name")}
            width={locale === "ar" ? 380 : 437}
            height={147}
            unoptimized
            priority
            className="-ms-2 h-14 w-auto lg:h-17"
          />
        </Link>

        <div
          className={cn(
            "hidden gap-1 rounded-full border p-1.5 xl:flex",
            dark ? "border-white/12 bg-white/6 backdrop-blur-md" : "border-transparent",
          )}
        >
          {links.map(({ href, key, label }) => (
            <Link
              key={key}
              href={href}
              aria-current={isActive(href) ? "page" : undefined}
              className={cn(
                "rounded-full px-3.5 py-2.5 text-sm whitespace-nowrap font-medium transition-colors",
                dark
                  ? "text-sage hover:bg-white/10 hover:text-white"
                  : "hover:bg-tint hover:text-green-700",
                !dark && isActive(href) && "bg-tint text-green-700",
              )}
            >
              {label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <FavouritesLink dark={dark} />
          <Suspense>
            <LanguageSwitch dark={dark} />
          </Suspense>
          <Link
            href="/contact"
            className={cn(
              buttonVariants({ variant: dark ? "mint" : "default", size: "sm" }),
              "hidden rounded-full px-5 sm:inline-flex",
            )}
          >
            {t("enquiry")}
          </Link>
          <button
            type="button"
            aria-label={open ? t("close") : t("menu")}
            aria-expanded={open}
            aria-controls="mobile-menu"
            onClick={() => setOpen(!open)}
            className={cn(
              "flex size-11 items-center justify-center rounded-full border xl:hidden",
              dark ? "border-white/20" : "border-field",
            )}
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </nav>

      {open && (
        <div
          id="mobile-menu"
          className="absolute inset-x-4 top-full flex flex-col rounded-2xl border border-line bg-white p-3 text-ink shadow-2xl xl:hidden"
        >
          {links.map(({ href, key, label }) => (
            <Link
              key={key}
              href={href}
              onClick={() => setOpen(false)}
              className="rounded-lg px-4 py-3.5 font-medium hover:bg-tint"
            >
              {label}
            </Link>
          ))}
          <Link
            href="/contact"
            onClick={() => setOpen(false)}
            className={cn(buttonVariants(), "mt-2")}
          >
            {t("enquiry")}
          </Link>
        </div>
      )}
    </header>
  );
}
