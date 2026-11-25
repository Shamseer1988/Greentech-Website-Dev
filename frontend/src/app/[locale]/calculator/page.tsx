import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { Calculator } from "@/components/calculator";
import { getAllProperties } from "@/lib/api";
import { pageMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("calculator");
  const brand = await getTranslations("brand");
  return pageMetadata({
    locale: await getLocale(),
    path: "/calculator",
    title: t("title"),
    description: t("text"),
    siteName: brand("name"),
  });
}

export default async function CalculatorPage() {
  const t = await getTranslations("calculator");
  const properties = (await getAllProperties()).filter((p) => p.rooms || p.capacity_persons);
  return (
    <div className="container-page max-w-[1240px] pt-12 pb-20">
      <h1 className="mb-2 text-4xl font-bold text-slate lg:text-5xl">{t("title")}</h1>
      <p className="mb-8 max-w-180 text-lg text-muted-foreground">{t("text")}</p>
      <Calculator properties={properties} />
    </div>
  );
}
