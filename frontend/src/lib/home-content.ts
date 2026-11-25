import "server-only";
import ar from "../../messages/ar.json";
import en from "../../messages/en.json";
import type { HomeContent } from "./types";

/** Used until the office saves its own texts in the admin panel. */
export const STANDARD_HOME: HomeContent = {
  badge_en: en.home.badge,
  badge_ar: ar.home.badge,
  start_en: en.home.rent,
  start_ar: ar.home.rent,
  words_en: Object.values(en.home.words),
  words_ar: Object.values(ar.home.words),
  end_en: en.home.across,
  end_ar: ar.home.across,
  intro_en: en.home.intro,
  intro_ar: ar.home.intro,
  chip_label_en: en.home.chipReply,
  chip_label_ar: ar.home.chipReply,
  chip_text_en: en.home.chipText,
  chip_text_ar: ar.home.chipText,
  categories_eyebrow_en: en.home.categoriesEyebrow,
  categories_eyebrow_ar: ar.home.categoriesEyebrow,
  categories_title_en: en.home.categoriesTitle,
  categories_title_ar: ar.home.categoriesTitle,
  image_opacity: 40,
  show_search: true,
  show_whatsapp: true,
  show_scene: true,
  show_property: true,
};

/** The texts in one language. */
export function homeTexts(content: HomeContent, locale: string) {
  const arabic = locale === "ar";
  return {
    badge: arabic ? content.badge_ar : content.badge_en,
    start: arabic ? content.start_ar : content.start_en,
    words: arabic ? content.words_ar : content.words_en,
    end: arabic ? content.end_ar : content.end_en,
    intro: arabic ? content.intro_ar : content.intro_en,
    chipLabel: arabic ? content.chip_label_ar : content.chip_label_en,
    chipText: arabic ? content.chip_text_ar : content.chip_text_en,
    eyebrow: arabic ? content.categories_eyebrow_ar : content.categories_eyebrow_en,
    title: arabic ? content.categories_title_ar : content.categories_title_en,
  };
}
