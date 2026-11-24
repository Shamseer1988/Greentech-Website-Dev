"use client";

import { MotionConfig } from "framer-motion";
import { ReactLenis } from "lenis/react";
import { useEffect, useState, type ReactNode } from "react";

/** Smooth scrolling (Lenis) and reduced-motion support for the whole site. */
export function MotionProvider({ children }: { children: ReactNode }) {
  const [smooth, setSmooth] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setSmooth(!query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  return (
    <MotionConfig reducedMotion="user">
      {smooth && (
        <ReactLenis
          root
          options={{
            anchors: true,
            prevent: (node) => Boolean(node.closest(".yarl__root, [data-lenis-prevent]")),
          }}
        />
      )}
      {children}
    </MotionConfig>
  );
}
