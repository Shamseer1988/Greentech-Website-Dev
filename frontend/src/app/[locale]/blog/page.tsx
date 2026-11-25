import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { ArticleCard } from "@/components/blog/article-card";
import { getArticles } from "@/lib/api";
import { pageMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("blog");
  const brand = await getTranslations("brand");
  return pageMetadata({
    locale: await getLocale(),
    path: "/blog",
    title: t("title"),
    description: t("text"),
    siteName: brand("name"),
    hidden: (await getArticles()).length === 0,
  });
}

export default async function BlogPage() {
  const t = await getTranslations("blog");
  const articles = await getArticles();
  return (
    <div className="container-page max-w-[1240px] pt-12 pb-20">
      <h1 className="mb-2 text-4xl font-bold text-slate lg:text-5xl">{t("title")}</h1>
      <p className="mb-8 max-w-180 text-lg text-muted-foreground">{t("text")}</p>
      {articles.length === 0 && <p className="text-muted-foreground">{t("empty")}</p>}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {articles.map((article) => (
          <ArticleCard key={article.slug} article={article} />
        ))}
      </div>
    </div>
  );
}
