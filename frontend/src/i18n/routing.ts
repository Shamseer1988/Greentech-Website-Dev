import { defineRouting } from "next-intl/routing";

// English: /properties   Arabic: /ar/properties
export const routing = defineRouting({
  locales: ["en", "ar"],
  defaultLocale: "en",
  localePrefix: "as-needed",
  // Always open English first; visitors choose Arabic with the button.
  localeDetection: false,
  // The pages name their other language themselves (src/lib/seo.ts).
  alternateLinks: false,
});

export type Locale = (typeof routing.locales)[number];
