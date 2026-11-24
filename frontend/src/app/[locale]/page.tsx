import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { FeaturedSlider } from "@/components/home/featured-slider";
import { Hero } from "@/components/home/hero";
import { HowItWorks } from "@/components/home/how-it-works";
import { QatarMap } from "@/components/home/qatar-map";
import { Categories, ResidentialCta, Ticker } from "@/components/home/sections";
import { getFeatured, getLocations, getTypes } from "@/lib/api";
import { pageMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("meta");
  const brand = await getTranslations("brand");
  return pageMetadata({
    locale: await getLocale(),
    path: "/",
    title: t("title"),
    fullTitle: true,
    description: t("description"),
    siteName: brand("name"),
  });
}

export default async function HomePage() {
  const [types, locations, featured] = await Promise.all([
    getTypes(),
    getLocations(),
    getFeatured(),
  ]);

  return (
    <>
      <Hero types={types} locations={locations} highlight={featured[0]} />
      <Ticker types={types} locations={locations} />
      <Categories types={types} />
      <FeaturedSlider items={featured} />
      <QatarMap locations={locations} />
      <HowItWorks />
      <ResidentialCta />
    </>
  );
}
