"use client";

import { ArrowLeft, ArrowRight, Upload } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";
import { cn } from "cn";
import { HeroBackground } from "@/components/home/hero-background";
import { Button } from "@/components/ui/button";
import { adminSend, adminUpload } from "@/lib/admin-client";
import type { HeroImage, HomeContent } from "@/lib/types";
import { CARD, Field, Message, SMALL_BUTTON } from "./ui";

const MAX_PHOTOS = 8;

/** Background photos of the first section: add, order, delete. Saved at once. */
export function HeroPhotos({ initial }: { initial: HeroImage[] }) {
  const router = useRouter();
  const [images, setImages] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");
  const picker = useRef<HTMLInputElement>(null);

  async function run(action: () => Promise<HeroImage[]>) {
    setBusy(true);
    setError("");
    try {
      setImages(await action());
      router.refresh();
    } catch (problem) {
      setError((problem as Error).message);
    } finally {
      setProgress("");
      setBusy(false);
    }
  }

  async function upload(files: File[]) {
    const problems: string[] = [];
    for (const file of files) {
      const form = new FormData();
      form.set("file", file);
      await run(() =>
        adminUpload<HeroImage[]>("/home/images", form, (p) =>
          setProgress(p < 100 ? `Uploading ${file.name}: ${p}%` : `Processing ${file.name}…`),
        ).catch((problem: Error) => {
          problems.push(`${file.name}: ${problem.message}`);
          throw problem;
        }),
      );
    }
    setError(problems.join(" · "));
  }

  function move(from: number, to: number) {
    const ids = images.map((i) => i.id);
    ids.splice(to, 0, ...ids.splice(from, 1));
    void run(() => adminSend<HeroImage[]>("PUT", "/home/images/order", { ids }));
  }

  return (
    <section className={cn(CARD, "flex flex-col gap-4")}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate">Background photos</h2>
          <p className="text-sm text-muted-foreground">
            Up to {MAX_PHOTOS}. With two or more, they change slowly. JPG, PNG or WebP up to 20 MB,
            best 2400 × 1350. Saved at once.
          </p>
        </div>
        <button
          type="button"
          disabled={busy || images.length >= MAX_PHOTOS}
          onClick={() => picker.current?.click()}
          className={SMALL_BUTTON}
        >
          <Upload className="size-4" /> Add photos
        </button>
        <input
          ref={picker}
          type="file"
          multiple
          hidden
          aria-label="Choose background photos"
          accept="image/jpeg,image/png,image/webp"
          onChange={(event) => {
            const files = [...(event.target.files ?? [])];
            event.target.value = "";
            void upload(files);
          }}
        />
      </div>
      <span role="status" className="text-sm font-semibold text-green-700 empty:hidden">
        {progress}
      </span>
      <Message error={error} />
      {images.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No photos: the plain green background is shown.
        </p>
      )}
      <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
        {images.map((image, i) => (
          <li key={image.id} className="overflow-hidden rounded-xl border border-line">
            <div className="relative aspect-video bg-deep">
              <Image
                src={image.url}
                alt={`Background photo ${i + 1}`}
                fill
                sizes="320px"
                className="object-cover"
              />
            </div>
            <div className="flex flex-wrap gap-1.5 p-2">
              <button
                type="button"
                aria-label={`Move photo ${i + 1} earlier`}
                disabled={busy || i === 0}
                onClick={() => move(i, i - 1)}
                className={SMALL_BUTTON}
              >
                <ArrowLeft className="size-4" />
              </button>
              <button
                type="button"
                aria-label={`Move photo ${i + 1} later`}
                disabled={busy || i === images.length - 1}
                onClick={() => move(i, i + 1)}
                className={SMALL_BUTTON}
              >
                <ArrowRight className="size-4" />
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  if (window.confirm("Delete this photo?")) {
                    void run(() => adminSend<HeroImage[]>("DELETE", `/home/images/${image.id}`));
                  }
                }}
                className={cn(SMALL_BUTTON, "text-danger hover:border-danger hover:text-danger")}
              >
                Delete
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

type TextKey = {
  [K in keyof HomeContent]: HomeContent[K] extends string ? K : never;
}[keyof HomeContent] extends infer K
  ? K extends `${infer Name}_en`
    ? Name
    : never
  : never;

const HERO_FIELDS: { name: TextKey; label: string; hint?: string }[] = [
  { name: "badge", label: "Small label at the top" },
  { name: "start", label: "Title: before the changing word" },
  { name: "end", label: "Title: second line" },
  { name: "chip_label", label: "White box on the drawing: small text" },
  { name: "chip_text", label: "White box on the drawing: main text", hint: "Empty = no box" },
];
const SWITCHES = [
  ["show_search", "Search box"],
  ["show_whatsapp", "WhatsApp link"],
  ["show_scene", "Building drawing"],
  ["show_property", "Property box on the drawing"],
] as const;
const LANGUAGES = [
  ["en", "English"],
  ["ar", "Arabic"],
] as const;

const lines = (text: string) =>
  text
    .split("\n")
    .map((w) => w.trim())
    .filter(Boolean);

export function HomeForm({
  initial,
  isOwn,
  photo,
}: {
  initial: HomeContent;
  isOwn: boolean;
  photo: string | undefined;
}) {
  const router = useRouter();
  const [data, setData] = useState(initial);
  const [words, setWords] = useState({
    en: initial.words_en.join("\n"),
    ar: initial.words_ar.join("\n"),
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [preview, setPreview] = useState<"en" | "ar">("en");

  function set<K extends keyof HomeContent>(name: K, value: HomeContent[K]) {
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
      setBusy(false);
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    const body = { ...data, words_en: lines(words.en), words_ar: lines(words.ar) };
    void run(() => adminSend("PUT", "/home", body), "Saved. The website is updated.");
  }

  const language = (code: "en" | "ar") => ({ dir: code === "ar" ? "rtl" : "ltr", lang: code });
  const pair = (
    name: TextKey,
    label: string,
    extra?: { hint?: string; required?: boolean; max?: number },
  ) => (
    <div key={name} className="grid gap-4 md:grid-cols-2">
      {LANGUAGES.map(([code, title]) => (
        <Field
          key={code}
          label={`${label} (${title})`}
          hint={extra?.hint}
          required={extra?.required}
        >
          <input
            {...language(code)}
            name={`${name}_${code}`}
            required={extra?.required}
            maxLength={extra?.max ?? 80}
            value={data[`${name}_${code}`]}
            onChange={(event) => set(`${name}_${code}`, event.target.value)}
            className="field"
          />
        </Field>
      ))}
    </div>
  );

  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      <section className={cn(CARD, "flex flex-col gap-4")}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate">Preview</h2>
          <div className="flex gap-2">
            {LANGUAGES.map(([code, title]) => (
              <button
                key={code}
                type="button"
                aria-pressed={preview === code}
                onClick={() => setPreview(code)}
                className={cn(SMALL_BUTTON, preview === code && "border-green-700 text-green-700")}
              >
                {title}
              </button>
            ))}
          </div>
        </div>
        <div
          {...language(preview)}
          className="grid-bg relative flex min-h-80 flex-col justify-center gap-4 overflow-hidden rounded-2xl bg-deep p-7 text-white lg:p-12"
        >
          {photo && <HeroBackground images={[photo]} opacity={data.image_opacity} sizes="1200px" />}
          {data[`badge_${preview}`] && (
            <span className="relative self-start rounded-full border border-mint/35 bg-mint/12 px-3 py-1.5 text-xs text-[#bff5dc]">
              {data[`badge_${preview}`]}
            </span>
          )}
          <p className="relative font-heading text-4xl leading-tight font-bold lg:text-5xl">
            {data[`start_${preview}`]} <span className="text-mint">{lines(words[preview])[0]}</span>
            <br />
            {data[`end_${preview}`]}
          </p>
          <p className="relative max-w-120 text-sage">{data[`intro_${preview}`]}</p>
        </div>
        <label className="flex flex-col gap-2 text-[13px] font-semibold text-muted-foreground">
          <span className="flex justify-between">
            Photo strength {!photo && "(add a background photo first)"}
            <output className="text-slate">{data.image_opacity}%</output>
          </span>
          <input
            type="range"
            name="image_opacity"
            min={10}
            max={100}
            step={5}
            value={data.image_opacity}
            onChange={(event) => set("image_opacity", Number(event.target.value))}
            className="h-10 accent-green-700"
          />
        </label>
      </section>

      <section className={cn(CARD, "flex flex-col gap-4")}>
        <h2 className="text-lg font-semibold text-slate">First section</h2>
        {HERO_FIELDS.slice(0, 2).map((f) => pair(f.name, f.label, f))}
        <div className="grid gap-4 md:grid-cols-2">
          {LANGUAGES.map(([code, title]) => (
            <Field
              key={code}
              label={`Changing words (${title})`}
              required
              hint="One per line, 1 to 10"
            >
              <textarea
                {...language(code)}
                name={`words_${code}`}
                required
                rows={4}
                value={words[code]}
                onChange={(event) => {
                  setOk("");
                  setWords((old) => ({ ...old, [code]: event.target.value }));
                }}
                className="field"
              />
            </Field>
          ))}
        </div>
        {HERO_FIELDS.slice(2, 3).map((f) => pair(f.name, f.label, f))}
        <div className="grid gap-4 md:grid-cols-2">
          {LANGUAGES.map(([code, title]) => (
            <Field key={code} label={`Text (${title})`}>
              <textarea
                {...language(code)}
                name={`intro_${code}`}
                rows={3}
                maxLength={400}
                value={data[`intro_${code}`]}
                onChange={(event) => set(`intro_${code}`, event.target.value)}
                className="field"
              />
            </Field>
          ))}
        </div>
        {HERO_FIELDS.slice(3).map((f) => pair(f.name, f.label, f))}
        <fieldset className="flex flex-wrap gap-x-6">
          <legend className="text-[13px] font-semibold text-muted-foreground">Show</legend>
          {SWITCHES.map(([name, label]) => (
            <label key={name} className="flex min-h-11 items-center gap-2.5 text-sm font-medium">
              <input
                type="checkbox"
                name={name}
                checked={data[name]}
                onChange={(event) => set(name, event.target.checked)}
                className="size-5 accent-green-700"
              />
              {label}
            </label>
          ))}
        </fieldset>
      </section>

      <section className={cn(CARD, "flex flex-col gap-4")}>
        <h2 className="text-lg font-semibold text-slate">Title above the category cards</h2>
        {pair("categories_eyebrow", "Small label")}
        {pair("categories_title", "Title", { required: true, max: 120 })}
      </section>

      <div className={cn(CARD, "flex flex-col gap-4")}>
        <Message error={error} ok={ok} />
        <div className="flex flex-wrap items-center gap-2.5">
          <Button type="submit" size="sm" disabled={busy}>
            {busy ? "Saving…" : "Save home page"}
          </Button>
          {isOwn && (
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                if (window.confirm("Replace all your home page texts with the standard ones?")) {
                  void run(async () => {
                    await adminSend("DELETE", "/home");
                    window.location.reload();
                  }, "");
                }
              }}
              className={SMALL_BUTTON}
            >
              Use standard texts
            </button>
          )}
        </div>
      </div>
    </form>
  );
}
