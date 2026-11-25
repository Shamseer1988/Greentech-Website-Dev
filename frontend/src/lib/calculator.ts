import type { PropertyCard } from "./types";

export type Need = { workers: number; perRoom: number; location: string; budget: number | null };
export type Option = { properties: PropertyCard[]; places: number; rent: number | null };

/** Workers that fit with the chosen number per room, never more than the listing allows. */
export function placesIn(p: PropertyCard, perRoom: number): number {
  const byRoom = p.rooms === null ? Infinity : p.rooms * perRoom;
  const allowed = p.capacity_persons ?? Infinity;
  const places = Math.min(byRoom, allowed);
  return Number.isFinite(places) ? places : 0;
}

const rentOf = (list: PropertyCard[]) =>
  list.some((p) => p.rent_qar === null)
    ? null
    : list.reduce((sum, p) => sum + (p.rent_qar ?? 0), 0);

/** Usual rent per worker and month: cheapest, middle and highest of the matching listings. */
export function rentPerWorker(list: PropertyCard[], perRoom: number) {
  const prices = list
    .filter((p) => p.rent_qar !== null && placesIn(p, perRoom) > 0)
    .map((p) => (p.rent_qar as number) / placesIn(p, perRoom))
    .sort((a, b) => a - b);
  if (!prices.length) return null;
  const half = Math.floor(prices.length / 2);
  const middle = prices.length % 2 ? prices[half] : (prices[half - 1] + prices[half]) / 2;
  return { low: prices[0], middle, high: prices[prices.length - 1] };
}

/** Single properties, and combinations of two or three, that are big enough. */
export function findOptions(all: PropertyCard[], need: Need): Option[] {
  const list = all
    .filter((p) => p.status === "available" && placesIn(p, need.perRoom) > 0)
    .filter((p) => !need.location || p.location.slug === need.location)
    .slice(0, 60);
  const options: Option[] = [];
  function add(chosen: PropertyCard[]) {
    const places = chosen.reduce((sum, p) => sum + placesIn(p, need.perRoom), 0);
    if (places < need.workers) return;
    const rent = rentOf(chosen);
    if (need.budget !== null && (rent === null || rent > need.budget)) return;
    options.push({ properties: chosen, places, rent });
  }
  list.forEach((p) => add([p]));
  // A combination is only useful when no part of it would be enough alone.
  const small = list.filter((p) => placesIn(p, need.perRoom) < need.workers);
  small.forEach((a, i) =>
    small.slice(i + 1).forEach((b, j) => {
      add([a, b]);
      if (placesIn(a, need.perRoom) + placesIn(b, need.perRoom) < need.workers) {
        small.slice(i + j + 2).forEach((c) => add([a, b, c]));
      }
    }),
  );
  return options.sort(
    (a, b) =>
      (a.rent ?? Infinity) - (b.rent ?? Infinity) ||
      a.properties.length - b.properties.length ||
      a.places - b.places,
  );
}
