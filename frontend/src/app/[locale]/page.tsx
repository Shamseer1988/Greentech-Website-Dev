import { FeaturedSlider } from "@/components/home/featured-slider";
import { Hero } from "@/components/home/hero";
import { HowItWorks } from "@/components/home/how-it-works";
import { QatarMap } from "@/components/home/qatar-map";
import { Categories, ResidentialCta, Ticker } from "@/components/home/sections";
import { getFeatured, getLocations, getTypes } from "@/lib/api";

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
