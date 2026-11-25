"use client";

import { useSyncExternalStore } from "react";

// Favourites and the compare list. They stay in the visitor's own browser.
export const MAX_COMPARE = 4;
const MAX_FAVOURITES = 50;
type Name = "favourites" | "compare";
const EMPTY: string[] = [];
const cache = new Map<Name, { raw: string | null; list: string[] }>();
const listeners = new Set<() => void>();
const memory = new Map<Name, string>(); // when storage is blocked

function readRaw(name: Name): string | null {
  try {
    return localStorage.getItem(`gt_${name}`);
  } catch {
    return memory.get(name) ?? null;
  }
}

function read(name: Name): string[] {
  const raw = readRaw(name);
  const known = cache.get(name);
  if (known && known.raw === raw) return known.list;
  let list = EMPTY;
  try {
    const value: unknown = JSON.parse(raw ?? "[]");
    if (Array.isArray(value)) {
      list = value.filter((c): c is string => typeof c === "string" && /^[A-Z0-9-]{2,20}$/.test(c));
    }
  } catch {
    // Damaged: start again.
  }
  cache.set(name, { raw, list });
  return list;
}

export function save(name: Name, list: string[]): void {
  const raw = JSON.stringify(list.slice(0, name === "compare" ? MAX_COMPARE : MAX_FAVOURITES));
  try {
    localStorage.setItem(`gt_${name}`, raw);
  } catch {
    memory.set(name, raw);
  }
  listeners.forEach((listener) => listener());
}

/** Add or remove. False when the compare list is already full. */
export function toggle(name: Name, code: string): boolean {
  const list = read(name);
  if (list.includes(code))
    save(
      name,
      list.filter((c) => c !== code),
    );
  else if (name === "compare" && list.length >= MAX_COMPARE) return false;
  else save(name, [code, ...list]);
  return true;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("storage", listener); // another tab
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

export const useSaved = (name: Name) =>
  useSyncExternalStore(
    subscribe,
    () => read(name),
    () => EMPTY,
  );
