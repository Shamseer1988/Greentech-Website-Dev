"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { adminSend } from "@/lib/admin-client";
import {
  STATUSES,
  type LocationFull,
  type PropertyFull,
  type PropertyInput,
  type TypeFull,
} from "@/lib/admin-types";
import { CARD, Field, Message } from "./ui";

// The Arabic names of these are known to the website (src/lib/format.ts).
const COMMON_AMENITIES = [
  "Central / split A/C",
  "Common kitchen",
  "Washrooms per floor",
  "Laundry area",
  "Water & electricity (KAHRAMAA)",
  "CCTV & security",
  "Bus parking",
  "Civil Defence approved",
  "Loading bay",
  "Office",
  "Kitchen fitted",
  "Near camps",
  "Open yard",
];

type Props = { property?: PropertyFull; types: TypeFull[]; locations: LocationFull[] };

function read(form: HTMLFormElement): PropertyInput {
  const data = new FormData(form);
  const text = (name: string) => String(data.get(name) ?? "").trim();
  const number = (name: string) => (text(name) === "" ? null : Number(text(name)));
  return {
    code: text("code"),
    title_en: text("title_en"),
    title_ar: text("title_ar"),
    description_en: text("description_en"),
    description_ar: text("description_ar"),
    type_id: Number(text("type_id")),
    location_id: Number(text("location_id")),
    status: text("status") as PropertyInput["status"],
    rent_qar: number("rent_qar"),
    rooms: number("rooms"),
    capacity_persons: number("capacity_persons"),
    area_sqm: number("area_sqm"),
    floors: number("floors"),
    amenities: [
      ...data.getAll("amenities").map(String),
      ...text("other_amenities")
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean),
    ],
    lat: number("lat"),
    lng: number("lng"),
    national_address: text("national_address"),
    featured: data.has("featured"),
  };
}

export function PropertyForm({ property, types, locations }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const dirty = useRef(false);
  const other = property?.amenities.filter((a) => !COMMON_AMENITIES.includes(a)) ?? [];

  // Ask before closing the tab with unsaved changes.
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => dirty.current && event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const body = read(event.currentTarget);
    setBusy(true);
    setError("");
    setOk("");
    try {
      if (property) {
        await adminSend("PUT", `/properties/${property.id}`, body);
        dirty.current = false;
        setOk("Saved.");
        router.refresh();
      } else {
        const created = await adminSend<PropertyFull>("POST", "/properties", body);
        dirty.current = false;
        router.push(`/admin/properties/${created.id}#photos`);
        router.refresh();
      }
    } catch (problem) {
      setError((problem as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const numberField = (name: keyof PropertyInput, label: string, step = "1", hint?: string) => (
    <Field label={label} hint={hint}>
      <input
        name={name}
        type="number"
        min={0}
        step={step}
        inputMode="decimal"
        defaultValue={(property?.[name] as number | null) ?? ""}
        className="field"
      />
    </Field>
  );

  return (
    <form
      onSubmit={submit}
      onChange={() => {
        dirty.current = true;
        setOk("");
      }}
      className="flex flex-col gap-5"
    >
      <section className={cn(CARD, "grid gap-4 md:grid-cols-2 xl:grid-cols-4")}>
        <Field label="Code" required hint="For example GT-LA-101">
          <input
            name="code"
            required
            minLength={2}
            maxLength={20}
            pattern="[A-Za-z0-9\-]+"
            title="Letters, numbers and - only"
            defaultValue={property?.code}
            className="field uppercase"
          />
        </Field>
        <Field label="Type" required>
          <select name="type_id" required defaultValue={property?.type_id ?? ""} className="field">
            <option value="" disabled>
              Choose…
            </option>
            {types.map((type) => (
              <option key={type.id} value={type.id}>
                {type.name_en}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Location" required>
          <select
            name="location_id"
            required
            defaultValue={property?.location_id ?? ""}
            className="field"
          >
            <option value="" disabled>
              Choose…
            </option>
            {locations.map((location) => (
              <option key={location.id} value={location.id}>
                {location.name_en}
                {location.is_active ? "" : " (hidden)"}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Status" hint="Draft is not shown on the website">
          <select name="status" defaultValue={property?.status ?? "draft"} className="field capitalize">
            {STATUSES.map((status) => (
              <option key={status}>{status}</option>
            ))}
          </select>
        </Field>
        <Field label="Title (English)" required className="xl:col-span-2">
          <input
            name="title_en"
            required
            minLength={2}
            maxLength={160}
            defaultValue={property?.title_en}
            className="field"
          />
        </Field>
        <Field label="Title (Arabic)" className="xl:col-span-2">
          <input
            name="title_ar"
            dir="rtl"
            lang="ar"
            maxLength={160}
            defaultValue={property?.title_ar}
            className="field"
          />
        </Field>
        <label className="flex min-h-11 items-center gap-2.5 text-sm font-medium">
          <input
            type="checkbox"
            name="featured"
            defaultChecked={property?.featured}
            className="size-5 accent-green-700"
          />
          Featured on the home page
        </label>
      </section>

      <section className={cn(CARD, "grid grid-cols-2 gap-4 md:grid-cols-5")}>
        {numberField("rent_qar", "Rent (QAR / month)", "1", "Empty = price on request")}
        {numberField("rooms", "Rooms")}
        {numberField("capacity_persons", "Capacity (persons)")}
        {numberField("area_sqm", "Area (sq.m)", "any")}
        {numberField("floors", "Floors")}
      </section>

      <section className={cn(CARD, "grid gap-4 md:grid-cols-2")}>
        <Field label="Description (English)">
          <textarea
            name="description_en"
            rows={6}
            maxLength={10000}
            defaultValue={property?.description_en}
            className="field"
          />
        </Field>
        <Field label="Description (Arabic)">
          <textarea
            name="description_ar"
            dir="rtl"
            lang="ar"
            rows={6}
            maxLength={10000}
            defaultValue={property?.description_ar}
            className="field"
          />
        </Field>
      </section>

      <section className={cn(CARD, "flex flex-col gap-4")}>
        <fieldset>
          <legend className="mb-2 text-[13px] font-semibold text-muted-foreground">
            Facilities
          </legend>
          <div className="grid gap-1 sm:grid-cols-2 xl:grid-cols-4">
            {COMMON_AMENITIES.map((name) => (
              <label key={name} className="flex min-h-10 items-center gap-2.5 text-sm">
                <input
                  type="checkbox"
                  name="amenities"
                  value={name}
                  defaultChecked={property?.amenities.includes(name)}
                  className="size-5 accent-green-700"
                />
                {name}
              </label>
            ))}
          </div>
        </fieldset>
        <Field label="Other facilities" hint="One per line. Shown as written in both languages.">
          <textarea
            name="other_amenities"
            rows={3}
            defaultValue={other.join("\n")}
            className="field"
          />
        </Field>
      </section>

      <section className={cn(CARD, "grid gap-4 md:grid-cols-4")}>
        <Field label="National address" className="md:col-span-2">
          <input
            name="national_address"
            maxLength={200}
            placeholder="Zone 57 · Street 12 · Building 3"
            defaultValue={property?.national_address}
            className="field"
          />
        </Field>
        <Field label="Latitude" hint="In Google Maps: right-click the place">
          <input
            name="lat"
            type="number"
            step="any"
            min={-90}
            max={90}
            placeholder="25.19"
            defaultValue={property?.lat ?? ""}
            className="field"
          />
        </Field>
        <Field label="Longitude">
          <input
            name="lng"
            type="number"
            step="any"
            min={-180}
            max={180}
            placeholder="51.43"
            defaultValue={property?.lng ?? ""}
            className="field"
          />
        </Field>
      </section>

      <Message error={error} ok={ok} />
      <Button type="submit" disabled={busy} className="self-start">
        {busy ? "Saving…" : property ? "Save changes" : "Save and add photos"}
      </Button>
    </form>
  );
}
