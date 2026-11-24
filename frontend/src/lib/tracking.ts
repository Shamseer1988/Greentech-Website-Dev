"use client";

// Only a clean id may reach the script text.
const clean = (value: string | undefined, shape: RegExp) =>
  value && shape.test(value) ? value : null;

export const GA_ID = clean(process.env.NEXT_PUBLIC_GA_ID, /^G-[A-Z0-9]+$/);
export const PIXEL_ID = clean(process.env.NEXT_PUBLIC_META_PIXEL_ID, /^\d+$/);
export const hasTracking = Boolean(GA_ID || PIXEL_ID);

type Tracker = (...args: unknown[]) => void;
declare global {
  interface Window {
    gtag?: Tracker;
    fbq?: Tracker;
  }
}

/** Counts an action. Personal details are never sent. Does nothing without consent. */
export function track(event: "enquiry" | "whatsapp" | "call", code?: string): void {
  const item = code ? { property_code: code } : {};
  const ga = { enquiry: "generate_lead", whatsapp: "whatsapp_click", call: "call_click" }[event];
  window.gtag?.("event", ga, item);
  window.fbq?.("track", event === "enquiry" ? "Lead" : "Contact", item);
}
