import "server-only";
import ar from "../../messages/ar.json";
import en from "../../messages/en.json";
import { cache } from "react";
import { getHome } from "./api";
import type { HomeContent, HomeTextKey, MenuItem, SavedHome } from "./types";

const menuItem = (key: MenuItem["key"]): MenuItem => ({
  key,
  label_en: en.nav[key],
  label_ar: ar.nav[key],
  show: true,
});

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
  featured_eyebrow_en: en.home.featuredEyebrow,
  featured_eyebrow_ar: ar.home.featuredEyebrow,
  featured_title_en: en.home.featuredTitle,
  featured_title_ar: ar.home.featuredTitle,
  map_eyebrow_en: en.home.mapEyebrow,
  map_eyebrow_ar: ar.home.mapEyebrow,
  map_title_en: en.home.mapTitle,
  map_title_ar: ar.home.mapTitle,
  how_eyebrow_en: en.home.howEyebrow,
  how_eyebrow_ar: ar.home.howEyebrow,
  how_title_en: en.home.howTitle,
  how_title_ar: ar.home.howTitle,
  step1_title_en: en.home.steps[1].title,
  step1_title_ar: ar.home.steps[1].title,
  step1_text_en: en.home.steps[1].text,
  step1_text_ar: ar.home.steps[1].text,
  step2_title_en: en.home.steps[2].title,
  step2_title_ar: ar.home.steps[2].title,
  step2_text_en: en.home.steps[2].text,
  step2_text_ar: ar.home.steps[2].text,
  step3_title_en: en.home.steps[3].title,
  step3_title_ar: ar.home.steps[3].title,
  step3_text_en: en.home.steps[3].text,
  step3_text_ar: ar.home.steps[3].text,
  soon_eyebrow_en: en.home.soonEyebrow,
  soon_eyebrow_ar: ar.home.soonEyebrow,
  soon_title_en: en.home.soonTitle,
  soon_title_ar: ar.home.soonTitle,
  soon_text_en: en.home.soonText,
  soon_text_ar: ar.home.soonText,
  soon_button_en: en.home.register,
  soon_button_ar: ar.home.register,
  image_opacity: 40,
  show_search: true,
  show_whatsapp: true,
  show_scene: true,
  show_property: true,
  show_ticker: true,
  show_categories: true,
  show_featured: true,
  show_map: true,
  show_how: true,
  show_soon: true,
  menu: (
    ["properties", "locations", "services", "how", "calculator", "blog", "contact"] as const
  ).map(menuItem),
};

/** The saved texts, with the standard one wherever the office has not saved any. */
export function fullHome(saved: SavedHome | null): HomeContent {
  const own = Object.entries(saved ?? {}).filter(([, value]) => value !== null);
  const content: HomeContent = { ...STANDARD_HOME, ...Object.fromEntries(own) };
  // Pages that are newer than the saved menu come before the last item.
  const missing = STANDARD_HOME.menu.filter((m) => !content.menu.some((own) => own.key === m.key));
  return {
    ...content,
    menu: [...content.menu.slice(0, -1), ...missing, ...content.menu.slice(-1)],
  };
}

export const getHomeContent = cache(async () => {
  const { content, images } = await getHome();
  return { content: fullHome(content), images: images.map((image) => image.url) };
});

export type HomeTexts = Record<HomeTextKey, string> & { words: string[] };

/** The texts in one language, e.g. `badge_en` as `badge`. */
export function homeTexts(content: HomeContent, locale: string): HomeTexts {
  const end = locale === "ar" ? "_ar" : "_en";
  const mine = Object.entries(content)
    .filter(([key]) => key.endsWith(end))
    .map(([key, value]) => [key.slice(0, -end.length), value]);
  return Object.fromEntries(mine) as HomeTexts;
}

const MENU_LINKS: Record<MenuItem["key"], string> = {
  properties: "/properties",
  locations: "/locations",
  services: "/#services",
  how: "/#how",
  calculator: "/calculator",
  blog: "/blog",
  contact: "/contact",
};

/** The main menu. Links to a hidden section of the home page are left out. */
export function menuLinks(content: HomeContent, locale: string, hasBlog: boolean) {
  const hidden = {
    services: !content.show_categories,
    how: !content.show_how,
    blog: !hasBlog,
  };
  return content.menu
    .filter(({ key, show }) => show && !(key in hidden && hidden[key as keyof typeof hidden]))
    .map((item) => ({
      key: item.key,
      href: MENU_LINKS[item.key],
      label: locale === "ar" ? item.label_ar : item.label_en,
    }));
}
