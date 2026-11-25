"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { cn } from "cn";
import { WhatsAppIcon } from "@/components/whatsapp-link";
import { buttonVariants } from "@/components/ui/button";
import { adminSend } from "@/lib/admin-client";
import { VIEWING_STATUSES, type AdminUser, type ViewingRow } from "@/lib/admin-types";
import { clock, dayName } from "@/lib/hours";
import { DeleteButton } from "./delete-button";
import { Badge, CARD, Message, SMALL_BUTTON } from "./ui";

function messageLink(v: ViewingRow): string {
  const when = `${dayName(v.day)} ${clock(v.time)}`;
  const what = v.property_code ?? "";
  const text =
    v.language === "ar"
      ? `مرحباً ${v.name}، نؤكد موعد معاينة العقار ${what} بتاريخ ${v.day} الساعة ${v.time}. جرين تك للوساطة العقارية.`
      : `Hello ${v.name}, your viewing of ${what} on ${when} is confirmed. Green Tech Real Estate Broker.`;
  return `https://wa.me/${v.phone.replace(/\D/g, "")}?text=${encodeURIComponent(text)}`;
}

type Props = { viewing: ViewingRow; me: AdminUser; users: AdminUser[] };
type Change = { status?: string; assigned_to_id?: number | null; day?: string; time?: string };

export function ViewingCard({ viewing: v, me, users }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [moving, setMoving] = useState(false);

  async function save(change: Change) {
    setBusy(true);
    setError("");
    try {
      await adminSend("PATCH", `/viewings/${v.id}`, change);
      setMoving(false);
      router.refresh();
    } catch (problem) {
      setError((problem as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function move(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    void save({ day: String(data.get("day")), time: String(data.get("time")) });
  }

  const people = users.filter((u) => u.is_active || u.id === v.assigned_to_id);
  return (
    <article className={cn(CARD, "flex flex-col gap-3")} data-viewing={v.id}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <h2 className="text-lg font-semibold text-slate">
            {dayName(v.day)} · {clock(v.time)}
          </h2>
          <span dir="auto">{[v.name, v.company].filter(Boolean).join(" · ")}</span>
          <span className="text-sm text-muted-foreground">
            V{v.id}
            {v.property_code ? (
              <>
                {" · "}
                <Link
                  href={`/admin/properties/${v.property_id}`}
                  className="font-semibold text-green-700"
                >
                  {v.property_code}
                </Link>{" "}
                {v.property_title}
              </>
            ) : (
              " · property deleted"
            )}
            {v.source && ` · came from ${v.source}`}
            {v.email && ` · ${v.email}`}
          </span>
        </div>
        <Badge value={v.status} />
      </div>
      {v.note && (
        <p dir="auto" className="rounded-lg bg-ivory p-3 text-sm break-words whitespace-pre-line">
          {v.note}
        </p>
      )}
      <Message error={error} />
      {moving && (
        <form onSubmit={move} className="flex flex-wrap items-end gap-2.5 rounded-lg bg-ivory p-3">
          <input
            type="date"
            name="day"
            required
            aria-label="New day"
            defaultValue={v.day}
            className="field w-auto"
          />
          <input
            type="time"
            name="time"
            required
            aria-label="New time"
            defaultValue={v.time}
            className="field w-auto"
          />
          <button type="submit" disabled={busy} className={SMALL_BUTTON}>
            Save new time
          </button>
        </form>
      )}
      <div className="flex flex-wrap items-center gap-2.5">
        <a
          href={messageLink(v)}
          target="_blank"
          rel="noopener noreferrer"
          className={buttonVariants({ variant: "whatsapp", size: "sm" })}
        >
          <WhatsAppIcon />
          Confirm on WhatsApp
        </a>
        <a href={`tel:${v.phone}`} className={buttonVariants({ variant: "outline", size: "sm" })}>
          Call {v.phone}
        </a>
        <select
          aria-label={`Status of viewing ${v.id}`}
          value={v.status}
          disabled={busy}
          onChange={(event) => save({ status: event.target.value })}
          className="field w-auto text-sm capitalize"
        >
          {VIEWING_STATUSES.map((status) => (
            <option key={status}>{status}</option>
          ))}
        </select>
        <button type="button" onClick={() => setMoving(!moving)} className={SMALL_BUTTON}>
          Change time
        </button>
        {me.role === "admin" ? (
          <>
            <select
              aria-label={`Agent for viewing ${v.id}`}
              value={v.assigned_to_id ?? ""}
              disabled={busy}
              onChange={(event) =>
                save({ assigned_to_id: event.target.value ? Number(event.target.value) : null })
              }
              className="field w-auto text-sm"
            >
              <option value="">Not assigned</option>
              {people.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.full_name}
                  {user.is_active ? "" : " (disabled)"}
                </option>
              ))}
            </select>
            <DeleteButton
              path={`/viewings/${v.id}`}
              question={`Delete the viewing of ${v.name}? This cannot be undone.`}
            />
          </>
        ) : (
          <button
            type="button"
            disabled={busy}
            onClick={() => save({ assigned_to_id: v.assigned_to_id === me.id ? null : me.id })}
            className={SMALL_BUTTON}
          >
            {v.assigned_to_id === me.id ? "Give back" : "Take this viewing"}
          </button>
        )}
      </div>
    </article>
  );
}
