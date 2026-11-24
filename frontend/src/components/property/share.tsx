"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";

const STYLE =
  "inline-flex min-h-11 items-center rounded-lg border border-field px-3 text-sm font-medium text-green-700 transition-colors hover:bg-tint";

export function Share({ title }: { title: string }) {
  const t = useTranslations("detail");
  const common = useTranslations("common");
  const [copied, setCopied] = useState(false);

  // Read the address on click, so it is right on any domain.
  const open = (build: (url: string) => string) =>
    window.open(build(window.location.href), "_blank", "noopener,noreferrer");

  async function copy() {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      window.prompt(t("copy"), url); // clipboard blocked by the browser
    }
  }

  return (
    <div className="no-print flex flex-col gap-2.5 rounded-2xl border border-line bg-white p-4.5">
      <span className="font-semibold">{t("share")}</span>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={STYLE}
          onClick={() =>
            open((url) => `https://wa.me/?text=${encodeURIComponent(`${title} ${url}`)}`)
          }
        >
          {common("whatsapp")}
        </button>
        <button
          type="button"
          className={STYLE}
          onClick={() =>
            open((url) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`)
          }
        >
          Facebook
        </button>
        <button type="button" className={STYLE} onClick={copy}>
          <span aria-live="polite">{copied ? t("copied") : t("copy")}</span>
        </button>
        <button type="button" className={STYLE} onClick={() => window.print()}>
          {t("print")}
        </button>
      </div>
    </div>
  );
}
