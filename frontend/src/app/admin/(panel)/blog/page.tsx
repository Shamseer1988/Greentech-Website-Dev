import type { Metadata } from "next";
import Link from "next/link";
import { Badge, CARD, PageTitle, qatarTime } from "@/components/admin/ui";
import { buttonVariants } from "@/components/ui/button";
import { adminGet, requireAdminPage } from "@/lib/admin-server";
import type { ArticleFull } from "@/lib/admin-types";

export const metadata: Metadata = { title: "Blog" };

export default async function BlogAdminPage() {
  await requireAdminPage();
  const articles = await adminGet<ArticleFull[]>("/articles");
  return (
    <>
      <PageTitle
        title="Blog"
        text="Articles and area guides. The Blog menu link appears when one is published."
      >
        <Link href="/admin/blog/new" className={buttonVariants({ size: "sm" })}>
          + New article
        </Link>
      </PageTitle>
      <div className="flex flex-col gap-3">
        {articles.map((a) => (
          <Link
            key={a.id}
            href={`/admin/blog/${a.id}`}
            className={`${CARD} flex flex-wrap items-center justify-between gap-3 hover:shadow-md`}
          >
            <span className="flex flex-col">
              <strong className="text-slate">{a.title_en}</strong>
              <span className="text-sm text-muted-foreground" dir="auto">
                {a.title_ar || "No Arabic title yet"}
              </span>
            </span>
            <span className="flex items-center gap-3 text-sm text-muted-foreground">
              Changed {qatarTime(a.updated_at)}
              <Badge value={a.published ? "published" : "draft"} />
            </span>
          </Link>
        ))}
        {articles.length === 0 && (
          <p className={`${CARD} text-center text-muted-foreground`}>No articles yet.</p>
        )}
      </div>
    </>
  );
}
