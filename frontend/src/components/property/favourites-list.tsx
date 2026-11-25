"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { PropertyCard } from "@/components/property/property-card";
import { buttonVariants } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { useSaved } from "@/lib/saved";
import type { PropertyCard as Property } from "@/lib/types";

export function FavouritesList() {
  const t = useTranslations("saved");
  const codes = useSaved("favourites");
  const [items, setItems] = useState<Property[] | null>(null);
  const [failed, setFailed] = useState(false);
  const key = codes.join();

  useEffect(() => {
    if (!key) return setItems([]);
    const stop = new AbortController();
    const query = new URLSearchParams(key.split(",").map((code) => ["codes", code]));
    fetch(`/api/property-cards?${query}`, { signal: stop.signal })
      .then((response) => (response.ok ? response.json() : Promise.reject(response.status)))
      .then((found: Property[]) => {
        setItems(found);
        setFailed(false);
      })
      .catch(() => {
        if (!stop.signal.aborted) setFailed(true);
      });
    return () => stop.abort();
  }, [key]);

  if (failed) return <p role="alert">{t("error")}</p>;
  if (!items) return <div className="h-80 animate-pulse rounded-2xl bg-white" />;
  if (!items.length) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-2xl border border-line bg-white px-6 py-16 text-center">
        <p className="text-muted-foreground">{t("empty")}</p>
        <Link href="/properties" className={buttonVariants()}>
          {t("browse")}
        </Link>
      </div>
    );
  }
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {items
        .filter((property) => codes.includes(property.code))
        .map((property) => (
          <PropertyCard key={property.code} property={property} />
        ))}
    </div>
  );
}
