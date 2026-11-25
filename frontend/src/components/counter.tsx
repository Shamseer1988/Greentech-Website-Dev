"use client";

import { useParams } from "next/navigation";
import { useEffect } from "react";
import { count, once, rememberSource } from "@/lib/stats";

function decoded(text: string): string {
  try {
    return decodeURIComponent(text);
  } catch {
    return "";
  }
}

/** Counts WhatsApp and call clicks, and remembers where the visit came from. */
export function Counter() {
  const { code } = useParams<{ code?: string }>();

  useEffect(rememberSource, []);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const href = (event.target as Element | null)?.closest?.("a")?.href ?? "";
      const inText = /GT-[A-Z0-9-]+/.exec(decoded(href.split("text=")[1] ?? ""))?.[0];
      const about = (inText ?? code ?? "").toUpperCase();
      // wa.me/?text= is the "share" button, not a message to us.
      if (/^https:\/\/wa\.me\/\d/.test(href)) count("whatsapp", about);
      else if (href.startsWith("tel:")) count("call", about);
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [code]);
  return null;
}

/** Counts that a property page was opened, once per visit. */
export function PropertyView({ code }: { code: string }) {
  useEffect(() => {
    if (once(`view_${code}`)) count("view", code);
  }, [code]);
  return null;
}
