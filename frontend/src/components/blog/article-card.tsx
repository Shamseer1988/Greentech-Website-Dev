import Image from "next/image";
import { useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { articleDate, articleTexts } from "@/lib/article";
import { nameOf } from "@/lib/format";
import type { ArticleCard as Article } from "@/lib/types";

export function ArticleCard({ article }: { article: Article }) {
  const locale = useLocale();
  const { title, summary } = articleTexts(article, locale);
  const label = article.location ?? article.type;
  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-white transition duration-300 hover:-translate-y-1 hover:shadow-[0_18px_40px_rgb(4_29_21/.14)]">
      <div className="photo-empty relative flex h-48 items-center justify-center overflow-hidden">
        {article.cover_url ? (
          <Image
            src={article.cover_url}
            alt=""
            fill
            sizes="(min-width: 1024px) 400px, (min-width: 640px) 50vw, 100vw"
            className="object-cover transition-transform duration-700 group-hover:scale-105 motion-reduce:transform-none"
          />
        ) : (
          <Image
            src="/brand/greentech-emblem.svg"
            alt=""
            width={56}
            height={56}
            unoptimized
            className="h-12 w-auto opacity-70"
          />
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-5">
        <span className="text-xs font-semibold text-rose">
          {label ? `${nameOf(label, locale)} · ` : ""}
          <time dateTime={article.published_at}>{articleDate(article.published_at, locale)}</time>
        </span>
        <h2 className="text-xl leading-snug font-semibold text-slate">
          <Link
            href={`/blog/${article.slug}`}
            className="after:absolute after:inset-0 hover:text-green-700"
          >
            {title}
          </Link>
        </h2>
        <p className="line-clamp-3 text-sm leading-relaxed text-muted-foreground">{summary}</p>
      </div>
    </article>
  );
}
