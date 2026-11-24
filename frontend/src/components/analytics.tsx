"use client";

import { useTranslations } from "next-intl";
import { useParams, usePathname } from "next/navigation";
import Script from "next/script";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { GA_ID, hasTracking, PIXEL_ID, track } from "@/lib/tracking";

const KEY = "gt_cookies";
type Choice = "yes" | "no";

function readChoice(): Choice | null {
  try {
    const value = localStorage.getItem(KEY);
    return value === "yes" || value === "no" ? value : null;
  } catch {
    return "no"; // storage is blocked: do not track
  }
}

/** Google Analytics and Meta Pixel. Nothing loads until the visitor accepts. */
export function Analytics() {
  const t = useTranslations("cookies");
  const [choice, setChoice] = useState<Choice | null | "unknown">("unknown");
  const { code } = useParams<{ code?: string }>();
  const pathname = usePathname();
  const pixelPath = useRef<string | null>(null);

  useEffect(() => setChoice(readChoice()), []);

  // Google counts page changes by itself; the Pixel counts only the first page.
  useEffect(() => {
    if (choice !== "yes") return;
    if (pixelPath.current && pixelPath.current !== pathname) window.fbq?.("track", "PageView");
    pixelPath.current = pathname;
  }, [choice, pathname]);

  useEffect(() => {
    if (choice !== "yes") return;
    const onClick = (event: MouseEvent) => {
      const href = (event.target as Element | null)?.closest?.("a")?.href ?? "";
      // wa.me/?text= is the "share" button, not a message to us.
      if (/^https:\/\/wa\.me\/\d/.test(href)) track("whatsapp", code?.toUpperCase());
      else if (href.startsWith("tel:")) track("call", code?.toUpperCase());
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [choice, code]);

  if (!hasTracking || choice === "unknown" || choice === "no") return null;

  if (choice === null) {
    const choose = (value: Choice) => {
      try {
        localStorage.setItem(KEY, value);
      } catch {
        // Not saved: the question comes again next time.
      }
      setChoice(value);
    };
    return (
      <section
        aria-label={t("title")}
        className="no-print fixed inset-x-4 bottom-24 z-30 flex flex-col gap-3 rounded-2xl border border-line bg-white p-5 text-sm shadow-[0_18px_40px_rgb(4_29_21/.2)] md:end-auto md:bottom-7 md:start-7 md:max-w-100"
      >
        <p>{t("text")}</p>
        <div className="flex gap-2.5">
          <Button size="sm" onClick={() => choose("yes")}>
            {t("accept")}
          </Button>
          <Button size="sm" variant="outline" onClick={() => choose("no")}>
            {t("decline")}
          </Button>
        </div>
      </section>
    );
  }

  return (
    <>
      {GA_ID && (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} />
          <Script id="ga">
            {`window.dataLayer=window.dataLayer||[];window.gtag=function(){dataLayer.push(arguments)};gtag("js",new Date());gtag("config","${GA_ID}");`}
          </Script>
        </>
      )}
      {PIXEL_ID && (
        <Script id="meta-pixel">
          {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version="2.0";n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,"script","https://connect.facebook.net/en_US/fbevents.js");fbq("set","autoConfig",false,"${PIXEL_ID}");fbq("init","${PIXEL_ID}");fbq("track","PageView");`}
        </Script>
      )}
    </>
  );
}
