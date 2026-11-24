"use client";

import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useEffect, useRef, type ReactNode } from "react";

const LEFT_LIT: Record<string, number> = { "0-0": 0.2, "1-1": 1.4, "2-0": 2.6, "3-1": 0.8, "4-0": 3.4, "5-1": 2 };
const RIGHT_LIT: Record<string, number> = { "0-1": 3, "1-0": 0.5, "2-1": 1.8, "3-0": 4, "4-1": 1.1, "5-0": 2.3 };

function Windows({ lit, fill }: { lit: Record<string, number>; fill: string }) {
  return Array.from({ length: 12 }, (_, i) => {
    const row = Math.floor(i / 2);
    const column = i % 2;
    const delay = lit[`${row}-${column}`];
    return (
      <rect
        key={i}
        x={14 + column * 32}
        y={24 + row * 34}
        width="20"
        height="18"
        fill={fill}
        className={delay === undefined ? undefined : "animate-lit"}
        style={delay === undefined ? undefined : { animationDelay: `${delay}s` }}
      />
    );
  });
}

function Pin({ x, y, r, delay }: { x: number; y: number; r: number; delay: number }) {
  return (
    <g className="animate-float" style={{ animationDelay: `${delay}s` }}>
      <circle cx={x} cy={y} r={r} fill="#3DDC97" />
      <circle cx={x} cy={y} r={r * 0.375} fill="#062A1F" />
      <path
        d={`M${x - r * 0.75} ${y + r * 0.63} L${x} ${y + r * 1.75} L${x + r * 0.75} ${y + r * 0.63} Z`}
        fill="#3DDC97"
      />
    </g>
  );
}

/** Isometric buildings; GSAP moves them gently while the hero scrolls away. */
export function HeroScene({ label, children }: { label: string; children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const media = gsap.matchMedia();
    media.add("(prefers-reduced-motion: no-preference) and (min-width: 1024px)", () => {
      gsap.to(root.current, {
        y: 90,
        ease: "none",
        scrollTrigger: { trigger: root.current, start: "top 20%", end: "bottom top", scrub: true },
      });
    });
    return () => media.revert();
  }, []);

  return (
    <div ref={root} className="relative h-100 min-w-0 flex-[1_1_480px] sm:h-140">
      <svg viewBox="0 0 560 500" className="absolute inset-0 size-full" role="img" aria-label={label}>
        <g opacity=".35">
          <ellipse
            cx="280"
            cy="380"
            rx="250"
            ry="110"
            fill="none"
            stroke="#3DDC97"
            strokeDasharray="4 10"
            className="animate-dashflow"
            style={{ animationDuration: "4s" }}
          />
        </g>
        <polygon points="40,380 280,500 540,370 300,250" fill="#0A3D2D" stroke="rgba(61,220,151,.25)" />
        <polygon points="200,120 280,80 360,120 280,160" fill="#3DDC97" />
        <polygon points="200,120 280,160 280,400 200,360" fill="#1F7A52" />
        <polygon points="280,160 360,120 360,360 280,400" fill="#0A4434" />
        <g transform="translate(200,120) skewY(26.565)">
          <Windows lit={LEFT_LIT} fill="#14503E" />
        </g>
        <g transform="translate(280,160) skewY(-26.565)">
          <Windows lit={RIGHT_LIT} fill="#103F31" />
        </g>
        <polygon points="370,330 430,360 510,320 450,290" fill="#E9EFEB" />
        <polygon points="370,330 430,360 430,430 370,400" fill="#B9C9C0" />
        <polygon points="430,360 510,320 510,390 430,430" fill="#93A99D" />
        <polygon points="450,420 490,400 490,355 450,375" fill="#5F7A6D" />
        <path d="M450 384L490 364M450 396L490 376M450 408L490 388" stroke="#4A6457" strokeWidth="2" />
        <polygon points="110,360 150,380 190,360 150,340" fill="#3DDC97" />
        <polygon points="110,360 150,380 150,420 110,400" fill="#E3E9E5" />
        <polygon points="150,380 190,360 190,400 150,420" fill="#C5D1CA" />
        <polygon points="150,380 190,360 190,370 150,390" fill="#A3486F" />
        <Pin x={280} y={52} r={16} delay={0} />
        <Pin x={470} y={262} r={12} delay={1.2} />
        <Pin x={150} y={306} r={11} delay={2.2} />
      </svg>
      {children}
    </div>
  );
}
