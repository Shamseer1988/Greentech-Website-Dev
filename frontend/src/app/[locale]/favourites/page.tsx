import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { FavouritesList } from "@/components/property/favourites-list";
import { pageMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("saved");
  const brand = await getTranslations("brand");
  return pageMetadata({
    locale: await getLocale(),
    path: "/favourites",
    title: t("title"),
    description: t("text"),
    siteName: brand("name"),
    hidden: true,
  });
}

export default async function FavouritesPage() {
  const t = await getTranslations("saved");
  return (
    <div className="container-page max-w-[1240px] pt-12 pb-20">
      <h1 className="mb-2 text-4xl font-bold text-slate lg:text-5xl">{t("title")}</h1>
      <p className="mb-8 text-lg text-muted-foreground">{t("text")}</p>
      <FavouritesList />
    </div>
  );
}
