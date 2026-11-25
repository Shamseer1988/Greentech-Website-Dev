import Link from "next/link";
import { Badge, CARD, PageTitle, qatarTime } from "@/components/admin/ui";
import { buttonVariants } from "@/components/ui/button";
import { adminGet, getMe } from "@/lib/admin-server";
import type { EnquiryRow, Paged, Stats } from "@/lib/admin-types";

export default async function Dashboard() {
  const me = await getMe();
  const [stats, enquiries] = await Promise.all([
    adminGet<Stats>("/stats"),
    adminGet<Paged<EnquiryRow>>("/enquiries"),
  ]);
  const boxes = [
    ["Total listings", stats.total, "/admin/properties"],
    ["Available", stats.available, "/admin/properties?status=available"],
    ["New enquiries (7 days)", stats.new_enquiries_7_days, "/admin/enquiries"],
    ["Open enquiries", stats.open_enquiries, "/admin/enquiries"],
    ["Upcoming viewings", stats.upcoming_viewings, "/admin/viewings"],
  ] as const;

  return (
    <>
      <PageTitle title={`Welcome, ${me.full_name}`} text="What is happening today.">
        <Link href="/admin/properties/new" className={buttonVariants({ size: "sm" })}>
          + Add property
        </Link>
      </PageTitle>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {boxes.map(([label, value, href]) => (
          <Link key={label} href={href} className={`${CARD} flex flex-col gap-1 hover:shadow-md`}>
            <span className="text-[13px] text-muted-foreground">{label}</span>
            <span className="font-heading text-[28px] font-bold text-green-700">{value}</span>
          </Link>
        ))}
      </div>
      <section className={`${CARD} flex flex-col gap-3`}>
        <h2 className="text-lg font-semibold text-slate">Latest enquiries</h2>
        {enquiries.items.length === 0 && (
          <p className="text-sm text-muted-foreground">No enquiries yet.</p>
        )}
        {enquiries.items.slice(0, 6).map((e) => (
          <div
            key={e.id}
            className="flex flex-wrap items-center justify-between gap-3 border-b border-[#eef1ee] pb-2.5 text-sm last:border-0"
          >
            <span dir="auto">
              {[e.name, e.company].filter(Boolean).join(" · ")}
              {e.property_code && ` → ${e.property_code}`}
            </span>
            <span className="flex items-center gap-3 text-muted-foreground">
              {e.assigned_to_name ?? "Not assigned"} · {qatarTime(e.created_at)}
              <Badge value={e.status} />
            </span>
          </div>
        ))}
        <Link href="/admin/enquiries" className="font-semibold text-green-700">
          See all enquiries →
        </Link>
      </section>
    </>
  );
}
