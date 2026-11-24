"use client";

import { useLocale } from "next-intl";
import Script from "next/script";
import { useEffect, useRef, useState } from "react";

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || null;
export const hasTurnstile = SITE_KEY !== null;

type Api = {
  render: (element: HTMLElement, options: Record<string, unknown>) => string;
  remove: (id: string) => void;
};
declare global {
  interface Window {
    turnstile?: Api;
  }
}

/** Cloudflare's "are you human" check. A token works once: change `attempt` to get a new one. */
export function Turnstile({
  attempt,
  onToken,
}: {
  attempt: number;
  onToken: (token: string) => void;
}) {
  const locale = useLocale();
  const box = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const api = window.turnstile;
    if (!ready || !api || !box.current || !SITE_KEY) return;
    const id = api.render(box.current, {
      sitekey: SITE_KEY,
      language: locale,
      size: "flexible",
      "response-field": false,
      callback: onToken,
      "expired-callback": () => onToken(""),
      "error-callback": () => onToken(""),
    });
    return () => api.remove(id);
  }, [ready, attempt, locale, onToken]);

  if (!SITE_KEY) return null;
  return (
    <>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        onReady={() => setReady(true)}
      />
      <div ref={box} className="col-span-full min-h-16" />
    </>
  );
}
