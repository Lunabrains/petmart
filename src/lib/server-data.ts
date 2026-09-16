import { connection } from "next/server";

import { getData, type Dataset } from "./data";

/**
 * Pages call this instead of `getData()` so that "today" is the day the page
 * is opened, not the day the app was built.
 */
export async function loadData(): Promise<Dataset> {
  await connection();
  return getData();
}
