"use client";

import { ArrowDown, ArrowUp, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";
import { cn } from "cn";
import { CardPhoto } from "@/components/home/card-photo";
import { TypeIcon } from "@/components/type-icon";
import { Button } from "@/components/ui/button";
import { adminSend, adminUpload } from "@/lib/admin-client";
import type { TypeFull, TypeInput } from "@/lib/admin-types";
import { ICON_NAMES } from "@/lib/type-icons";
import { DeleteButton } from "./delete-button";
import { CARD, Field, Message, SMALL_BUTTON } from "./ui";

const EMPTY: TypeInput = {
  slug: "",
  name_en: "",
  name_ar: "",
  text_en: "",
  text_ar: "",
  icon: "building",
  coming_soon: false,
  is_active: true,
  image_opacity: 50,
};

const webName = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);

function fieldsOf(type: TypeInput): TypeInput {
  return {
    slug: type.slug,
    name_en: type.name_en,
    name_ar: type.name_ar,
    text_en: type.text_en,
    text_ar: type.text_ar,
    icon: type.icon,
    coming_soon: type.coming_soon,
    is_active: type.is_active,
    image_opacity: type.image_opacity,
  };
}

/** One category: texts, icon, photo, order. Without `type` it adds a new one. */
export function CategoryEditor({
  type,
  ids = [],
  dark = false,
}: {
  type?: TypeFull;
  /** All category ids in order, for the move buttons. */
  ids?: number[];
  dark?: boolean;
}) {
  const router = useRouter();
  const [data, setData] = useState(type ? fieldsOf(type) : EMPTY);
  const [photo, setPhoto] = useState(type?.image_url ?? null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const picker = useRef<HTMLInputElement>(null);
  const path = `/property-types/${type?.id}`;
  const position = type ? ids.indexOf(type.id) : -1;

  function set<K extends keyof TypeInput>(name: K, value: TypeInput[K]) {
    setOk("");
    setData((old) => ({ ...old, [name]: value }));
  }

  async function run(action: () => Promise<unknown>, done: string) {
    setBusy(true);
    setError("");
    setOk("");
    try {
      await action();
      setOk(done);
      router.refresh();
    } catch (problem) {
      setError((problem as Error).message);
    } finally {
      setProgress("");
      setBusy(false);
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    void run(
      () => (type ? adminSend("PUT", path, data) : adminSend("POST", "/property-types", data)),
      "Saved.",
    );
  }

  function upload(file: File) {
    const form = new FormData();
    form.set("file", file);
    return run(async () => {
      const saved = await adminUpload<TypeFull>(`${path}/image`, form, (p) =>
        setProgress(p < 100 ? `Uploading: ${p}%` : "Processing…"),
      );
      setPhoto(saved.image_url);
    }, "Photo saved.");
  }

  function move(to: number) {
    const order = [...ids];
    order.splice(to, 0, ...order.splice(position, 1));
    void run(() => adminSend("PUT", "/property-types/order", { ids: order }), "");
  }

  return (
    <details className={CARD} data-slug={type?.slug}>
      <summary className="flex cursor-pointer flex-wrap items-center gap-x-3 gap-y-1 font-semibold text-slate">
        {type && (
          <span className="flex size-9 items-center justify-center rounded-lg bg-tint text-green-700">
            <TypeIcon name={type.icon} className="size-5" />
          </span>
        )}
        {type ? type.name_en : "+ Add category"}
        {type && (
          <span className="text-sm font-normal text-muted-foreground">
            {type.property_count} properties
            {type.coming_soon && " · coming soon"}
            {!type.is_active && " · hidden"}
          </span>
        )}
      </summary>

      <form onSubmit={submit} className="mt-5 grid gap-6 xl:grid-cols-[400px_1fr]">
        <div className="flex flex-col gap-4">
          <div
            className={cn(
              "group relative flex h-55 flex-col justify-between overflow-hidden rounded-2xl border p-6",
              dark ? "border-green-700 bg-deep text-white" : "border-line bg-white text-slate",
            )}
          >
            {photo && (
              <CardPhoto src={photo} opacity={data.image_opacity} dark={dark} sizes="400px" />
            )}
            <span
              className={cn(
                "relative flex size-12 items-center justify-center rounded-xl",
                dark ? "bg-mint text-deep" : "bg-tint text-green-700",
              )}
            >
              <TypeIcon name={data.icon} className="size-6" />
            </span>
            <span className="relative flex flex-col gap-1">
              <span className="font-heading text-2xl font-semibold">{data.name_en || "Name"}</span>
              <span className={cn("text-sm", dark ? "text-sage" : "text-muted-foreground")}>
                {data.text_en}
              </span>
            </span>
          </div>

          {type ? (
            <>
              <div className="flex flex-wrap gap-2.5">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => picker.current?.click()}
                  className={SMALL_BUTTON}
                >
                  <Upload className="size-4" /> {photo ? "Change photo" : "Upload photo"}
                </button>
                {photo && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      if (window.confirm(`Remove the photo of ${type.name_en}?`)) {
                        void run(async () => {
                          await adminSend("DELETE", `${path}/image`);
                          setPhoto(null);
                        }, "Photo removed.");
                      }
                    }}
                    className={cn(
                      SMALL_BUTTON,
                      "text-danger hover:border-danger hover:text-danger",
                    )}
                  >
                    Remove photo
                  </button>
                )}
                <input
                  ref={picker}
                  type="file"
                  hidden
                  aria-label={`Choose a photo for ${type.name_en}`}
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    event.target.value = "";
                    if (file) void upload(file);
                  }}
                />
              </div>
              {photo && (
                <label className="flex flex-col gap-2 text-[13px] font-semibold text-muted-foreground">
                  <span className="flex justify-between">
                    Photo strength <output className="text-slate">{data.image_opacity}%</output>
                  </span>
                  <input
                    type="range"
                    min={10}
                    max={100}
                    step={5}
                    value={data.image_opacity}
                    onChange={(event) => set("image_opacity", Number(event.target.value))}
                    className="h-10 accent-green-700"
                  />
                </label>
              )}
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Save first, then add a photo.</p>
          )}
          <span role="status" className="text-sm font-semibold text-green-700 empty:hidden">
            {progress}
          </span>
        </div>

        <div className="flex flex-col gap-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Name (English)" required>
              <input
                name="name_en"
                required
                minLength={2}
                maxLength={80}
                value={data.name_en}
                onChange={(event) => {
                  const name = event.target.value;
                  if (!type && data.slug === webName(data.name_en)) set("slug", webName(name));
                  set("name_en", name);
                }}
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
                value={data.name_ar}
                onChange={(event) => set("name_ar", event.target.value)}
                className="field"
              />
            </Field>
            <Field label="Text (English)">
              <textarea
                name="text_en"
                rows={2}
                maxLength={200}
                value={data.text_en}
                onChange={(event) => set("text_en", event.target.value)}
                className="field"
              />
            </Field>
            <Field label="Text (Arabic)">
              <textarea
                name="text_ar"
                dir="rtl"
                lang="ar"
                rows={2}
                maxLength={200}
                value={data.text_ar}
                onChange={(event) => set("text_ar", event.target.value)}
                className="field"
              />
            </Field>
            <Field
              label="Web name"
              required
              hint={
                type
                  ? "Used in links. Changing it breaks old links."
                  : "Small letters and -, e.g. open-yard. Used in links."
              }
            >
              <input
                name="slug"
                required
                minLength={2}
                maxLength={60}
                pattern="[a-z0-9]+(-[a-z0-9]+)*"
                value={data.slug}
                onChange={(event) => set("slug", event.target.value)}
                className="field"
              />
            </Field>
          </div>

          <fieldset>
            <legend className="mb-1.5 text-[13px] font-semibold text-muted-foreground">Icon</legend>
            <div className="flex flex-wrap gap-2">
              {ICON_NAMES.map((name) => (
                <button
                  key={name}
                  type="button"
                  aria-label={name}
                  title={name}
                  aria-pressed={data.icon === name}
                  onClick={() => set("icon", name)}
                  className={cn(
                    "flex size-11 items-center justify-center rounded-lg border transition-colors",
                    data.icon === name
                      ? "border-green-700 bg-tint text-green-700"
                      : "border-field text-slate hover:border-green-700",
                  )}
                >
                  <TypeIcon name={name} className="size-5" />
                </button>
              ))}
            </div>
          </fieldset>

          <div className="flex flex-wrap gap-x-6">
            <label className="flex min-h-11 items-center gap-2.5 text-sm font-medium">
              <input
                type="checkbox"
                name="is_active"
                checked={data.is_active}
                onChange={(event) => set("is_active", event.target.checked)}
                className="size-5 accent-green-700"
              />
              Show on the website
            </label>
            <label className="flex min-h-11 items-center gap-2.5 text-sm font-medium">
              <input
                type="checkbox"
                name="coming_soon"
                checked={data.coming_soon}
                onChange={(event) => set("coming_soon", event.target.checked)}
                className="size-5 accent-green-700"
              />
              Coming soon
            </label>
          </div>

          <Message error={error} ok={ok} />
          <div className="flex flex-wrap items-center gap-2.5">
            <Button type="submit" size="sm" disabled={busy}>
              {busy ? "Saving…" : type ? "Save" : "Add category"}
            </Button>
            {type && (
              <>
                <button
                  type="button"
                  disabled={busy || position <= 0}
                  onClick={() => move(position - 1)}
                  className={SMALL_BUTTON}
                >
                  <ArrowUp className="size-4" /> Move up
                </button>
                <button
                  type="button"
                  disabled={busy || position === ids.length - 1}
                  onClick={() => move(position + 1)}
                  className={SMALL_BUTTON}
                >
                  <ArrowDown className="size-4" /> Move down
                </button>
                {type.property_count === 0 ? (
                  <DeleteButton
                    path={path}
                    question={`Delete ${type.name_en}? This cannot be undone.`}
                  />
                ) : (
                  <span className="text-[13px] text-muted-foreground">
                    To delete, first move its {type.property_count} properties.
                  </span>
                )}
              </>
            )}
          </div>
        </div>
      </form>
    </details>
  );
}
