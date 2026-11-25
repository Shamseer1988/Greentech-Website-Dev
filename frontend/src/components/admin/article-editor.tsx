"use client";

import { Upload } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";
import { cn } from "cn";
import { ArticleText } from "@/components/markdown";
import { Button } from "@/components/ui/button";
import { adminSend, adminUpload } from "@/lib/admin-client";
import type { ArticleFull, ArticleInput, LocationFull, TypeFull } from "@/lib/admin-types";
import { DeleteButton } from "./delete-button";
import { CARD, Field, Message, SMALL_BUTTON } from "./ui";

const EMPTY: ArticleInput = {
  slug: "",
  title_en: "",
  title_ar: "",
  summary_en: "",
  summary_ar: "",
  body_en: "",
  body_ar: "",
  location_id: null,
  type_id: null,
  published: false,
};
const LANGUAGES = [
  ["en", "English"],
  ["ar", "Arabic"],
] as const;

const webName = (title: string) =>
  title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);

type Props = { article?: ArticleFull; types: TypeFull[]; locations: LocationFull[] };

export function ArticleEditor({ article, types, locations }: Props) {
  const router = useRouter();
  const [data, setData] = useState<ArticleInput>(() =>
    article
      ? (Object.fromEntries(
          Object.keys(EMPTY).map((key) => [key, article[key as keyof ArticleInput]]),
        ) as ArticleInput)
      : EMPTY,
  );
  const [cover, setCover] = useState(article?.cover_url ?? null);
  const [language, setLanguage] = useState<"en" | "ar">("en");
  const [preview, setPreview] = useState(false);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const picker = useRef<HTMLInputElement>(null);

  function set<K extends keyof ArticleInput>(name: K, value: ArticleInput[K]) {
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
    void run(async () => {
      if (article) return adminSend("PUT", `/articles/${article.id}`, data);
      const made = await adminSend<ArticleFull>("POST", "/articles", data);
      router.push(`/admin/blog/${made.id}`);
    }, "Saved.");
  }

  function upload(file: File) {
    if (!article) return;
    const form = new FormData();
    form.set("file", file);
    void run(async () => {
      const saved = await adminUpload<ArticleFull>(`/articles/${article.id}/cover`, form, (p) =>
        setProgress(p < 100 ? `Uploading: ${p}%` : "Processing…"),
      );
      setCover(saved.cover_url);
    }, "Photo saved.");
  }

  const own = { dir: language === "ar" ? "rtl" : "ltr", lang: language } as const;
  const pair = (name: "title" | "summary" | "body") => `${name}_${language}` as const;

  return (
    <form onSubmit={submit} className="grid items-start gap-5 xl:grid-cols-[1fr_340px]">
      <section className={cn(CARD, "flex min-w-0 flex-col gap-4")}>
        <div className="flex flex-wrap gap-2">
          {LANGUAGES.map(([code, name]) => (
            <button
              key={code}
              type="button"
              aria-pressed={code === language}
              onClick={() => setLanguage(code)}
              className={cn(
                SMALL_BUTTON,
                code === language && "border-green-700 bg-tint text-green-700",
              )}
            >
              {name}
            </button>
          ))}
        </div>
        <Field label="Title" required={language === "en"}>
          <input
            {...own}
            name={pair("title")}
            maxLength={160}
            value={data[pair("title")]}
            onChange={(event) => {
              const title = event.target.value;
              if (!article && language === "en" && data.slug === webName(data.title_en))
                set("slug", webName(title));
              set(pair("title"), title);
            }}
            className="field text-lg font-semibold"
          />
        </Field>
        <Field label="Short summary" hint="Shown in the list and in Google">
          <textarea
            {...own}
            name={pair("summary")}
            rows={2}
            maxLength={300}
            value={data[pair("summary")]}
            onChange={(event) => set(pair("summary"), event.target.value)}
            className="field"
          />
        </Field>
        <div className="flex items-center justify-between gap-3">
          <span className="text-[13px] text-muted-foreground">
            <b>## Heading</b> · <b>**bold**</b> · <b>- list</b> · <b>[link text](/properties)</b>
          </span>
          <button
            type="button"
            aria-pressed={preview}
            onClick={() => setPreview(!preview)}
            className={SMALL_BUTTON}
          >
            {preview ? "Edit text" : "Preview"}
          </button>
        </div>
        {preview ? (
          <div {...own} className="min-h-80 rounded-xl border border-line p-5">
            <ArticleText text={data[pair("body")] || "…"} />
          </div>
        ) : (
          <textarea
            {...own}
            name={pair("body")}
            aria-label="Text"
            rows={20}
            maxLength={30000}
            value={data[pair("body")]}
            onChange={(event) => set(pair("body"), event.target.value)}
            className="field leading-relaxed"
          />
        )}
      </section>

      <div className="flex flex-col gap-5">
        <section className={cn(CARD, "flex flex-col gap-4")}>
          <label className="flex min-h-11 items-center gap-2.5 text-sm font-medium">
            <input
              type="checkbox"
              name="published"
              checked={data.published}
              onChange={(event) => set("published", event.target.checked)}
              className="size-5 accent-green-700"
            />
            Published on the website
          </label>
          <Field label="Web name" required hint="Small letters and -, used in the link">
            <input
              name="slug"
              required
              minLength={3}
              maxLength={80}
              pattern="[a-z0-9]+(-[a-z0-9]+)*"
              value={data.slug}
              onChange={(event) => set("slug", event.target.value)}
              className="field"
            />
          </Field>
          <Field label="Area" hint="Its properties are shown below the article">
            <select
              name="location_id"
              value={data.location_id ?? ""}
              onChange={(event) => set("location_id", Number(event.target.value) || null)}
              className="field"
            >
              <option value="">None</option>
              {locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name_en}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Category">
            <select
              name="type_id"
              value={data.type_id ?? ""}
              onChange={(event) => set("type_id", Number(event.target.value) || null)}
              className="field"
            >
              <option value="">None</option>
              {types.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name_en}
                </option>
              ))}
            </select>
          </Field>
          <Message error={error} ok={ok} />
          <div className="flex flex-wrap gap-2.5">
            <Button type="submit" size="sm" disabled={busy}>
              {busy ? "Saving…" : "Save"}
            </Button>
            {article && (
              <DeleteButton
                path={`/articles/${article.id}`}
                question={`Delete “${article.title_en}”? This cannot be undone.`}
                next="/admin/blog"
              />
            )}
          </div>
        </section>

        <section className={cn(CARD, "flex flex-col gap-3")}>
          <h2 className="font-semibold text-slate">Cover photo</h2>
          {!article && (
            <p className="text-sm text-muted-foreground">Save first, then add a photo.</p>
          )}
          {cover && (
            <div className="relative aspect-video overflow-hidden rounded-xl bg-deep">
              <Image src={cover} alt="Cover" fill sizes="320px" className="object-cover" />
            </div>
          )}
          {article && (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => picker.current?.click()}
                className={SMALL_BUTTON}
              >
                <Upload className="size-4" /> {cover ? "Change" : "Upload"}
              </button>
              {cover && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    void run(async () => {
                      await adminSend("DELETE", `/articles/${article.id}/cover`);
                      setCover(null);
                    }, "Photo removed.")
                  }
                  className={cn(SMALL_BUTTON, "text-danger hover:border-danger hover:text-danger")}
                >
                  Remove
                </button>
              )}
              <input
                ref={picker}
                type="file"
                hidden
                aria-label="Choose a cover photo"
                accept="image/jpeg,image/png,image/webp"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.target.value = "";
                  if (file) upload(file);
                }}
              />
            </div>
          )}
          <span role="status" className="text-sm font-semibold text-green-700 empty:hidden">
            {progress}
          </span>
        </section>
      </div>
    </form>
  );
}
