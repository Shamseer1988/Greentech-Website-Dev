"use client";

import { Play } from "lucide-react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import Lightbox from "yet-another-react-lightbox";
import Video from "yet-another-react-lightbox/plugins/video";
import "yet-another-react-lightbox/styles.css";
import { cn } from "cn";
import { num } from "@/lib/format";
import type { Media } from "@/lib/types";
import { PhotoPlaceholder } from "./property-photo";

/** Photo grid that opens full screen. Extra photos, videos and 360° photos are inside. */
export function Gallery({ media, title }: { media: Media[]; title: string }) {
  const t = useTranslations("detail");
  const common = useTranslations("common");
  const locale = useLocale();
  const [open, setOpen] = useState(-1);

  const rank = (m: Media) => (m.is_cover ? 0 : m.kind === "image" ? 1 : 2);
  const ordered = [...media].sort((a, b) => rank(a) - rank(b) || a.sort_order - b.sort_order);
  const photos = ordered.filter((m) => m.kind === "image");
  const extras = [
    ordered.some((m) => m.kind === "video") && t("video"),
    ordered.some((m) => m.kind === "360") && t("pano"),
  ].filter(Boolean);

  if (!ordered.length) {
    return (
      <div className="relative h-65 overflow-hidden rounded-2xl sm:h-100">
        <PhotoPlaceholder />
      </div>
    );
  }

  const tiles = (photos.length ? photos : ordered).slice(0, 5);
  const hasMore = ordered.length > tiles.length;

  return (
    <>
      <div
        className={cn(
          "grid gap-3",
          tiles.length >= 5 && "grid-cols-2 sm:grid-cols-4 sm:grid-rows-[220px_220px]",
          tiles.length > 1 && tiles.length < 5 && "sm:grid-cols-2",
        )}
      >
        {tiles.map((item, i) => {
          const last = i === tiles.length - 1;
          return (
            <button
              key={item.id}
              type="button"
              aria-label={t("openPhoto", { n: num(i + 1) })}
              onClick={() => setOpen(ordered.indexOf(item))}
              className={cn(
                "group relative h-60 overflow-hidden rounded-2xl bg-deep",
                tiles.length === 1 && "sm:h-115",
                tiles.length >= 5 && (i === 0 ? "col-span-2 sm:row-span-2 sm:h-auto" : "h-36 sm:h-auto"),
              )}
            >
              {item.kind === "video" ? (
                <span className="flex size-full items-center justify-center text-white">
                  <Play className="size-12" />
                </span>
              ) : (
                <Image
                  src={item.url}
                  alt={`${title} – ${num(i + 1)}`}
                  fill
                  priority={i === 0}
                  sizes={i === 0 ? "(min-width: 640px) 620px, 100vw" : "(min-width: 640px) 310px, 50vw"}
                  className="object-cover transition duration-500 group-hover:scale-105"
                />
              )}
              {last && (hasMore || extras.length > 0) && (
                <span className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-deep/65 font-semibold text-white">
                  <span>{t("viewPhotos")}</span>
                  <span className="text-[13px] font-normal">
                    {[
                      photos.length > 0 &&
                        common("photos", { count: photos.length, n: num(photos.length) }),
                      ...extras,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </span>
              )}
            </button>
          );
        })}
      </div>
      <Lightbox
        open={open >= 0}
        index={Math.max(open, 0)}
        close={() => setOpen(-1)}
        plugins={[Video]}
        controller={{ closeOnBackdropClick: true }}
        styles={{ root: { direction: locale === "ar" ? "rtl" : "ltr" } }}
        slides={ordered.map((item) =>
          item.kind === "video"
            ? {
                type: "video" as const,
                sources: [
                  { src: item.url, type: item.url.endsWith(".webm") ? "video/webm" : "video/mp4" },
                ],
              }
            : {
                src: item.url,
                alt: title,
                width: item.width ?? undefined,
                height: item.height ?? undefined,
              },
        )}
      />
    </>
  );
}
