import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { cn } from "cn";
import { titleOf } from "@/lib/format";
import type { PropertyCard } from "@/lib/types";

/** Cover photo filling its parent, or a branded placeholder. */
export function PropertyPhoto({
  property,
  sizes,
  className,
}: {
  property: PropertyCard;
  sizes: string;
  className?: string;
}) {
  const locale = useLocale();
  return property.cover_url ? (
    <Image
      src={property.cover_url}
      alt={titleOf(property, locale)}
      fill
      sizes={sizes}
      className={cn("object-cover", className)}
    />
  ) : (
    <PhotoPlaceholder />
  );
}

export function PhotoPlaceholder() {
  const t = useTranslations("common");
  return (
    <span className="photo-empty absolute inset-0 flex flex-col items-center justify-center gap-2 text-[13px] text-[#3a4a44]">
      <Image src="/brand/greentech-emblem.svg" alt="" width={56} height={56} unoptimized className="h-12 w-auto" />
      {t("photoSoon")}
    </span>
  );
}
