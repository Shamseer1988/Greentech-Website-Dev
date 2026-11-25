import type { Metadata } from "next";
import { Pager, readFilters } from "@/components/admin/pager";
import { CARD, PageTitle } from "@/components/admin/ui";
import { ViewingCard } from "@/components/admin/viewing-card";
import { ViewingSettingsForm } from "@/components/admin/viewing-settings";
import { buttonVariants } from "@/components/ui/button";
import { adminGet, getMe } from "@/lib/admin-server";
import {
  VIEWING_STATUSES,
  type AdminUser,
  type Paged,
  type ViewingRow,
  type ViewingSettings,
} from "@/lib/admin-types";

export const metadata: Metadata = { title: "Viewings" };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function ViewingsPage({ searchParams }: Props) {
  const { query, api } = await readFilters(searchParams, {
    status: VIEWING_STATUSES,
    when: ["past", "all"],
  });
  const me = await getMe();
  const [users, data, settings] = await Promise.all([
    adminGet<AdminUser[]>("/users"),
    adminGet<Paged<ViewingRow>>(`/viewings?${api}`),
    me.role === "admin" ? adminGet<ViewingSettings>("/viewing-settings") : null,
  ]);

  return (
    <>
      <PageTitle
        title="Viewings"
        text="Visits booked on the website. Confirm them by WhatsApp or phone."
      />
      {settings && <ViewingSettingsForm initial={settings} />}
      <form key={JSON.stringify(query)} className="flex flex-wrap gap-2.5">
        <input
          type="search"
          name="q"
          aria-label="Search"
          defaultValue={query.q}
          placeholder="Name, company, phone, code…"
          className="field max-w-80"
        />
        <select name="when" aria-label="Dates" defaultValue={query.when} className="field w-auto">
          <option value="">Upcoming</option>
          <option value="past">Past</option>
          <option value="all">All</option>
        </select>
        <select
          name="status"
          aria-label="Status"
          defaultValue={query.status}
          className="field w-auto capitalize"
        >
          <option value="">All statuses</option>
          {VIEWING_STATUSES.map((status) => (
            <option key={status}>{status}</option>
          ))}
        </select>
        <button type="submit" className={buttonVariants({ variant: "outline" })}>
          Search
        </button>
      </form>
      <div className="flex flex-col gap-3">
        {data.items.map((viewing) => (
          <ViewingCard key={viewing.id} viewing={viewing} me={me} users={users} />
        ))}
        {data.items.length === 0 && (
          <p className={`${CARD} text-center text-muted-foreground`}>No viewings found.</p>
        )}
      </div>
      <Pager path="/admin/viewings" query={query} {...data} />
    </>
  );
}
