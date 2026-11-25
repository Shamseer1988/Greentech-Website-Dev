/** SVG paths (24 x 24) a category can use. The names are saved in the database. */
const ICONS: Record<string, string> = {
  warehouse: "M3 21V9l9-5 9 5v12M7 21v-7h10v7M7 17h10",
  cup: "M4 8h13v6a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5zM17 10h2a2 2 0 0 1 0 4h-2M8 3v2M12 3v2",
  cart: "M3 4h2l2.5 11h11L21 7H6.5M9 20h.01M18 20h.01",
  home: "M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z",
  bed: "M2 20v-8a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v8M2 16h20M6 10V6h5v4",
  building: "M5 21V4a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v17M3 21h18M9 7h.01M15 7h.01M9 11h.01M15 11h.01M10 21v-5h4v5",
  office: "M4 21V8l7-4v17M11 21h9V10l-9-2M15 13h1M15 17h1M7 10h.01M7 14h.01M7 18h.01M2 21h20",
  shop: "M4 10v10h16V10M3 10l2-6h14l2 6a3 3 0 0 1-6 0 3 3 0 0 1-6 0 3 3 0 0 1-6 0M9 20v-5h6v5",
  factory: "M3 21V9l6 4V9l6 4V5h4l2 16zM7 17h.01M12 17h.01M17 17h.01",
  truck: "M2 6h12v11H2zM14 10h4l4 4v3h-8M6 17a2 2 0 1 0 0 4 2 2 0 0 0 0-4M18 17a2 2 0 1 0 0 4 2 2 0 0 0 0-4",
  land: "M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3zM9 3v15M15 6v15",
  parking: "M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zM9 17V7h4a3 3 0 0 1 0 6H9",
  food: "M6 3v7a2 2 0 0 0 4 0V3M8 12v9M17 21v-7M17 14c-2 0-3-2-3-5s1-6 3-6z",
  tools: "M14 7a4 4 0 0 1 5-4l-2.5 2.5 2 2L21 5a4 4 0 0 1-5.5 5L7 18.500a2 2 0 0 1-2.800-2.800L12.700 8",
  key: "M8 11a4 4 0 1 0 0 8 4 4 0 0 0 0-8M11 12l9-9M16 7l3 3M13 10l2 2",
};

export const ICON_NAMES = Object.keys(ICONS);
export const typeIcon = (name: string): string => ICONS[name] ?? ICONS.warehouse;
