import type { Metadata } from "next";
import { SITE_URL } from "./site";

const base = SITE_URL.replace(/\/$/, "");

export const DEFAULT_IMAGE = "/brand/og-image-1200x630.png";

/** Search engines may list the site only at its real address, never on a test PC. */
export const isLive = /^https:\/\/(?!localhost|127\.)/.test(base);

/** English has no prefix, Arabic starts with /ar. */
export function absoluteUrl(path: string, locale = "en"): string {
  const clean = path === "/" ? "" : path;
  return `${base}${locale === "ar" ? "/ar" : ""}${clean}` || "/";
}

export function languages(path: string): Record<string, string> {
  return {
    en: absoluteUrl(path, "en"),
    ar: absoluteUrl(path, "ar"),
    "x-default": absoluteUrl(path, "en"),
  };
}

export function shareImage(code: string, coverUrl: string | null): string {
  if (!coverUrl) return DEFAULT_IMAGE;
  // A new cover gets a new address, so old previews are not reused.
  const version = coverUrl.split("/").at(-1)?.slice(0, 8);
  return `/share/${code}.jpg?v=${version}`;
}

/** One short line for search results. */
export function summary(text: string, max = 160): string {
  const line = text.replace(/\s+/g, " ").trim();
  return line.length <= max ? line : `${line.slice(0, max - 1).replace(/\s+\S*$/, "")}…`;
}

type Page = {
  locale: string;
  path: string;
  title: string;
  description: string;
  siteName: string;
  image?: string;
  /** The title already has the company name. */
  fullTitle?: boolean;
  hidden?: boolean;
};

export function pageMetadata(page: Page): Metadata {
  const { locale, path, title, description, siteName, image = DEFAULT_IMAGE } = page;
  const url = absoluteUrl(path, locale);
  return {
    title: page.fullTitle ? { absolute: title } : title,
    description,
    alternates: { canonical: url, languages: languages(path) },
    ...((page.hidden || !isLive) && { robots: { index: false, follow: true } }),
    openGraph: {
      type: "website",
      url,
      title,
      description,
      siteName,
      locale: locale === "ar" ? "ar_QA" : "en_QA",
      alternateLocale: locale === "ar" ? "en_QA" : "ar_QA",
      images: [{ url: image, width: 1200, height: 630, alt: title }],
    },
    twitter: { card: "summary_large_image", title, description, images: [image] },
  };
}
