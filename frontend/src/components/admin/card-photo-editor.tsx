"use client";

import { Upload } from "lucide-react";
import { useRef, useState } from "react";
import { cn } from "cn";
import { CardPhoto } from "@/components/home/card-photo";
import { adminSend, adminUpload } from "@/lib/admin-client";
import type { TypeFull } from "@/lib/admin-types";
import { CARD, Message, SMALL_BUTTON } from "./ui";

/** Photo and strength of one category card, with a live preview. */
export function CardPhotoEditor({ initial, dark }: { initial: TypeFull; dark: boolean }) {
  const [type, setType] = useState(initial);
  const [opacity, setOpacity] = useState(initial.image_opacity);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const picker = useRef<HTMLInputElement>(null);
  const path = `/property-types/${type.id}/image`;

  async function run(action: () => Promise<TypeFull>, done: string) {
    setBusy(true);
    setError("");
    setOk("");
    try {
      setType(await action());
      setOk(done);
    } catch (problem) {
      setError((problem as Error).message);
    } finally {
      setProgress("");
      setBusy(false);
    }
  }

  function upload(file: File) {
    const form = new FormData();
    form.set("file", file);
    return run(
      () =>
        adminUpload<TypeFull>(path, form, (p) =>
          setProgress(p < 100 ? `Uploading: ${p}%` : "Processing…"),
        ),
      "Photo saved.",
    );
  }

  return (
    <section className={cn(CARD, "flex flex-col gap-4")} aria-label={type.name_en}>
      <div
        className={cn(
          "group relative flex h-55 flex-col justify-end overflow-hidden rounded-2xl border p-6",
          dark ? "border-green-700 bg-deep text-white" : "border-line bg-white text-slate",
        )}
      >
        {type.image_url && (
          <CardPhoto src={type.image_url} opacity={opacity} dark={dark} sizes="480px" />
        )}
        {!type.image_url && (
          <span className={cn("absolute start-6 top-6 text-sm", dark ? "text-sage" : "text-muted-foreground")}>
            No photo
          </span>
        )}
        <h2 className="relative text-2xl font-semibold">{type.name_en}</h2>
        <span dir="rtl" lang="ar" className="relative text-start text-sm">
          {type.name_ar}
        </span>
      </div>

      <div className="flex flex-wrap gap-2.5">
        <button
          type="button"
          disabled={busy}
          onClick={() => picker.current?.click()}
          className={SMALL_BUTTON}
        >
          <Upload className="size-4" /> {type.image_url ? "Change photo" : "Upload photo"}
        </button>
        {type.image_url && (
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              if (window.confirm(`Remove the photo of ${type.name_en}?`)) {
                void run(() => adminSend<TypeFull>("DELETE", path), "Photo removed.");
              }
            }}
            className={cn(SMALL_BUTTON, "text-danger hover:border-danger hover:text-danger")}
          >
            Remove
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

      {type.image_url && (
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex min-w-48 flex-1 flex-col gap-2 text-[13px] font-semibold text-muted-foreground">
            <span className="flex justify-between">
              Photo strength <output className="text-slate">{opacity}%</output>
            </span>
            <input
              type="range"
              min={10}
              max={100}
              step={5}
              value={opacity}
              disabled={busy}
              onChange={(event) => {
                setOpacity(Number(event.target.value));
                setOk("");
              }}
              className="h-10 accent-green-700"
            />
          </label>
          <button
            type="button"
            disabled={busy || opacity === type.image_opacity}
            onClick={() =>
              run(
                () => adminSend<TypeFull>("PATCH", path, { image_opacity: opacity }),
                "Strength saved.",
              )
            }
            className={cn(SMALL_BUTTON, "disabled:opacity-50")}
          >
            Save strength
          </button>
        </div>
      )}
      <span role="status" className="text-sm font-semibold text-green-700 empty:hidden">
        {progress}
      </span>
      <Message error={error} ok={ok} />
    </section>
  );
}
