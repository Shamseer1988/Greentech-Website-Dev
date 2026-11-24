import { BUDGETS, budgetRange, SORTS } from "./format";

export type ListingQuery = {
  q: string;
  type: string;
  location: string;
  budget: string;
  sort: string;
  page: number;
};

type SearchParams = Record<string, string | string[] | undefined>;

/** Read the address bar. Anything unexpected is ignored instead of causing an error. */
export function parseListingQuery(params: SearchParams): ListingQuery {
  const one = (name: string) => {
    const value = params[name];
    return (Array.isArray(value) ? value[0] : value) ?? "";
  };
  const allowed = (value: string, list: readonly string[]) => (list.includes(value) ? value : "");
  const page = Number(one("page"));
  return {
    q: one("q").trim().slice(0, 100),
    type: one("type").slice(0, 60),
    location: one("location").slice(0, 60),
    budget: allowed(one("budget"), BUDGETS),
    sort: allowed(one("sort"), SORTS.slice(1)),
    page: Number.isInteger(page) && page >= 1 && page <= 1000 ? page : 1,
  };
}

export function listingHref(query: ListingQuery): string {
  const params = new URLSearchParams();
  for (const name of ["q", "type", "location", "budget", "sort"] as const) {
    if (query[name]) params.set(name, query[name]);
  }
  if (query.page > 1) params.set("page", String(query.page));
  return params.size ? `/properties?${params}` : "/properties";
}

/** The same query in the backend's words. */
export function apiParams(query: ListingQuery): URLSearchParams {
  const params = new URLSearchParams();
  for (const name of ["q", "type", "location", "sort"] as const) {
    if (query[name]) params.set(name, query[name]);
  }
  const { min, max } = budgetRange(query.budget);
  if (min) params.set("min_rent", min);
  if (max) params.set("max_rent", max);
  return params;
}
