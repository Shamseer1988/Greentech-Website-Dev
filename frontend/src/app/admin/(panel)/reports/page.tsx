import type { Metadata } from "next";
import Link from "next/link";
import { cn } from "cn";
import { DailyChart, RankedBars } from "@/components/admin/charts";
import { QuestionList } from "@/components/admin/question-list";
import { Badge, CARD, PageTitle, SMALL_BUTTON } from "@/components/admin/ui";
import { adminGet, requireAdminPage } from "@/lib/admin-server";
import type { Report, Totals } from "@/lib/admin-types";
import { num } from "@/lib/format";

export const metadata: Metadata = { title: "Reports" };

const PERIODS = [
  ["7", "7 days"],
  ["30", "30 days"],
  ["90", "90 days"],
  ["365", "1 year"],
] as const;
const TILES: [keyof Totals, string][] = [
  ["view", "Property views"],
  ["enquiry", "Enquiries"],
  ["viewing", "Viewings booked"],
  ["whatsapp", "WhatsApp clicks"],
  ["call", "Call clicks"],
  ["brochure", "Brochures opened"],
];
const HEAD = "p-2.5 text-start text-[13px] font-semibold text-muted-foreground";
const NUMBER = "p-2.5 text-end tabular-nums";

type Props = { searchParams: Promise<{ days?: string }> };

export default async function ReportsPage({ searchParams }: Props) {
  await requireAdminPage();
  const asked = (await searchParams).days;
  const days = PERIODS.some(([value]) => value === asked) ? asked : "30";
  const report = await adminGet<Report>(`/reports?days=${days}`);

  function change(key: keyof Totals): string {
    const [now, old] = [report.totals[key], report.before[key]];
    if (!old) return now ? "New" : "–";
    const percent = Math.round(((now - old) / old) * 100);
    return `${percent > 0 ? "+" : ""}${percent}% vs before`;
  }

  return (
    <>
      <PageTitle title="Reports" text="Anonymous numbers from the website. No visitor is tracked.">
        {PERIODS.map(([value, label]) => (
          <Link
            key={value}
            href={`/admin/reports?days=${value}`}
            aria-current={value === days ? "page" : undefined}
            className={cn(
              SMALL_BUTTON,
              value === days && "border-green-700 bg-tint text-green-700",
            )}
          >
            {label}
          </Link>
        ))}
      </PageTitle>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        {TILES.map(([key, label]) => (
          <div key={key} className={`${CARD} flex flex-col gap-1`}>
            <span className="text-[13px] text-muted-foreground">{label}</span>
            <span className="font-heading text-[28px] font-bold text-slate">
              {num(report.totals[key])}
            </span>
            <span className="text-xs text-muted-foreground">{change(key)}</span>
          </div>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <section className={CARD}>
          <h2 className="mb-4 text-lg font-semibold text-slate">
            Property views per {report.days > 90 ? "week" : "day"}
          </h2>
          <DailyChart
            rows={report.daily.map((d) => ({ day: d.day, value: d.views }))}
            unit="views"
            weekly={report.days > 90}
          />
        </section>
        <section className={CARD}>
          <h2 className="mb-4 text-lg font-semibold text-slate">
            Enquiries and viewings per {report.days > 90 ? "week" : "day"}
          </h2>
          <DailyChart
            rows={report.daily.map((d) => ({ day: d.day, value: d.leads }))}
            unit="enquiries and viewings"
            weekly={report.days > 90}
          />
        </section>
      </div>

      <section className={CARD}>
        <h2 className="mb-2 text-lg font-semibold text-slate">Most viewed properties</h2>
        {report.properties.length === 0 && <Empty />}
        {report.properties.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-180 text-sm">
              <thead>
                <tr>
                  <th className={HEAD}>Property</th>
                  <th className={HEAD}>Status</th>
                  {[
                    "Views",
                    "Enquiries",
                    "Viewings",
                    "WhatsApp",
                    "Calls",
                    "Brochures",
                    "Saved",
                  ].map((h) => (
                    <th key={h} className={cn(HEAD, "text-end")}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {report.properties.map((p) => (
                  <tr key={p.code} className="border-t border-line">
                    <td className="p-2.5">
                      <strong>{p.code}</strong>{" "}
                      <span className="text-muted-foreground">{p.title}</span>
                    </td>
                    <td className="p-2.5">
                      <Badge value={p.status} />
                    </td>
                    {[
                      p.view,
                      p.enquiry,
                      p.viewing,
                      p.whatsapp,
                      p.call,
                      p.brochure,
                      p.favourite,
                    ].map((n, i) => (
                      <td key={i} className={NUMBER}>
                        {num(n)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="grid gap-4 xl:grid-cols-2">
        <section className={CARD}>
          <h2 className="mb-4 text-lg font-semibold text-slate">
            Where enquiries and viewings come from
          </h2>
          {report.sources.length === 0 ? (
            <Empty />
          ) : (
            <RankedBars
              rows={report.sources.map((s) => ({
                name: s.source,
                value: s.enquiries + s.viewings,
                note: `${s.enquiries} enquiries, ${s.viewings} viewings`,
              }))}
            />
          )}
          <p className="mt-4 text-[13px] text-muted-foreground">
            Tip: add <code>?utm_source=snapchat</code> to links in your adverts. “direct” = typed
            the address, a saved link, or not known.
          </p>
        </section>
        <section className={CARD}>
          <h2 className="mb-2 text-lg font-semibold text-slate">Agents</h2>
          {report.agents.length === 0 ? (
            <Empty />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <th className={HEAD}>Name</th>
                    {["Enquiries", "Answered", "First answer", "Closed", "Visits done"].map((h) => (
                      <th key={h} className={cn(HEAD, "text-end")}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {report.agents.map((a) => (
                    <tr key={a.name} className="border-t border-line">
                      <td className="p-2.5" dir="auto">
                        {a.name}
                      </td>
                      <td className={NUMBER}>{a.enquiries}</td>
                      <td className={NUMBER}>{a.answered}</td>
                      <td className={NUMBER}>
                        {a.average_hours === null ? "–" : `${a.average_hours} h`}
                      </td>
                      <td className={NUMBER}>{a.closed}</td>
                      <td className={NUMBER}>{a.viewings}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="mt-4 text-[13px] text-muted-foreground">
            “First answer” is the average time until the enquiry is changed from New.
          </p>
        </section>
      </div>

      <section className={CARD}>
        <h2 className="mb-2 text-lg font-semibold text-slate">
          Questions the chat could not answer
        </h2>
        <p className="mb-3 text-sm text-muted-foreground">
          Add an answer on the{" "}
          <Link href="/admin/chat" className="font-semibold text-green-700">
            Chat assistant
          </Link>{" "}
          page, then remove the question here. Phone numbers and emails are hidden.
        </p>
        {report.questions.length === 0 ? <Empty /> : <QuestionList initial={report.questions} />}
      </section>
    </>
  );
}

function Empty() {
  return <p className="text-sm text-muted-foreground">Nothing yet.</p>;
}
