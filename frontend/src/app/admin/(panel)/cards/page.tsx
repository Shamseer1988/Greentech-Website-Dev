import type { Metadata } from "next";
import { CardPhotoEditor } from "@/components/admin/card-photo-editor";
import { PageTitle } from "@/components/admin/ui";
import { adminGet, requireAdminPage } from "@/lib/admin-server";
import type { TypeFull } from "@/lib/admin-types";

export const metadata: Metadata = { title: "Category cards" };

export default async function CardsPage() {
  await requireAdminPage();
  const types = await adminGet<TypeFull[]>("/property-types");
  return (
    <>
      <PageTitle
        title="Category cards"
        text="Background photos of the “What we rent” cards on the home page. JPG, PNG or WebP up to 20 MB, best 1400 × 900 or larger."
      />
      <div className="grid gap-5 md:grid-cols-2 2xl:grid-cols-3">
        {/* The first card on the home page is the dark one. */}
        {types.map((type, i) => (
          <CardPhotoEditor key={type.id} initial={type} dark={i === 0} />
        ))}
      </div>
    </>
  );
}
