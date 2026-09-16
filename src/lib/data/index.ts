import { format } from "date-fns";

import { generateDemo } from "./demo";
import type { Dataset } from "./types";

export type * from "./types";

/**
 * Where the dashboard gets its numbers.
 *
 * Today: generated demo data. Phase 7: replace `generateDemo` with a loader
 * that reads Wizzard's export / API / read-only database into the same
 * `Dataset` shape. Nothing else in the app needs to change, and nothing is
 * ever written back to Wizzard.
 */

export function todayISO(): string {
  return format(new Date(), "yyyy-MM-dd");
}

let cache: { today: string; data: Dataset } | null = null;

/** The dataset "as of" today. Generated once per day per server process. */
export function getData(): Dataset {
  const today = todayISO();
  if (!cache || cache.today !== today) cache = { today, data: generateDemo(today) };
  return cache.data;
}
