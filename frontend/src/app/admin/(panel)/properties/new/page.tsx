import type { Metadata } from "next";
import { PropertyForm } from "@/components/admin/property-form";
import { PageTitle } from "@/components/admin/ui";
import { adminGet } from "@/lib/admin-server";
import type { LocationFull, TypeFull } from "@/lib/admin-types";

export const metadata: Metadata = { title: "Add property" };

export default async function NewPropertyPage() {
  const [types, locations] = await Promise.all([
    adminGet<TypeFull[]>("/property-types"),
    adminGet<LocationFull[]>("/locations"),
  ]);
  return (
    <>
      <PageTitle title="Add property" text="Save first, then add photos." />
      <PropertyForm types={types} locations={locations} />
    </>
  );
}
