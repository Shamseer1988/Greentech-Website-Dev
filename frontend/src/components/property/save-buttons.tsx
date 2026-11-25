"use client";

import { Heart, Scale } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "cn";
import { Link, usePathname } from "@/i18n/navigation";
import { MAX_COMPARE, save, toggle, useSaved } from "@/lib/saved";
import { count, once } from "@/lib/stats";
import { buttonVariants } from "@/components/ui/button";

const ROUND =
  "relative z-10 flex size-10 items-center justify-center rounded-full bg-white/95 text-slate shadow-sm transition-colors hover:text-green-700";

/** Heart and compare buttons. `wide` shows them with words. */
export function SaveButtons({ code, wide = false }: { code: string; wide?: boolean }) {
  const t = useTranslations("saved");
  const liked = useSaved("favourites").includes(code);
  const compare = useSaved("compare");
  const compared = compare.includes(code);
  const full = !compared && compare.length >= MAX_COMPARE;
  const style = wide
    ? "inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg border border-field bg-white px-3 text-sm font-medium transition-colors hover:border-green-700"
    : ROUND;
  const like = liked ? t("unlike") : t("like");
  const weigh = full ? t("full", { n: MAX_COMPARE }) : compared ? t("uncompare") : t("compare");

  return (
    <span className="flex gap-2">
      <button
        type="button"
        aria-pressed={liked}
        aria-label={`${like} ${code}`}
        title={like}
        onClick={() => {
          if (!liked && once(`like_${code}`)) count("favourite", code);
          toggle("favourites", code);
        }}
        className={style}
      >
        <Heart className={cn("size-4.5", liked && "fill-rose text-rose")} />
        {wide && like}
      </button>
      <button
        type="button"
        aria-pressed={compared}
        aria-label={`${weigh} ${code}`}
        title={weigh}
        disabled={full}
        onClick={() => toggle("compare", code)}
        className={cn(
          style,
          "disabled:opacity-50",
          compared && !wide && "bg-green-700 text-white hover:text-white",
          compared && wide && "border-green-700 bg-tint text-green-700",
        )}
      >
        <Scale className="size-4.5" />
        {wide && (compared ? t("uncompare") : t("compare"))}
      </button>
    </span>
  );
}

/** Heart in the header, with the number of favourites. */
export function FavouritesLink({ dark }: { dark: boolean }) {
  const t = useTranslations("saved");
  const total = useSaved("favourites").length;
  return (
    <Link
      href="/favourites"
      aria-label={t("openFavourites", { n: total })}
      title={t("title")}
      className={cn(
        "relative flex size-11 items-center justify-center rounded-full border transition-colors",
        dark ? "border-white/20 hover:bg-white/10" : "border-field hover:bg-tint",
      )}
    >
      <Heart className="size-5" />
      {total > 0 && (
        <span className="absolute -end-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose px-1 text-[11px] font-bold text-white">
          {total}
        </span>
      )}
    </Link>
  );
}

/** Bar at the bottom while properties are chosen to compare. */
export function CompareBar() {
  const t = useTranslations("saved");
  const codes = useSaved("compare");
  const pathname = usePathname();
  if (!codes.length || pathname === "/compare") return null;
  return (
    <div
      role="status"
      className="no-print fixed inset-x-4 bottom-20 z-20 mx-auto flex max-w-110 items-center justify-between gap-2 rounded-2xl bg-deep p-2.5 ps-4 text-white shadow-[0_18px_44px_rgb(4_29_21/.4)] md:bottom-7"
    >
      <span className="text-sm font-semibold">
        {t("chosen", { n: codes.length, max: MAX_COMPARE })}
      </span>
      <span className="flex gap-1.5">
        <button
          type="button"
          onClick={() => save("compare", [])}
          className="min-h-11 rounded-lg px-3 text-sm text-sage hover:bg-white/10"
        >
          {t("clear")}
        </button>
        <Link
          href={`/compare?codes=${codes.join(",")}`}
          className={buttonVariants({ variant: "mint", size: "sm" })}
        >
          {t("compareNow")}
        </Link>
      </span>
    </div>
  );
}
