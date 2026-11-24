import type { MetadataRoute } from "next";
import { getAllProperties, getLocations, getTypes } from "@/lib/api";
import { absoluteUrl, languages } from "@/lib/seo";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [types, locations, properties] = await Promise.all([
    getTypes(),
    getLocations(),
    getAllProperties(),
  ]);
  const paths: { path: string; date?: string }[] = [
    ...["/", "/properties", "/locations", "/contact"].map((path) => ({ path })),
    ...types.filter((t) => t.property_count > 0).map((t) => ({ path: `/properties?type=${t.slug}` })),
    ...locations
      .filter((l) => l.property_count > 0)
      .map((l) => ({ path: `/properties?location=${l.slug}` })),
    ...properties.map((p) => ({ path: `/properties/${p.code}`, date: p.published_at })),
  ];
  // Each page is listed in both languages, and each entry names the other language.
  return paths.flatMap(({ path, date }) =>
    ["en", "ar"].map((locale) => ({
      url: absoluteUrl(path, locale),
      ...(date && { lastModified: date }),
      alternates: { languages: languages(path) },
    })),
  );
}
