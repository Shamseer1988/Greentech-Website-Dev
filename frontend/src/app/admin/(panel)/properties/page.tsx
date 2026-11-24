import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Pager, readFilters } from "@/components/admin/pager";
import { QuickEdit } from "@/components/admin/quick-edit";
import { PageTitle, SMALL_BUTTON } from "@/components/admin/ui";
import { buttonVariants } from "@/components/ui/button";
import { adminGet, getMe } from "@/lib/admin-server";
import { STATUSES, type Paged, type PropertyRow } from "@/lib/admin-types";
import { num } from "@/lib/format";

export const metadata: Metadata = { title: "Properties" };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function PropertiesPage({ searchParams }: Props) {
  const { query, api } = await readFilters(searchParams, { status: STATUSES });
  const [me, data] = await Promise.all([
    getMe(),
    adminGet<Paged<PropertyRow>>(`/properties?${api}`),
  ]);

  return (
    <>
      <PageTitle title="Properties" text="Add, edit, publish and mark units as rented.">
        {me.role === "admin" && (
          <a
            href="/api/admin/export/properties"
            download
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            Export Excel
          </a>
        )}
        <Link href="/admin/properties/new" className={buttonVariants({ size: "sm" })}>
          + Add property
        </Link>
      </PageTitle>

      <form key={JSON.stringify(query)} className="flex flex-wrap gap-2.5">
        <input
          type="search"
          name="q"
          aria-label="Search"
          defaultValue={query.q}
          placeholder="Code, title or area…"
          className="field max-w-80"
        />
        <select
          name="status"
          aria-label="Status"
          defaultValue={query.status}
          className="field w-auto capitalize"
        >
          <option value="">All statuses</option>
          {STATUSES.map((status) => (
            <option key={status}>{status}</option>
          ))}
        </select>
        <button type="submit" className={buttonVariants({ variant: "outline" })}>
          Search
        </button>
      </form>

      <div className="relative overflow-x-auto rounded-2xl bg-white">
        <table className="w-full min-w-[900px] text-sm [&_td]:border-b [&_td]:border-[#eef1ee] [&_td]:px-4 [&_td]:py-3 [&_th]:border-b [&_th]:border-line [&_th]:px-4 [&_th]:py-3.5">
          <thead>
            <tr className="text-start text-xs tracking-wide text-muted-foreground uppercase [&_th]:text-start">
              <th>Property</th>
              <th>Type</th>
              <th>Location</th>
              <th>Rent (QAR)</th>
              <th>Status</th>
              <th>Featured</th>
              <th>Enquiries</th>
              <th>
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((p) => (
              <tr key={p.id}>
                <td>
                  <span className="flex items-center gap-3">
                    <span className="photo-empty relative h-10.5 w-14 flex-none overflow-hidden rounded-lg">
                      {p.cover_url && (
                        <Image src={p.cover_url} alt="" fill sizes="56px" className="object-cover" />
                      )}
                    </span>
                    <span className="flex flex-col">
                      <span className="font-semibold">{p.title_en}</span>
                      <span className="text-xs text-muted-foreground">
                        {p.code} · {p.photo_count} photos
                      </span>
                    </span>
                  </span>
                </td>
                <td>{p.type.name_en}</td>
                <td>{p.location.name_en}</td>
                <td>{p.rent_qar === null ? "On request" : num(p.rent_qar)}</td>
                <QuickEdit id={p.id} code={p.code} status={p.status} featured={p.featured} />
                <td>{p.enquiry_count}</td>
                <td className="whitespace-nowrap">
                  <Link href={`/admin/properties/${p.id}`} className={SMALL_BUTTON}>
                    Edit
                  </Link>{" "}
                  <Link href={`/admin/properties/${p.id}#photos`} className={SMALL_BUTTON}>
                    Photos
                  </Link>
                </td>
              </tr>
            ))}
            {data.items.length === 0 && (
              <tr>
                <td colSpan={8} className="text-center text-muted-foreground">
                  No properties found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <Pager path="/admin/properties" query={query} {...data} />
    </>
  );
}
