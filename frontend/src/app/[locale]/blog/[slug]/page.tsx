import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { JsonLd } from "@/components/json-ld";
import { ArticleText } from "@/components/markdown";
import { PropertyCard } from "@/components/property/property-card";
import { buttonVariants } from "@/components/ui/button";
import { WhatsAppIcon, WhatsAppLink } from "@/components/whatsapp-link";
import { Link } from "@/i18n/navigation";
import { getArticle, searchProperties } from "@/lib/api";
import { articleBody, articleDate, articleTexts } from "@/lib/article";
import { article as articleData, breadcrumbs } from "@/lib/schema-org";
import { pageMetadata, summary as oneLine } from "@/lib/seo";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const article = await getArticle((await params).slug);
  if (!article) return {};
  const locale = await getLocale();
  const brand = await getTranslations("brand");
  const { title, summary } = articleTexts(article, locale);
  return pageMetadata({
    locale,
    path: `/blog/${article.slug}`,
    title,
    description: oneLine(summary || title),
    siteName: brand("name"),
    image: article.cover_url ?? undefined,
  });
}

export default async function ArticlePage({ params }: Props) {
  const article = await getArticle((await params).slug);
  if (!article) notFound();
  const t = await getTranslations("blog");
  const common = await getTranslations("common");
  const nav = await getTranslations("nav");
  const locale = await getLocale();
  const { title, summary } = articleTexts(article, locale);
  const body = articleBody(article, locale);

  const query = new URLSearchParams({ page_size: "3" });
  if (article.location) query.set("location", article.location.slug);
  if (article.type) query.set("type", article.type.slug);
  const related = await searchProperties(query).catch(() => null);
  const all = new URLSearchParams(query);
  all.delete("page_size");

  return (
    <>
      <JsonLd data={articleData(article, locale)} />
      <JsonLd
        data={breadcrumbs(
          [
            { name: nav("home"), path: "/" },
            { name: t("title"), path: "/blog" },
            { name: title, path: `/blog/${article.slug}` },
          ],
          locale,
        )}
      />
      <article className="container-page max-w-[860px] pt-10 pb-14">
        <Link href="/blog" className="text-sm font-semibold text-green-700 hover:underline">
          {t("title")}
        </Link>
        <h1 className="mt-3 text-4xl leading-tight font-bold text-slate lg:text-5xl">{title}</h1>
        <time dateTime={article.published_at} className="mt-3 block text-sm text-muted-foreground">
          {articleDate(article.published_at, locale)}
        </time>
        {summary && <p className="mt-5 text-xl leading-relaxed text-muted-foreground">{summary}</p>}
        {article.cover_url && (
          <div className="relative mt-7 aspect-16/9 overflow-hidden rounded-3xl">
            <Image
              src={article.cover_url}
              alt=""
              fill
              priority
              sizes="(min-width: 900px) 820px, 100vw"
              className="object-cover"
            />
          </div>
        )}
        <div className="mt-8" lang={body.lang} dir={body.lang === "ar" ? "rtl" : "ltr"}>
          <ArticleText text={body.text} />
        </div>
        <div className="mt-10 flex flex-wrap gap-3 rounded-2xl bg-tint p-6">
          <WhatsAppLink
            text={common("waGeneral")}
            className={buttonVariants({ variant: "whatsapp" })}
          >
            <WhatsAppIcon />
            {common("whatsappUs")}
          </WhatsAppLink>
          <Link href="/contact" className={buttonVariants({ variant: "outline" })}>
            {nav("enquiry")}
          </Link>
        </div>
      </article>
      {related && related.items.length > 0 && (
        <section className="container-page max-w-[1240px] pb-20">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
            <h2 className="text-3xl font-bold text-slate">{t("related")}</h2>
            <Link
              href={all.size ? `/properties?${all}` : "/properties"}
              className="font-semibold text-green-700"
            >
              {t("seeAll")}
            </Link>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {related.items.map((property) => (
              <PropertyCard key={property.code} property={property} />
            ))}
          </div>
        </section>
      )}
    </>
  );
}
