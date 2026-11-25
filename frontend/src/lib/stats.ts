"use client";

// Anonymous counts for the office's reports: "this property was opened". No cookie, no visitor id.
type Kind = "view" | "whatsapp" | "call" | "brochure" | "favourite";

export function count(kind: Kind, code = ""): void {
  const body = new Blob([JSON.stringify({ kind, code })], { type: "application/json" });
  try {
    navigator.sendBeacon("/api/track", body);
  } catch {
    // Counting must never disturb the visitor.
  }
}

/** True only the first time in this browser tab. */
export function once(key: string): boolean {
  try {
    const name = `gt_once_${key}`;
    if (sessionStorage.getItem(name)) return false;
    sessionStorage.setItem(name, "1");
  } catch {
    // No storage: count it.
  }
  return true;
}

const SOURCE = "gt_source";
const KNOWN = [
  "google",
  "bing",
  "facebook",
  "instagram",
  "tiktok",
  "youtube",
  "linkedin",
  "snapchat",
];

/** Where this visit began, e.g. "google". Remembered for the tab only. */
export function rememberSource(): void {
  try {
    if (sessionStorage.getItem(SOURCE) !== null) return;
    const tag = new URLSearchParams(window.location.search).get("utm_source");
    let host = "";
    if (document.referrer) {
      const url = new URL(document.referrer);
      if (url.host !== window.location.host) host = url.hostname.replace(/^(www|m|l|lm)\./, "");
    }
    const raw = (tag || KNOWN.find((name) => host.includes(name)) || host).toLowerCase();
    sessionStorage.setItem(SOURCE, /^[a-z0-9._-]{1,40}$/.test(raw) ? raw : "");
  } catch {
    // Not known.
  }
}

export function source(): string {
  try {
    return sessionStorage.getItem(SOURCE) ?? "";
  } catch {
    return "";
  }
}
