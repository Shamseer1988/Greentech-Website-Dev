import type { Metadata } from "next";
import { CategoryEditor } from "@/components/admin/category-editor";
import { PageTitle } from "@/components/admin/ui";
import { adminGet, requireAdminPage } from "@/lib/admin-server";
import type { TypeFull } from "@/lib/admin-types";

export const metadata: Metadata = { title: "Categories" };

export default async function CategoriesPage() {
  await requireAdminPage();
  const types = await adminGet<TypeFull[]>("/property-types");
  const ids = types.map((type) => type.id);
  // The first card shown on the home page is the large dark one.
  const first = types.find((type) => type.is_active)?.id;
  return (
    <>
      <PageTitle
        title="Categories"
        text="Cards on the home page, search filters, the enquiry form and the footer. The first one is the large card."
      />
      {types.map((type) => (
        <CategoryEditor key={type.id} type={type} ids={ids} dark={type.id === first} />
      ))}
      {/* A new key empties the form after adding. */}
      <CategoryEditor key={`new-${types.length}`} />
    </>
  );
}
