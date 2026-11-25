import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { FeaturedSlider } from "@/components/home/featured-slider";
import { Hero } from "@/components/home/hero";
import { HowItWorks } from "@/components/home/how-it-works";
import { QatarMap } from "@/components/home/qatar-map";
import { Categories, ResidentialCta, Ticker } from "@/components/home/sections";
import { getFeatured, getHome, getLocations, getTypes } from "@/lib/api";
import { homeTexts, STANDARD_HOME } from "@/lib/home-content";
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
  const locale = await getLocale();
  const [types, locations, featured, home] = await Promise.all([
    getTypes(),
    getLocations(),
    getFeatured(),
    getHome(),
  ]);

  const content = home.content ?? STANDARD_HOME;
  const texts = homeTexts(content, locale);
  const residentialSoon = types.some((type) => type.slug === "residential" && type.coming_soon);

  return (
    <>
      <Hero
        types={types}
        locations={locations}
        highlight={featured[0]}
        content={content}
        texts={texts}
        images={home.images.map((image) => image.url)}
      />
      <Ticker types={types} locations={locations} />
      <Categories types={types} eyebrow={texts.eyebrow} title={texts.title} />
      <FeaturedSlider items={featured} />
      <QatarMap locations={locations} residentialSoon={residentialSoon} />
      <HowItWorks />
      {residentialSoon && <ResidentialCta />}
    </>
  );
}
