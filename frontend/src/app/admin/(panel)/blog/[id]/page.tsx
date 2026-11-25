import type { Metadata } from "next";
import Link from "next/link";
import { ArticleEditor } from "@/components/admin/article-editor";
import { PageTitle } from "@/components/admin/ui";
import { buttonVariants } from "@/components/ui/button";
import { adminGet, requireAdminPage } from "@/lib/admin-server";
import type { ArticleFull, LocationFull, TypeFull } from "@/lib/admin-types";

export const metadata: Metadata = { title: "Edit article" };

type Props = { params: Promise<{ id: string }> };

export default async function EditArticlePage({ params }: Props) {
  await requireAdminPage();
  const { id } = await params;
  const [article, types, locations] = await Promise.all([
    adminGet<ArticleFull>(`/articles/${encodeURIComponent(id)}`),
    adminGet<TypeFull[]>("/property-types"),
    adminGet<LocationFull[]>("/locations"),
  ]);
  return (
    <>
      <PageTitle title="Edit article">
        {article.published && (
          <Link
            href={`/blog/${article.slug}`}
            target="_blank"
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            View on website
          </Link>
        )}
      </PageTitle>
      <ArticleEditor key={article.id} article={article} types={types} locations={locations} />
    </>
  );
}
