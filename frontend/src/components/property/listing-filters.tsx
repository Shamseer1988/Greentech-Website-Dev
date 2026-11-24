"use client";

import { Search } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useTransition, type FormEvent } from "react";
import { cn } from "cn";
import { buttonVariants } from "@/components/ui/button";
import { Link, useRouter } from "@/i18n/navigation";
import { BUDGETS, budgetRange, nameOf, num, SORTS } from "@/lib/format";
import { listingHref, type ListingQuery } from "@/lib/listing-query";
import type { LocationOut, PropertyTypeOut } from "@/lib/types";

type Props = { query: ListingQuery; types: PropertyTypeOut[]; locations: LocationOut[] };

/** The filters live in the address bar, so results can be shared. Works without JavaScript too. */
export function ListingFilters({ query, types, locations }: Props) {
  const t = useTranslations("listings");
  const locale = useLocale();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function submit(form: HTMLFormElement) {
    const data = new FormData(form);
    const value = (name: string) => String(data.get(name) ?? "");
    const next: ListingQuery = {
      q: value("q").trim(),
      type: value("type"),
      location: value("location"),
      budget: value("budget"),
      sort: value("sort"),
      page: 1,
    };
    startTransition(() => router.push(listingHref(next), { scroll: false }));
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    submit(event.currentTarget);
  }

  const budgetLabel = (value: string) => {
    const { min, max } = budgetRange(value);
    if (!min) return t("under", { max: num(Number(max)) });
    if (!max) return t("above", { min: num(Number(min)) });
    return `${num(Number(min))} – ${num(Number(max))}`;
  };

  const label = "flex flex-col gap-1.5 text-[13px] font-semibold text-muted-foreground";
  return (
    <section className="border-b border-line bg-white" aria-busy={pending}>
      <div className="container-page flex max-w-[1360px] flex-col gap-4 py-6">
        <form
          // A new key refreshes the fields after Back, or after choosing a type chip.
          key={JSON.stringify(query)}
          action={locale === "ar" ? "/ar/properties" : "/properties"}
          onSubmit={onSubmit}
          onChange={(event) => {
            if (event.target instanceof HTMLSelectElement) submit(event.currentTarget);
          }}
          className="grid items-end gap-3 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr_auto]"
        >
          {query.type && <input type="hidden" name="type" value={query.type} />}
          <label className={label}>
            {t("search")}
            <input
              type="search"
              name="q"
              maxLength={100}
              defaultValue={query.q}
              placeholder={t("placeholder")}
              className="field"
            />
          </label>
          <label className={label}>
            {t("location")}
            <select name="location" defaultValue={query.location} className="field">
              <option value="">{t("allLocations")}</option>
              {locations.map((location) => (
                <option key={location.slug} value={location.slug}>
                  {nameOf(location, locale)}
                </option>
              ))}
            </select>
          </label>
          <label className={label}>
            {t("budget")}
            <select name="budget" defaultValue={query.budget} className="field">
              <option value="">{t("any")}</option>
              {BUDGETS.map((budget) => (
                <option key={budget} value={budget}>
                  {budgetLabel(budget)}
                </option>
              ))}
            </select>
          </label>
          <label className={label}>
            {t("sort")}
            <select name="sort" defaultValue={query.sort} className="field">
              {SORTS.map((sort) => (
                <option key={sort} value={sort === "newest" ? "" : sort}>
                  {t(`sorts.${sort}`)}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" className={buttonVariants()}>
            <Search />
            {t("apply")}
          </button>
        </form>

        <nav aria-label={t("typeLabel")} className="-mx-6 flex gap-2.5 overflow-x-auto px-6 pb-1">
          {[{ slug: "", label: t("allTypes") }]
            .concat(
              types
                .filter((type) => !type.coming_soon)
                .map((type) => ({ slug: type.slug, label: nameOf(type, locale) })),
            )
            .map((chip) => (
              <Link
                key={chip.slug}
                href={listingHref({ ...query, type: chip.slug, page: 1 })}
                scroll={false}
                aria-current={chip.slug === query.type ? "true" : undefined}
                className={cn(
                  "flex h-11 flex-none items-center rounded-full border px-4.5 text-sm transition-colors",
                  chip.slug === query.type
                    ? "border-green-700 bg-green-700 font-semibold text-white"
                    : "border-field bg-white font-medium hover:border-green-700",
                )}
              >
                {chip.label}
              </Link>
            ))}
        </nav>
      </div>
    </section>
  );
}
