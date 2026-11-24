/** SVG paths (24 x 24) for the property types. */
const ICONS: Record<string, string> = {
  warehouse: "M3 21V9l9-5 9 5v12M7 21v-7h10v7M7 17h10",
  cafeteria: "M4 8h13v6a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5zM17 10h2a2 2 0 0 1 0 4h-2M8 3v2M12 3v2",
  "supermarket-shop": "M3 4h2l2.5 11h11L21 7H6.5M9 20h.01M18 20h.01",
  residential: "M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z",
  "labour-accommodation": "M2 20v-8a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v8M2 16h20M6 10V6h5v4",
};

export const typeIcon = (slug: string): string => ICONS[slug] ?? ICONS.warehouse;
