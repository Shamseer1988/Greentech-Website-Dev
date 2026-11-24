"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { adminSend } from "@/lib/admin-client";
import type { LocationFull } from "@/lib/admin-types";
import { DeleteButton } from "./delete-button";
import { CARD, Field, Message } from "./ui";

export function LocationEditor({ location }: { location?: LocationFull }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const text = (name: string) => String(data.get(name) ?? "").trim();
    const body = {
      slug: text("slug"),
      name_en: text("name_en"),
      name_ar: text("name_ar"),
      lat: Number(text("lat")),
      lng: Number(text("lng")),
      description_en: text("description_en"),
      description_ar: text("description_ar"),
      sort_order: Number(text("sort_order") || 0),
      is_active: data.has("is_active"),
    };
    setBusy(true);
    setError("");
    setOk("");
    try {
      if (location) await adminSend("PUT", `/locations/${location.id}`, body);
      else await adminSend("POST", "/locations", body);
      setOk("Saved.");
      router.refresh();
    } catch (problem) {
      setError((problem as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <details className={CARD}>
      <summary className="flex cursor-pointer flex-wrap items-center gap-x-3 font-semibold text-slate">
        {location ? location.name_en : "+ Add location"}
        {location && (
          <span className="text-sm font-normal text-muted-foreground">
            {location.property_count} properties{!location.is_active && " · hidden"}
          </span>
        )}
      </summary>
      <form onSubmit={submit} onChange={() => setOk("")} className="mt-5 flex flex-col gap-4">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <Field label="Name (English)" required>
            <input
              name="name_en"
              required
              minLength={2}
              maxLength={80}
              defaultValue={location?.name_en}
              className="field"
            />
          </Field>
          <Field label="Name (Arabic)" required>
            <input
              name="name_ar"
              dir="rtl"
              lang="ar"
              required
              minLength={2}
              maxLength={80}
              defaultValue={location?.name_ar}
              className="field"
            />
          </Field>
          <Field label="Web name" required hint="Small letters and -, e.g. al-wakra. Used in links.">
            <input
              name="slug"
              required
              minLength={2}
              maxLength={60}
              pattern="[a-z0-9]+(-[a-z0-9]+)*"
              defaultValue={location?.slug}
              className="field"
            />
          </Field>
          <Field label="Latitude" required>
            <input
              name="lat"
              type="number"
              step="any"
              min={-90}
              max={90}
              required
              defaultValue={location?.lat}
              className="field"
            />
          </Field>
          <Field label="Longitude" required>
            <input
              name="lng"
              type="number"
              step="any"
              min={-180}
              max={180}
              required
              defaultValue={location?.lng}
              className="field"
            />
          </Field>
          <Field label="Order" hint="Small numbers come first">
            <input
              name="sort_order"
              type="number"
              min={0}
              max={10000}
              defaultValue={location?.sort_order ?? 0}
              className="field"
            />
          </Field>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Description (English)">
            <textarea
              name="description_en"
              rows={2}
              maxLength={2000}
              defaultValue={location?.description_en}
              className="field"
            />
          </Field>
          <Field label="Description (Arabic)">
            <textarea
              name="description_ar"
              dir="rtl"
              lang="ar"
              rows={2}
              maxLength={2000}
              defaultValue={location?.description_ar}
              className="field"
            />
          </Field>
        </div>
        <label className="flex min-h-10 items-center gap-2.5 text-sm font-medium">
          <input
            type="checkbox"
            name="is_active"
            defaultChecked={location?.is_active ?? true}
            className="size-5 accent-green-700"
          />
          Show in the location lists
        </label>
        <Message error={error} ok={ok} />
        <div className="flex flex-wrap items-center gap-2.5">
          <Button type="submit" size="sm" disabled={busy}>
            {busy ? "Saving…" : "Save"}
          </Button>
          {location && (
            <span className={cn(location.property_count > 0 && "hidden")}>
              <DeleteButton
                path={`/locations/${location.id}`}
                question={`Delete ${location.name_en}? This cannot be undone.`}
              />
            </span>
          )}
        </div>
      </form>
    </details>
  );
}
