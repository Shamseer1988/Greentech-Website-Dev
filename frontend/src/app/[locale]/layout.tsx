import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations } from "next-intl/server";
import { Analytics } from "@/components/analytics";
import { ErrorBoundary } from "@/components/error-boundary";
import { JsonLd } from "@/components/json-ld";
import { ContactBar } from "@/components/layout/contact-bar";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { MotionProvider } from "@/components/motion/motion-provider";
import { SiteProvider } from "@/components/site-provider";
import { getSite } from "@/lib/api";
import { routing } from "@/i18n/routing";
import { welcome } from "@/lib/assistant/answer";
import { getHomeContent, menuLinks } from "@/lib/home-content";
import { company } from "@/lib/schema-org";
import { isLive } from "@/lib/seo";
import { SITE_URL } from "@/lib/site";
import { fontVariables } from "../fonts";
import "../globals.css";

type Params = { params: Promise<{ locale: string }> };

export const viewport: Viewport = { themeColor: "#062a1f" };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const t = await getTranslations({ locale, namespace: "meta" });
  const brand = await getTranslations({ locale, namespace: "brand" });
  return {
    metadataBase: new URL(SITE_URL),
    title: { default: t("title"), template: `%s | ${brand("name")}` },
    description: t("description"),
    ...(!isLive && { robots: { index: false, follow: true } }),
    ...(process.env.GOOGLE_SITE_VERIFICATION && {
      verification: { google: process.env.GOOGLE_SITE_VERIFICATION },
    }),
  };
}

export default async function LocaleLayout({
  children,
  params,
}: Params & { children: React.ReactNode }) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const t = await getTranslations({ locale, namespace: "nav" });
  const brand = await getTranslations({ locale, namespace: "brand" });

  const [{ content }, chat, site] = await Promise.all([
    getHomeContent(),
    welcome(locale),
    getSite(),
  ]);

  return (
    <html lang={locale} dir={locale === "ar" ? "rtl" : "ltr"} className={fontVariables}>
      <body>
        <JsonLd data={company(brand("name"), locale, site)} />
        <NextIntlClientProvider>
          <SiteProvider site={site}>
            <MotionProvider>
              <a
                href="#main"
                className="sr-only focus:not-sr-only focus:fixed focus:start-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-3"
              >
                {t("skip")}
              </a>
              <SiteHeader links={menuLinks(content, locale)} />
              <main id="main">
                <ErrorBoundary>{children}</ErrorBoundary>
              </main>
              <SiteFooter />
              <ContactBar
                chat={chat.enabled ? { text: chat.text, suggestions: chat.suggestions } : null}
              />
              <Analytics />
            </MotionProvider>
          </SiteProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
