"use client";

import { FileDown } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { cn } from "cn";
import { buttonVariants } from "@/components/ui/button";
import { count, once } from "@/lib/stats";

export function BrochureLink({ code }: { code: string }) {
  const t = useTranslations("detail");
  return (
    <a
      href={`/brochure/${code}-${useLocale()}.pdf`}
      target="_blank"
      onClick={() => {
        if (once(`brochure_${code}`)) count("brochure", code);
      }}
      className={cn(buttonVariants({ variant: "outline", size: "sm" }), "text-green-700")}
    >
      <FileDown />
      {t("brochure")}
    </a>
  );
}
