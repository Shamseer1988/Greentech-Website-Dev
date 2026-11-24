import type { Metadata } from "next";
import { EnquiryCard } from "@/components/admin/enquiry-card";
import { Pager, readFilters } from "@/components/admin/pager";
import { CARD, PageTitle } from "@/components/admin/ui";
import { buttonVariants } from "@/components/ui/button";
import { adminGet, getMe } from "@/lib/admin-server";
import { ENQUIRY_STATUSES, type AdminUser, type EnquiryRow, type Paged } from "@/lib/admin-types";

export const metadata: Metadata = { title: "Enquiries" };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function EnquiriesPage({ searchParams }: Props) {
  const { query, api } = await readFilters(searchParams, {
    status: ENQUIRY_STATUSES,
    assigned: ["me", "none"],
  });
  const [me, users, data] = await Promise.all([
    getMe(),
    adminGet<AdminUser[]>("/users"),
    adminGet<Paged<EnquiryRow>>(`/enquiries?${api}`),
  ]);

  return (
    <>
      <PageTitle
        title="Enquiries"
        text={
          me.role === "admin"
            ? "Messages from the website."
            : "Your enquiries, and those nobody has taken yet."
        }
      >
        {me.role === "admin" && (
          <a
            href="/api/admin/export/enquiries"
            download
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            Export Excel
          </a>
        )}
      </PageTitle>

      <form key={JSON.stringify(query)} className="flex flex-wrap gap-2.5">
        <input
          type="search"
          name="q"
          aria-label="Search"
          defaultValue={query.q}
          placeholder="Name, company, phone…"
          className="field max-w-80"
        />
        <select
          name="status"
          aria-label="Status"
          defaultValue={query.status}
          className="field w-auto capitalize"
        >
          <option value="">All statuses</option>
          {ENQUIRY_STATUSES.map((status) => (
            <option key={status}>{status}</option>
          ))}
        </select>
        <select
          name="assigned"
          aria-label="Assigned to"
          defaultValue={query.assigned}
          className="field w-auto"
        >
          <option value="">Everyone</option>
          <option value="me">Mine</option>
          <option value="none">Not assigned</option>
        </select>
        <button type="submit" className={buttonVariants({ variant: "outline" })}>
          Search
        </button>
      </form>

      <div className="flex flex-col gap-3">
        {data.items.map((enquiry) => (
          <EnquiryCard key={enquiry.id} enquiry={enquiry} me={me} users={users} />
        ))}
        {data.items.length === 0 && (
          <p className={`${CARD} text-center text-muted-foreground`}>No enquiries found.</p>
        )}
      </div>
      <Pager path="/admin/enquiries" query={query} {...data} />
    </>
  );
}
