import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DeleteButton } from "@/components/admin/delete-button";
import { MediaManager } from "@/components/admin/media-manager";
import { PropertyForm } from "@/components/admin/property-form";
import { Badge, PageTitle, SMALL_BUTTON } from "@/components/admin/ui";
import { adminGet, getMe } from "@/lib/admin-server";
import type { LocationFull, PropertyFull, TypeFull } from "@/lib/admin-types";

export const metadata: Metadata = { title: "Edit property" };

export default async function EditPropertyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^\d{1,10}$/.test(id)) notFound();
  const [me, property, types, locations] = await Promise.all([
    getMe(),
    adminGet<PropertyFull>(`/properties/${id}`),
    adminGet<TypeFull[]>("/property-types"),
    adminGet<LocationFull[]>("/locations"),
  ]);

  return (
    <>
      <PageTitle title={property.title_en} text={property.code}>
        <span className="self-center">
          <Badge value={property.status} />
        </span>
        {property.status !== "draft" && (
          <Link href={`/properties/${property.code}`} target="_blank" className={SMALL_BUTTON}>
            View on website
          </Link>
        )}
        {me.role === "admin" && (
          <DeleteButton
            path={`/properties/${property.id}`}
            question={`Delete ${property.code} and all its photos? This cannot be undone. To only hide it, set the status to draft.`}
            next="/admin/properties"
          />
        )}
      </PageTitle>
      <PropertyForm property={property} types={types} locations={locations} />
      <MediaManager propertyId={property.id} initial={property.media} />
    </>
  );
}
