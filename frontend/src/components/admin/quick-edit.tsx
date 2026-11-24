"use client";

import { Star } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { cn } from "cn";
import { adminSend } from "@/lib/admin-client";
import { STATUSES, type PropertyStatus } from "@/lib/admin-types";

type Props = { id: number; code: string; status: PropertyStatus; featured: boolean };

/** The status and featured cells of one table row. */
export function QuickEdit({ id, code, status, featured }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function save(change: { status?: string; featured?: boolean }) {
    setBusy(true);
    setError("");
    try {
      await adminSend("PATCH", `/properties/${id}`, change);
      router.refresh();
    } catch (problem) {
      setError((problem as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <td>
        <select
          aria-label={`Status of ${code}`}
          value={status}
          disabled={busy}
          onChange={(event) => save({ status: event.target.value })}
          className={cn(
            "h-10 rounded-full border-0 px-3 text-xs font-semibold capitalize",
            status === "available" && "bg-tint text-deep",
            status === "rented" && "bg-[#eceFed] text-[#3a4842]",
            (status === "draft" || status === "reserved") && "bg-rose-tint text-rose-700",
          )}
        >
          {STATUSES.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        {error && (
          <span role="alert" className="block text-xs text-danger">
            {error}
          </span>
        )}
      </td>
      <td>
        <button
          type="button"
          aria-label={`Featured: ${code}`}
          aria-pressed={featured}
          disabled={busy}
          onClick={() => save({ featured: !featured })}
          className="flex size-10 items-center justify-center rounded-lg hover:bg-tint"
        >
          <Star className={cn("size-5", featured ? "fill-green text-green" : "text-field")} />
        </button>
      </td>
    </>
  );
}
