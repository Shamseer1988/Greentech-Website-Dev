import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DeleteButton } from "@/components/admin/delete-button";
import { MediaManager } from "@/components/admin/media-manager";
import { PropertyForm } from "@/components/admin/property-form";
import { SocialPanel } from "@/components/admin/social-panel";
import { Badge, PageTitle, SMALL_BUTTON } from "@/components/admin/ui";
import { adminGet, getMe } from "@/lib/admin-server";
import type { LocationFull, PropertyFull, SocialState, TypeFull } from "@/lib/admin-types";
import { num } from "@/lib/format";

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

  const social =
    me.role === "admin" ? await adminGet<SocialState>(`/properties/${property.id}/social`) : null;
  const area = locations.find((l) => l.id === property.location_id);

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
      {social && (
        <SocialPanel
          key={property.updated_at}
          propertyId={property.id}
          state={social}
          caption={caption(property, area, social.site_url)}
          problem={
            property.status === "draft"
              ? "Publish the property first (status not draft)."
              : property.media.some((m) => m.kind === "image")
                ? null
                : "Add a photo first."
          }
        />
      )}
    </>
  );
}

function caption(property: PropertyFull, area: LocationFull | undefined, siteUrl: string): string {
  return [
    property.title_en + (area ? ` – ${area.name_en}, Qatar` : ""),
    property.title_ar + (property.title_ar && area ? ` – ${area.name_ar}، قطر` : ""),
    property.rent_qar !== null && `QAR ${num(property.rent_qar)} / month`,
    `Code: ${property.code}`,
    `${siteUrl}/properties/${property.code}`,
  ]
    .filter(Boolean)
    .join("\n");
}
