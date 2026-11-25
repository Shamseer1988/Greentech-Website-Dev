"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { useReducedMotion } from "@/components/motion/use-reduced-motion";

export function RotatingWord({ words }: { words: string[] }) {
  const reduced = useReducedMotion();
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (reduced || words.length < 2) return;
    const timer = setInterval(() => setIndex((i) => (i + 1) % words.length), 2600);
    return () => clearInterval(timer);
  }, [reduced, words.length]);

  return (
    <span className="inline-block">
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={index}
          className="inline-block text-mint"
          initial={{ opacity: 0, y: "55%", filter: "blur(6px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          exit={{ opacity: 0, y: "-40%", filter: "blur(6px)" }}
          transition={{ duration: 0.35, ease: [0.2, 0.7, 0.2, 1] }}
        >
          {words[index % words.length]}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}
