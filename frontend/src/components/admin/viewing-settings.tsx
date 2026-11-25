"use client";

import { useState, type FormEvent } from "react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { adminSend } from "@/lib/admin-client";
import type { ViewingSettings } from "@/lib/admin-types";
import { dayName } from "@/lib/hours";
import { CARD, Field, Message, SMALL_BUTTON } from "./ui";

const DAYS = [
  [5, "Sat"],
  [6, "Sun"],
  [0, "Mon"],
  [1, "Tue"],
  [2, "Wed"],
  [3, "Thu"],
  [4, "Fri"],
] as const;

export function ViewingSettingsForm({ initial }: { initial: ViewingSettings }) {
  const [data, setData] = useState(initial);
  const [holiday, setHoliday] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");

  function set(change: Partial<ViewingSettings>) {
    setOk("");
    setData((old) => ({ ...old, ...change }));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await adminSend("PUT", "/viewing-settings", data);
      setOk("Saved.");
    } catch (problem) {
      setError((problem as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <details className={CARD}>
      <summary className="cursor-pointer font-semibold text-slate">
        Booking times
        {!data.enabled && <span className="font-normal text-muted-foreground"> · off</span>}
      </summary>
      <form onSubmit={submit} className="mt-4 flex flex-col gap-4">
        <label className="flex min-h-11 items-center gap-2.5 text-sm font-medium">
          <input
            type="checkbox"
            name="enabled"
            checked={data.enabled}
            onChange={(event) => set({ enabled: event.target.checked })}
            className="size-5 accent-green-700"
          />
          Visitors can book viewings
        </label>
        <fieldset className="flex flex-wrap gap-2">
          <legend className="mb-1.5 text-[13px] font-semibold text-muted-foreground">
            Open days
          </legend>
          {DAYS.map(([day, name]) => (
            <button
              key={day}
              type="button"
              aria-pressed={data.days.includes(day)}
              onClick={() =>
                set({
                  days: data.days.includes(day)
                    ? data.days.filter((d) => d !== day)
                    : [...data.days, day],
                })
              }
              className={cn(
                SMALL_BUTTON,
                data.days.includes(day) && "border-green-700 bg-tint text-green-700",
              )}
            >
              {name}
            </button>
          ))}
        </fieldset>
        <div className="grid gap-4 sm:grid-cols-3 xl:grid-cols-5">
          <Field label="From">
            <input
              type="time"
              name="start"
              required
              value={data.start}
              onChange={(event) => set({ start: event.target.value })}
              className="field"
            />
          </Field>
          <Field label="Until">
            <input
              type="time"
              name="end"
              required
              value={data.end}
              onChange={(event) => set({ end: event.target.value })}
              className="field"
            />
          </Field>
          <Field label="Length of a visit">
            <select
              name="minutes"
              value={data.minutes}
              onChange={(event) =>
                set({ minutes: Number(event.target.value) as ViewingSettings["minutes"] })
              }
              className="field"
            >
              {[30, 60, 90, 120].map((n) => (
                <option key={n} value={n}>
                  {n} minutes
                </option>
              ))}
            </select>
          </Field>
          <Field label="Notice (hours before)">
            <input
              type="number"
              name="lead_hours"
              min={0}
              max={168}
              required
              value={data.lead_hours}
              onChange={(event) => set({ lead_hours: Number(event.target.value) })}
              className="field"
            />
          </Field>
          <Field label="Days ahead">
            <input
              type="number"
              name="days_ahead"
              min={1}
              max={60}
              required
              value={data.days_ahead}
              onChange={(event) => set({ days_ahead: Number(event.target.value) })}
              className="field"
            />
          </Field>
        </div>
        <div className="flex flex-col gap-2">
          <span className="text-[13px] font-semibold text-muted-foreground">Holidays (closed)</span>
          <div className="flex flex-wrap items-center gap-2">
            {data.closed.map((day) => (
              <button
                key={day}
                type="button"
                aria-label={`Remove ${dayName(day)}`}
                onClick={() => set({ closed: data.closed.filter((d) => d !== day) })}
                className={SMALL_BUTTON}
              >
                {dayName(day)} ✕
              </button>
            ))}
            <input
              type="date"
              aria-label="Holiday"
              value={holiday}
              onChange={(event) => setHoliday(event.target.value)}
              className="field w-auto"
            />
            <button
              type="button"
              disabled={!holiday || data.closed.includes(holiday)}
              onClick={() => {
                set({ closed: [...data.closed, holiday].sort() });
                setHoliday("");
              }}
              className={SMALL_BUTTON}
            >
              Add
            </button>
          </div>
        </div>
        <Message error={error} ok={ok} />
        <Button type="submit" size="sm" disabled={busy} className="self-start">
          {busy ? "Saving…" : "Save booking times"}
        </Button>
      </form>
    </details>
  );
}
