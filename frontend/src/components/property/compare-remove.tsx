"use client";

import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { save } from "@/lib/saved";

export function CompareRemove({ code, codes }: { code: string; codes: string[] }) {
  const t = useTranslations("saved");
  const router = useRouter();
  return (
    <button
      type="button"
      aria-label={`${t("uncompare")} ${code}`}
      onClick={() => {
        const left = codes.filter((c) => c !== code);
        save("compare", left);
        router.replace(left.length ? `/compare?codes=${left.join(",")}` : "/compare");
      }}
      className="absolute end-2 top-2 flex size-9 items-center justify-center rounded-full bg-white/95 text-slate shadow hover:text-danger"
    >
      <X className="size-4" />
    </button>
  );
}
