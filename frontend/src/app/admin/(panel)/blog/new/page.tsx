import type { Metadata } from "next";
import { ArticleEditor } from "@/components/admin/article-editor";
import { PageTitle } from "@/components/admin/ui";
import { adminGet, requireAdminPage } from "@/lib/admin-server";
import type { LocationFull, TypeFull } from "@/lib/admin-types";

export const metadata: Metadata = { title: "New article" };

export default async function NewArticlePage() {
  await requireAdminPage();
  const [types, locations] = await Promise.all([
    adminGet<TypeFull[]>("/property-types"),
    adminGet<LocationFull[]>("/locations"),
  ]);
  return (
    <>
      <PageTitle title="New article" />
      <ArticleEditor types={types} locations={locations} />
    </>
  );
}
