"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { Site } from "@/lib/site";

const SiteContext = createContext<Site | null>(null);

/** Gives the company details to the parts of the page that run in the browser. */
export function SiteProvider({ site, children }: { site: Site; children: ReactNode }) {
  return <SiteContext.Provider value={site}>{children}</SiteContext.Provider>;
}

export function useSite(): Site {
  const site = useContext(SiteContext);
  if (!site) throw new Error("SiteProvider is missing");
  return site;
}
