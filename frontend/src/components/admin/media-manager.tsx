"use client";

import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  rectSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Play, Upload } from "lucide-react";
import Image from "next/image";
import { useId, useRef, useState, type DragEvent } from "react";
import { cn } from "cn";
import { adminSend, adminUpload } from "@/lib/admin-client";
import type { Media } from "@/lib/types";
import { CARD, Message, SMALL_BUTTON } from "./ui";

/** Upload, drag to reorder, set cover, delete. */
export function MediaManager({ propertyId, initial }: { propertyId: number; initial: Media[] }) {
  const [media, setMedia] = useState(initial);
  const [progress, setProgress] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [panorama, setPanorama] = useState(false);
  const [over, setOver] = useState(false);
  const picker = useRef<HTMLInputElement>(null);
  const dndId = useId();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  async function upload(files: File[]) {
    if (busy || !files.length) return;
    setBusy(true);
    setError("");
    const problems: string[] = [];
    for (const [i, file] of files.entries()) {
      const form = new FormData();
      const video = file.type.startsWith("video/");
      form.set("kind", video ? "video" : panorama ? "360" : "image");
      form.set("file", file);
      const label = `${file.name} (${i + 1} of ${files.length})`;
      setProgress(`Uploading ${label}…`);
      try {
        const added = await adminUpload<Media>(`/properties/${propertyId}/media`, form, (p) =>
          setProgress(p < 100 ? `Uploading ${label}: ${p}%` : `Processing ${label}…`),
        );
        setMedia((list) => [...list, added]);
      } catch (problem) {
        problems.push(`${file.name}: ${(problem as Error).message}`);
      }
    }
    setError(problems.join(" · "));
    setProgress("");
    setBusy(false);
  }

  async function change(action: () => Promise<Media[]>) {
    setBusy(true);
    setError("");
    try {
      setMedia(await action());
    } catch (problem) {
      setError((problem as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function onDragEnd({ active, over: target }: DragEndEvent) {
    if (!target || active.id === target.id) return;
    const before = media;
    const position = (id: unknown) => media.findIndex((m) => m.id === id);
    const after = arrayMove(media, position(active.id), position(target.id));
    setMedia(after);
    void change(async () => {
      try {
        return await adminSend<Media[]>("PUT", `/properties/${propertyId}/media/order`, {
          ids: after.map((m) => m.id),
        });
      } catch (problem) {
        setMedia(before);
        throw problem;
      }
    });
  }

  function onDrop(event: DragEvent) {
    event.preventDefault();
    setOver(false);
    void upload([...event.dataTransfer.files]);
  }

  return (
    <section id="photos" className={cn(CARD, "flex scroll-mt-4 flex-col gap-4")}>
      <div>
        <h2 className="text-lg font-semibold text-slate">Photos and videos</h2>
        <p className="text-sm text-muted-foreground">
          Drag the handle to change the order. Changes here are saved at once.
        </p>
      </div>

      <div
        onDragOver={(event) => {
          event.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={onDrop}
        className={cn(
          "flex flex-col items-center gap-3 rounded-xl border-2 border-dashed border-[#bfd2c7] p-7 text-center text-sm text-muted-foreground",
          over && "border-green-700 bg-tint",
        )}
      >
        <span>
          Drop photos / videos here · photos are resized to WebP
          <br />
          JPG, PNG, WebP up to 20 MB · MP4, WebM up to 95 MB
        </span>
        <button
          type="button"
          disabled={busy}
          onClick={() => picker.current?.click()}
          className={SMALL_BUTTON}
        >
          <Upload className="size-4" /> Choose files
        </button>
        <input
          ref={picker}
          type="file"
          multiple
          hidden
          aria-label="Choose photos or videos"
          accept="image/jpeg,image/png,image/webp,video/mp4,video/webm"
          onChange={(event) => {
            const files = [...(event.target.files ?? [])];
            event.target.value = "";
            void upload(files);
          }}
        />
        <label className="flex min-h-10 items-center gap-2.5">
          <input
            type="checkbox"
            checked={panorama}
            onChange={(event) => setPanorama(event.target.checked)}
            className="size-5 accent-green-700"
          />
          These are 360° photos
        </label>
        <span role="status" className="font-semibold text-green-700 empty:hidden">
          {progress}
        </span>
      </div>
      <Message error={error} />

      <DndContext
        id={dndId}
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={onDragEnd}
      >
        <SortableContext items={media.map((m) => m.id)} strategy={rectSortingStrategy}>
          <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
            {media.map((item, i) => (
              <Tile
                key={item.id}
                item={item}
                number={i + 1}
                busy={busy}
                onCover={() =>
                  change(() => adminSend<Media[]>("PUT", `/media/${item.id}/cover`))
                }
                onDelete={() => {
                  if (window.confirm("Delete this file? This cannot be undone.")) {
                    void change(() => adminSend<Media[]>("DELETE", `/media/${item.id}`));
                  }
                }}
              />
            ))}
          </ul>
        </SortableContext>
      </DndContext>
    </section>
  );
}

function Tile({
  item,
  number,
  busy,
  onCover,
  onDelete,
}: {
  item: Media;
  number: number;
  busy: boolean;
  onCover: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id, disabled: busy });

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "flex flex-col overflow-hidden rounded-xl border border-line bg-white",
        isDragging && "z-10 opacity-80 shadow-xl",
      )}
    >
      <div className="relative aspect-4/3 bg-deep">
        {item.kind === "video" ? (
          <span className="flex size-full items-center justify-center text-white">
            <Play className="size-10" />
          </span>
        ) : (
          <Image
            src={item.url}
            alt={`Photo ${number}`}
            fill
            sizes="240px"
            className="object-cover"
            draggable={false}
          />
        )}
        {item.is_cover && (
          <span className="absolute start-2 top-2 rounded-full bg-mint px-2.5 py-1 text-xs font-semibold text-deep">
            Cover
          </span>
        )}
        {item.kind === "360" && (
          <span className="absolute start-2 top-2 rounded-full bg-white px-2.5 py-1 text-xs font-semibold">
            360°
          </span>
        )}
        <button
          ref={setActivatorNodeRef}
          type="button"
          {...attributes}
          {...listeners}
          aria-label={`Move item ${number}`}
          className="absolute end-2 top-2 flex size-10 cursor-grab touch-none items-center justify-center rounded-lg bg-white/90"
        >
          <GripVertical className="size-5" />
        </button>
      </div>
      <div className="flex flex-wrap gap-1.5 p-2">
        {item.kind === "image" && !item.is_cover && (
          <button type="button" disabled={busy} onClick={onCover} className={SMALL_BUTTON}>
            Set cover
          </button>
        )}
        <button
          type="button"
          disabled={busy}
          onClick={onDelete}
          className={cn(SMALL_BUTTON, "text-danger hover:border-danger hover:text-danger")}
        >
          Delete
        </button>
      </div>
    </li>
  );
}
