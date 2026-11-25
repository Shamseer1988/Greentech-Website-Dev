"use client";

import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useLocale } from "next-intl";
import { useEffect, useRef } from "react";
import { cn } from "cn";

const STYLES = ["bg-green-700 text-white", "bg-rose text-white", "bg-mint text-deep"];

/** GSAP draws the line and brings in each step while scrolling. */
export function HowItWorks({
  eyebrow,
  title,
  steps,
}: {
  eyebrow: string;
  title: string;
  steps: { title: string; text: string }[];
}) {
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
        {eyebrow && <span className="eyebrow text-rose">{eyebrow}</span>}
        <h2 className="text-4xl font-bold tracking-tight text-slate lg:text-[44px]">
          {title}
        </h2>
      </div>
      <div className="relative">
        {/* GSAP scales the outer box; the mirroring for Arabic is inside, so they do not clash. */}
        <div
          aria-hidden="true"
          className="how-line absolute inset-x-[16%] top-8.5 hidden h-5 md:block"
        >
          <svg
            viewBox="0 0 1000 20"
            preserveAspectRatio="none"
            className="size-full rtl:-scale-x-100"
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
        </div>
        <ol className="relative grid gap-8 md:grid-cols-3">
          {steps.map((step, i) => (
            <li key={i} className="how-step flex flex-col items-center gap-3.5 p-2 text-center">
              <span
                className={cn(
                  "flex size-18 items-center justify-center rounded-[22px] font-heading text-[28px] font-bold",
                  STYLES[i],
                )}
              >
                {i + 1}
              </span>
              <h3 className="text-[22px] font-semibold text-slate">{step.title}</h3>
              <p className="max-w-75 leading-relaxed text-muted-foreground">
                {step.text}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
