import type { Metadata } from "next";
import { LocationEditor } from "@/components/admin/location-editor";
import { PageTitle } from "@/components/admin/ui";
import { adminGet, requireAdminPage } from "@/lib/admin-server";
import type { LocationFull } from "@/lib/admin-types";

export const metadata: Metadata = { title: "Locations" };

export default async function LocationsPage() {
  await requireAdminPage();
  const locations = await adminGet<LocationFull[]>("/locations");
  return (
    <>
      <PageTitle title="Locations" text="Areas shown on the website and in the search." />
      {locations.map((location) => (
        <LocationEditor key={location.id} location={location} />
      ))}
      {/* A new key empties the form after adding. */}
      <LocationEditor key={`new-${locations.length}`} />
    </>
  );
}
