"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { cn } from "cn";
import { WhatsAppIcon } from "@/components/whatsapp-link";
import { buttonVariants } from "@/components/ui/button";
import { adminSend } from "@/lib/admin-client";
import { ENQUIRY_STATUSES, type AdminUser, type EnquiryRow } from "@/lib/admin-types";
import { DeleteButton } from "./delete-button";
import { Badge, CARD, Message, qatarTime, SMALL_BUTTON } from "./ui";

function replyLink(e: EnquiryRow): string {
  const about = e.property_code ? ` about property ${e.property_code}` : "";
  const text = `Hello ${e.name}, thank you for your enquiry${about}. This is Green Tech Real Estate Broker.`;
  return `https://wa.me/${e.phone.replace(/\D/g, "")}?text=${encodeURIComponent(text)}`;
}

type Props = { enquiry: EnquiryRow; me: AdminUser; users: AdminUser[] };

export function EnquiryCard({ enquiry: e, me, users }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function save(change: { status?: string; assigned_to_id?: number | null }) {
    setBusy(true);
    setError("");
    try {
      await adminSend("PATCH", `/enquiries/${e.id}`, change);
      router.refresh();
    } catch (problem) {
      setError((problem as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const facts = [
    ["Looking for", e.looking_for?.replaceAll("-", " ")],
    ["Area", e.area],
    ["Space needed", e.space_needed],
    ["Email", e.email],
    ["Came from", e.source],
  ].filter(([, value]) => value);
  // A disabled user can still hold old enquiries, so keep the name in the list.
  const people = users.filter((u) => u.is_active || u.id === e.assigned_to_id);

  return (
    <article className={cn(CARD, "flex flex-col gap-3")}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <h2 className="text-lg font-semibold text-slate" dir="auto">
            {[e.name, e.company].filter(Boolean).join(" · ")}
          </h2>
          <span className="text-sm text-muted-foreground">
            #{e.id} · {qatarTime(e.created_at)}
            {e.property_code && (
              <>
                {" · "}
                <Link
                  href={`/admin/properties/${e.property_id}`}
                  className="font-semibold text-green-700"
                >
                  {e.property_code}
                </Link>
              </>
            )}
          </span>
        </div>
        <Badge value={e.status} />
      </div>

      {facts.length > 0 && (
        <dl className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
          {facts.map(([name, value]) => (
            <div key={name} className="flex gap-1.5">
              <dt className="text-muted-foreground">{name}:</dt>
              <dd dir="auto">{value}</dd>
            </div>
          ))}
        </dl>
      )}
      {e.message && (
        <p dir="auto" className="rounded-lg bg-ivory p-3 text-sm break-words whitespace-pre-line">
          {e.message}
        </p>
      )}
      <Message error={error} />

      <div className="flex flex-wrap items-center gap-2.5">
        <a
          href={replyLink(e)}
          target="_blank"
          rel="noopener noreferrer"
          className={buttonVariants({ variant: "whatsapp", size: "sm" })}
        >
          <WhatsAppIcon />
          Reply on WhatsApp{e.reply_on_whatsapp && " (requested)"}
        </a>
        <a href={`tel:${e.phone}`} className={buttonVariants({ variant: "outline", size: "sm" })}>
          Call {e.phone}
        </a>
        <select
          aria-label={`Status of enquiry ${e.id}`}
          value={e.status}
          disabled={busy}
          onChange={(event) => save({ status: event.target.value })}
          className="field w-auto text-sm capitalize"
        >
          {ENQUIRY_STATUSES.map((status) => (
            <option key={status}>{status}</option>
          ))}
        </select>
        {me.role === "admin" ? (
          <>
            <select
              aria-label={`Agent for enquiry ${e.id}`}
              value={e.assigned_to_id ?? ""}
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
              path={`/enquiries/${e.id}`}
              question={`Delete enquiry #${e.id} from ${e.name}? This cannot be undone.`}
            />
          </>
        ) : (
          <button
            type="button"
            disabled={busy}
            onClick={() => save({ assigned_to_id: e.assigned_to_id === me.id ? null : me.id })}
            className={SMALL_BUTTON}
          >
            {e.assigned_to_id === me.id ? "Give back" : "Take this enquiry"}
          </button>
        )}
      </div>
    </article>
  );
}
