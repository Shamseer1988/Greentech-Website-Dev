"use client";

import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef } from "react";
import { cn } from "cn";

const STEPS = [
  { key: "1", style: "bg-green-700 text-white" },
  { key: "2", style: "bg-rose text-white" },
  { key: "3", style: "bg-mint text-deep" },
] as const;

/** GSAP draws the line and brings in each step while scrolling. */
export function HowItWorks() {
  const t = useTranslations("home");
  const locale = useLocale();
  const root = useRef<HTMLElement>(null);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const media = gsap.matchMedia(root);
    media.add("(prefers-reduced-motion: no-preference)", () => {
      const timeline = gsap.timeline({
        scrollTrigger: { trigger: root.current, start: "top 65%" },
      });
      timeline
        .from(".how-line", {
          scaleX: 0,
          transformOrigin: locale === "ar" ? "right center" : "left center",
          duration: 1.2,
          ease: "power2.out",
        })
        .from(".how-step", { opacity: 0, y: 36, duration: 0.7, stagger: 0.25 }, 0.1);
    });
    return () => media.revert();
  }, [locale]);

  return (
    <section ref={root} id="how" className="container-page scroll-mt-6 py-20 lg:py-28">
      <div className="mb-14 flex flex-col items-center gap-2.5 text-center">
        <span className="eyebrow text-rose">{t("howEyebrow")}</span>
        <h2 className="text-4xl font-bold tracking-tight text-slate lg:text-[44px]">
          {t("howTitle")}
        </h2>
      </div>
      <div className="relative">
        <svg
          aria-hidden="true"
          viewBox="0 0 1000 20"
          preserveAspectRatio="none"
          className="how-line absolute inset-x-[16%] top-8.5 hidden h-5 w-[68%] rtl:-scale-x-100 md:block"
        >
          <line
            x1="0"
            y1="10"
            x2="1000"
            y2="10"
            stroke="#1F7A52"
            strokeWidth="2"
            strokeDasharray="8 10"
            className="animate-dashflow"
          />
        </svg>
        <ol className="relative grid gap-8 md:grid-cols-3">
          {STEPS.map(({ key, style }) => (
            <li key={key} className="how-step flex flex-col items-center gap-3.5 p-2 text-center">
              <span
                className={cn(
                  "flex size-18 items-center justify-center rounded-[22px] font-heading text-[28px] font-bold",
                  style,
                )}
              >
                {key}
              </span>
              <h3 className="text-[22px] font-semibold text-slate">{t(`steps.${key}.title`)}</h3>
              <p className="max-w-75 leading-relaxed text-muted-foreground">
                {t(`steps.${key}.text`)}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
