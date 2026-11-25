import "server-only";
import { connection } from "next/server";
import { cache } from "react";
import { buildSite } from "./site";
import type {
  ChatContent,
  CompanyContent,
  HomeOut,
  LocationOut,
  PropertyCard,
  PropertyDetail,
  PropertyPage,
  PropertyTypeOut,
} from "./types";

export const API_URL = process.env.API_URL || "http://127.0.0.1:8000";

/** The admin panel clears this, so changes show on the site at once. */
export const PUBLIC_TAG = "public";

class NotFound extends Error {}

async function get<T>(path: string): Promise<T> {
  // Load at request time, so building the site never needs a running backend.
  await connection();
  const response = await fetch(`${API_URL}/api${path}`, {
    next: { revalidate: process.env.NODE_ENV === "production" ? 60 : 0, tags: [PUBLIC_TAG] },
    signal: AbortSignal.timeout(8000),
  });
  if (response.status === 404) throw new NotFound(path);
  if (!response.ok) throw new Error(`API ${response.status} for ${path}`);
  return response.json() as Promise<T>;
}

/** For parts of a page that may be empty when the backend is down. */
async function optional<T>(promise: Promise<T>, fallback: T): Promise<T> {
  try {
    return await promise;
  } catch (error) {
    // Next.js uses thrown errors with a digest to control rendering.
    if (error instanceof Error && "digest" in error) throw error;
    console.error("API unavailable:", error);
    return fallback;
  }
}

export const getTypes = cache(() => optional(get<PropertyTypeOut[]>("/property-types"), []));
export const getLocations = cache(() => optional(get<LocationOut[]>("/locations"), []));
export const getHome = cache(() => optional(get<HomeOut>("/home"), { content: null, images: [] }));
export const getChat = cache(() =>
  optional(get<ChatContent>("/chat"), {
    enabled: false,
    welcome_en: "",
    welcome_ar: "",
    answers: [],
  }),
);
export const getFeatured = () => optional(get<PropertyCard[]>("/properties/featured"), []);

/** Company details: contact, office and social media. */
export const getSite = cache(async () =>
  buildSite(await optional(get<CompanyContent | null>("/company"), null)),
);

export const searchProperties = (params: URLSearchParams) =>
  get<PropertyPage>(`/properties?${params}`);

/** Every match, for the map. */
export async function allForMap(params: URLSearchParams): Promise<PropertyCard[]> {
  const items: PropertyCard[] = [];
  for (let page = 1; page <= 10; page++) {
    const query = new URLSearchParams(params);
    query.set("page", String(page));
    query.set("page_size", "48");
    const result = await searchProperties(query);
    items.push(...result.items);
    if (page >= result.pages) break;
  }
  return items;
}

export const getAllProperties = () => optional(allForMap(new URLSearchParams()), []);

export const getProperty = cache(async (code: string): Promise<PropertyDetail | null> => {
  try {
    return await get<PropertyDetail>(`/properties/${encodeURIComponent(code)}`);
  } catch (error) {
    if (error instanceof NotFound) return null;
    throw error;
  }
});
