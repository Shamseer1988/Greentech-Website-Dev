"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { startTransition } from "react";
import { Button } from "@/components/ui/button";

export default function ErrorPage({ reset }: { reset: () => void }) {
  const t = useTranslations("errors");
  const router = useRouter();
  return (
    <section className="container-page flex min-h-[55vh] flex-col items-center justify-center gap-5 py-20 text-center">
      <h1 className="text-4xl font-bold text-slate">{t("title")}</h1>
      <p className="text-muted-foreground">{t("text")}</p>
      <Button
        onClick={() =>
          startTransition(() => {
            router.refresh();
            reset();
          })
        }
      >
        {t("retry")}
      </Button>
    </section>
  );
}
