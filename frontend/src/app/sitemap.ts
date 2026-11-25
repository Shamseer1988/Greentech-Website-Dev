import type { MetadataRoute } from "next";
import { getAllProperties, getArticles, getLocations, getTypes } from "@/lib/api";
import { absoluteUrl, languages } from "@/lib/seo";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [types, locations, properties, articles] = await Promise.all([
    getTypes(),
    getLocations(),
    getAllProperties(),
    getArticles(),
  ]);
  const paths: { path: string; date?: string }[] = [
    ...["/", "/properties", "/locations", "/calculator", "/contact"].map((path) => ({ path })),
    ...types
      .filter((t) => t.property_count > 0)
      .map((t) => ({ path: `/properties?type=${t.slug}` })),
    ...locations
      .filter((l) => l.property_count > 0)
      .map((l) => ({ path: `/properties?location=${l.slug}` })),
    ...(articles.length ? [{ path: "/blog" }] : []),
    ...articles.map((a) => ({ path: `/blog/${a.slug}`, date: a.updated_at })),
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
