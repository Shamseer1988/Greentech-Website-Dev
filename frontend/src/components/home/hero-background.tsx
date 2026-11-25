"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { cn } from "cn";
import { useReducedMotion } from "@/components/motion/use-reduced-motion";

const SECONDS = 7;

/** See-through background photos. With more than one, they change slowly. */
export function HeroBackground({
  images,
  opacity,
  sizes = "100vw",
  priority = false,
}: {
  images: string[];
  opacity: number;
  sizes?: string;
  priority?: boolean;
}) {
  const reduced = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [loaded, setLoaded] = useState(1); // the other photos load after the page is ready
  const count = images.length;
  const current = count ? index % count : 0;

  useEffect(() => {
    if (reduced || count < 2) return;
    const timer = setInterval(() => setIndex((i) => i + 1), SECONDS * 1000);
    const load = setTimeout(() => setLoaded(Infinity), 2500);
    return () => {
      clearInterval(timer);
      clearTimeout(load);
    };
  }, [reduced, count]);

  if (!count) return null;
  return (
    <div aria-hidden="true" className="absolute inset-0 overflow-hidden">
      <div className="absolute inset-0" style={{ opacity: opacity / 100 }}>
        {images.slice(0, loaded).map((src, i) => (
          <Image
            key={src}
            src={src}
            alt=""
            fill
            sizes={sizes}
            priority={priority && i === 0}
            className={cn(
              "object-cover transition-opacity duration-[1600ms] motion-reduce:transition-none",
              i === current ? "opacity-100" : "opacity-0",
            )}
          />
        ))}
      </div>
      {/* Keeps the words easy to read with any photo. */}
      <div className="absolute inset-0 bg-deep/65 lg:bg-transparent lg:bg-linear-to-r lg:from-deep/95 lg:via-deep/75 lg:to-deep/25 lg:rtl:bg-linear-to-l" />
      <div className="absolute inset-0 bg-linear-to-b from-deep/70 via-transparent via-30% to-deep/60" />
    </div>
  );
}
