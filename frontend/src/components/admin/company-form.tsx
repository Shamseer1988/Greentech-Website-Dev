"use client";

import { ArrowDown, ArrowUp } from "lucide-react";
import { useState, type FormEvent } from "react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { adminSend } from "@/lib/admin-client";
import type { CompanyContent, CompanyLink } from "@/lib/types";
import { CARD, Field, Message, SMALL_BUTTON } from "./ui";

const RTL = { dir: "rtl", lang: "ar" } as const;
const GROUPS = [
  ["social", "Social media", "Instagram, Facebook, LinkedIn, X, Snapchat…"],
  ["portal", "Property websites", "Property Finder, Qatar Living, Mzad Qatar…"],
] as const;

type Row = CompanyLink & { id: number };

const text = (value: number | null) => (value === null ? "" : String(value));
const number = (value: string) => (value.trim() ? Number(value) : null);

export function CompanyForm({ initial }: { initial: CompanyContent }) {
  const [data, setData] = useState({
    ...initial,
    email: initial.email ?? "",
    lat: text(initial.lat),
    lng: text(initial.lng),
  });
  const [links, setLinks] = useState<Row[]>(initial.links.map((link, id) => ({ ...link, id })));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");

  function changeLinks(next: Row[]) {
    setOk("");
    setLinks(next);
  }
  const changeLink = (id: number, change: Partial<CompanyLink>) =>
    changeLinks(links.map((l) => (l.id === id ? { ...l, ...change } : l)));

  function move(row: Row, step: number) {
    const same = links.filter((l) => l.group === row.group);
    const other = same[same.indexOf(row) + step];
    changeLinks(links.map((l) => (l.id === row.id ? other : l.id === other.id ? row : l)));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setOk("");
    try {
      const saved = await adminSend<CompanyContent>("PUT", "/company", {
        ...data,
        email: data.email.trim() || null,
        lat: number(data.lat),
        lng: number(data.lng),
        links: links.map(({ name, url, group }) => ({ name, url, group })),
      });
      setData({
        ...saved,
        email: saved.email ?? "",
        lat: text(saved.lat),
        lng: text(saved.lng),
      });
      setOk("Saved. The website is updated.");
    } catch (problem) {
      setError((problem as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const input = (
    name: Exclude<keyof typeof data, "links">,
    props: React.ComponentProps<"input">,
  ) => (
    <input
      name={name}
      value={data[name]}
      onChange={(event) => {
        setOk("");
        setData({ ...data, [name]: event.target.value });
      }}
      className="field"
      {...props}
    />
  );

  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      <section className={cn(CARD, "flex flex-col gap-4")}>
        <h2 className="text-lg font-semibold text-slate">Contact</h2>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Field label="WhatsApp number" hint="With country code, e.g. +974 5555 5555">
            {input("whatsapp", { type: "tel", maxLength: 40, placeholder: "+974" })}
          </Field>
          <Field label="Phone number">
            {input("phone", { type: "tel", maxLength: 40, placeholder: "+974" })}
          </Field>
          <Field label="Email">{input("email", { type: "email", maxLength: 254 })}</Field>
          <Field label="CR number">{input("cr_number", { maxLength: 40 })}</Field>
        </div>
      </section>

      <section className={cn(CARD, "flex flex-col gap-4")}>
        <h2 className="text-lg font-semibold text-slate">Office</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Address (English)">{input("address_en", { maxLength: 200 })}</Field>
          <Field label="Address (Arabic)">{input("address_ar", { ...RTL, maxLength: 200 })}</Field>
          <Field label="Working hours (English)">
            {input("hours_en", { maxLength: 120, placeholder: "Sat–Thu · 8:00 AM – 6:00 PM" })}
          </Field>
          <Field label="Working hours (Arabic)">
            {input("hours_ar", { ...RTL, maxLength: 120 })}
          </Field>
          <Field
            label="Map: latitude"
            hint="In Google Maps, right-click your office and click the two numbers to copy them."
          >
            {input("lat", { type: "number", step: "any", min: -90, max: 90 })}
          </Field>
          <Field label="Map: longitude" hint="Both empty = no office map on the Contact page">
            {input("lng", { type: "number", step: "any", min: -180, max: 180 })}
          </Field>
        </div>
      </section>

      {GROUPS.map(([group, title, hint]) => {
        const rows = links.filter((l) => l.group === group);
        return (
          <section key={group} data-group={group} className={cn(CARD, "flex flex-col gap-4")}>
            <div>
              <h2 className="text-lg font-semibold text-slate">{title}</h2>
              <p className="text-sm text-muted-foreground">{hint}</p>
            </div>
            {rows.map((row, i) => (
              <div key={row.id} className="grid items-end gap-3 md:grid-cols-[220px_1fr_auto]">
                <Field label="Name" required>
                  <input
                    required
                    maxLength={40}
                    value={row.name}
                    onChange={(event) => changeLink(row.id, { name: event.target.value })}
                    className="field"
                  />
                </Field>
                <Field label="Link" required>
                  <input
                    required
                    type="url"
                    pattern="https://.+"
                    title="Starts with https://"
                    maxLength={300}
                    placeholder="https://"
                    value={row.url}
                    onChange={(event) => changeLink(row.id, { url: event.target.value })}
                    className="field"
                  />
                </Field>
                <div className="flex gap-2">
                  <button
                    type="button"
                    aria-label={`Move ${row.name} up`}
                    disabled={i === 0}
                    onClick={() => move(row, -1)}
                    className={SMALL_BUTTON}
                  >
                    <ArrowUp className="size-4" />
                  </button>
                  <button
                    type="button"
                    aria-label={`Move ${row.name} down`}
                    disabled={i === rows.length - 1}
                    onClick={() => move(row, 1)}
                    className={SMALL_BUTTON}
                  >
                    <ArrowDown className="size-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => changeLinks(links.filter((l) => l.id !== row.id))}
                    className={cn(
                      SMALL_BUTTON,
                      "text-danger hover:border-danger hover:text-danger",
                    )}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
            <button
              type="button"
              disabled={links.length >= 30}
              onClick={() =>
                changeLinks([
                  ...links,
                  { id: Math.max(-1, ...links.map((l) => l.id)) + 1, name: "", url: "", group },
                ])
              }
              className={cn(SMALL_BUTTON, "self-start")}
            >
              + Add link
            </button>
          </section>
        );
      })}

      <div className={cn(CARD, "flex flex-col gap-4")}>
        <Message error={error} ok={ok} />
        <Button type="submit" size="sm" disabled={busy} className="self-start">
          {busy ? "Saving…" : "Save company details"}
        </Button>
      </div>
    </form>
  );
}
