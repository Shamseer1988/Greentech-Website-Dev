import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { FeaturedSlider } from "@/components/home/featured-slider";
import { Hero } from "@/components/home/hero";
import { HowItWorks } from "@/components/home/how-it-works";
import { QatarMap } from "@/components/home/qatar-map";
import { Categories, ResidentialCta, Ticker } from "@/components/home/sections";
import { getFeatured, getLocations, getTypes } from "@/lib/api";
import { getHomeContent, homeTexts } from "@/lib/home-content";
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
    getHomeContent(),
  ]);

  const { content, images } = home;
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
        images={images}
      />
      {content.show_ticker && <Ticker types={types} locations={locations} />}
      {content.show_categories && (
        <Categories
          types={types}
          eyebrow={texts.categories_eyebrow}
          title={texts.categories_title}
        />
      )}
      {content.show_featured && (
        <FeaturedSlider
          items={featured}
          eyebrow={texts.featured_eyebrow}
          title={texts.featured_title}
        />
      )}
      {content.show_map && (
        <QatarMap
          locations={locations}
          residentialSoon={residentialSoon}
          eyebrow={texts.map_eyebrow}
          title={texts.map_title}
        />
      )}
      {content.show_how && (
        <HowItWorks
          eyebrow={texts.how_eyebrow}
          title={texts.how_title}
          steps={[
            { title: texts.step1_title, text: texts.step1_text },
            { title: texts.step2_title, text: texts.step2_text },
            { title: texts.step3_title, text: texts.step3_text },
          ]}
        />
      )}
      {residentialSoon && content.show_soon && <ResidentialCta texts={texts} />}
    </>
  );
}
