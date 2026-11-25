import type { ArticleCard, ArticleDetail } from "./types";

export function articleTexts(article: ArticleCard, locale: string) {
  const arabic = locale === "ar";
  return {
    title: (arabic && article.title_ar) || article.title_en,
    summary: (arabic && article.summary_ar) || article.summary_en,
  };
}

/** The text, and its own language (the English text when there is no Arabic one). */
export function articleBody(article: ArticleDetail, locale: string) {
  return locale === "ar" && article.body_ar
    ? { text: article.body_ar, lang: "ar" }
    : { text: article.body_en, lang: "en" };
}

export const articleDate = (iso: string, locale: string) =>
  new Intl.DateTimeFormat(locale === "ar" ? "ar-QA-u-nu-latn" : "en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Qatar",
  }).format(new Date(iso));
