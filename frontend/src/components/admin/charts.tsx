"use client";

import { useState } from "react";
import { num } from "@/lib/format";
import { dayName } from "@/lib/hours";

type Day = { day: string; value: number };

function byWeek(rows: Day[]): Day[] {
  const weeks: Day[] = [];
  rows.forEach((row, i) => {
    if (i % 7 === 0) weeks.push({ ...row });
    else weeks[weeks.length - 1].value += row.value;
  });
  return weeks;
}

/** A round, even top for the scale, so the middle is a whole number too. */
function niceTop(max: number): number {
  if (max <= 4) return 4;
  const step = 10 ** Math.floor(Math.log10(max));
  return [2, 4, 6, 8, 10].map((n) => n * step).find((n) => n >= max) ?? max;
}

/** One bar per day. Point at (or tab to) a bar to see its number; the table has all of them. */
export function DailyChart({ rows, unit, weekly }: { rows: Day[]; unit: string; weekly: boolean }) {
  const data = weekly ? byWeek(rows) : rows;
  const [active, setActive] = useState<number | null>(null);
  const top = niceTop(Math.max(...data.map((d) => d.value)));
  const label = (d: Day) => `${weekly ? "Week of " : ""}${dayName(d.day)}`;
  const point = active === null ? null : data[active];
  const total = data.reduce((sum, d) => sum + d.value, 0);
  if (!total) return <p className="text-sm text-muted-foreground">Nothing yet.</p>;

  return (
    <div>
      <div className="relative ps-9">
        {[top, top / 2, 0].map((value) => (
          <span
            key={value}
            className="absolute start-0 -translate-y-1/2 text-xs text-muted-foreground tabular-nums"
            style={{ top: `${(1 - value / top) * 180}px` }}
          >
            {num(value)}
          </span>
        ))}
        <div className="relative h-45 border-b border-field">
          {[0, 0.5].map((part) => (
            <span
              key={part}
              className="absolute inset-x-0 border-t border-line"
              style={{ top: `${part * 100}%` }}
            />
          ))}
          <div className="absolute inset-0 flex items-end" onMouseLeave={() => setActive(null)}>
            {data.map((d, i) => (
              <button
                key={d.day}
                type="button"
                aria-label={`${label(d)}: ${num(d.value)} ${unit}`}
                onMouseEnter={() => setActive(i)}
                onFocus={() => setActive(i)}
                onBlur={() => setActive(null)}
                className="flex h-full min-w-0 flex-1 items-end justify-center px-px"
              >
                <span
                  className={`block w-full max-w-6 rounded-t-[4px] ${active === i ? "bg-green-800" : "bg-green-700"}`}
                  style={{ height: `${(d.value / top) * 100}%`, minHeight: d.value ? 3 : 0 }}
                />
              </button>
            ))}
          </div>
          {point && active !== null && (
            <div
              role="status"
              className="pointer-events-none absolute -top-3 z-10 -translate-x-1/2 -translate-y-full rounded-lg bg-slate px-3 py-2 text-xs whitespace-nowrap text-white shadow-lg"
              style={{
                left: `${Math.min(85, Math.max(15, ((active + 0.5) / data.length) * 100))}%`,
              }}
            >
              <strong className="block text-sm">{num(point.value)}</strong>
              {label(point)}
            </div>
          )}
        </div>
        <div className="mt-1.5 flex justify-between text-xs text-muted-foreground">
          <span>{dayName(data[0].day)}</span>
          <span>{dayName(data[data.length - 1].day)}</span>
        </div>
      </div>
      <details className="mt-3 text-sm">
        <summary className="cursor-pointer text-muted-foreground">Show as table</summary>
        <div className="mt-2 max-h-60 overflow-y-auto">
          <table className="w-full">
            <tbody>
              {data.map((d) => (
                <tr key={d.day} className="border-t border-line">
                  <td className="py-1.5">{label(d)}</td>
                  <td className="py-1.5 text-end tabular-nums">{num(d.value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}

export function RankedBars({ rows }: { rows: { name: string; value: number; note: string }[] }) {
  const max = Math.max(...rows.map((r) => r.value), 1);
  return (
    <ul className="flex flex-col gap-3">
      {rows.map((row) => (
        <li
          key={row.name}
          title={row.note}
          className="grid grid-cols-[110px_1fr_auto] items-center gap-3 text-sm"
        >
          <span className="truncate" dir="auto">
            {row.name}
          </span>
          <span className="h-4">
            <span
              className="block h-full rounded-e-[4px] bg-green-700"
              style={{ width: `${(row.value / max) * 100}%` }}
            />
          </span>
          <span className="text-end">
            <strong className="tabular-nums">{num(row.value)}</strong>
            <span className="block text-xs text-muted-foreground">{row.note}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}
