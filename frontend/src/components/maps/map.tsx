"use client";

import dynamic from "next/dynamic";

export type MapPin = {
  id: string;
  lat: number;
  lng: number;
  label: string;
  /** Link opened by clicking the pin. */
  href?: string;
  /** Pins with the same area are shown as one area pin when zoomed out. */
  area?: { slug: string; name: string; lat: number; lng: number };
  /** Highlighted (mint) pin. */
  accent?: boolean;
};

/** Leaflet only works in the browser, so it is loaded there. */
export const MapView = dynamic(() => import("./leaflet-map"), {
  ssr: false,
  loading: () => <div className="size-full animate-pulse bg-[#e7ece6]" />,
});
