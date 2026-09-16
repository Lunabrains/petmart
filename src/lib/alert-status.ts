import type { AlertStatus } from "./alerts";

/**
 * Alert statuses (New / Seen / Done) are the only thing the dashboard
 * remembers, and they live in one small cookie in the owner's browser.
 * Only ids that are not "new" are stored, so the cookie stays tiny.
 */

export const ALERT_STATUS_COOKIE = "petmart-alerts";

export interface AlertStatusMap {
  seen: string[];
  done: string[];
}

const EMPTY: AlertStatusMap = { seen: [], done: [] };

export function parseAlertStatuses(raw: string | undefined | null): AlertStatusMap {
  if (!raw) return { ...EMPTY };
  try {
    const parsed = JSON.parse(raw) as Partial<AlertStatusMap>;
    return {
      seen: Array.isArray(parsed.seen) ? parsed.seen.filter((v) => typeof v === "string") : [],
      done: Array.isArray(parsed.done) ? parsed.done.filter((v) => typeof v === "string") : [],
    };
  } catch {
    return { ...EMPTY };
  }
}

export function serializeAlertStatuses(map: AlertStatusMap): string {
  return JSON.stringify({ seen: map.seen, done: map.done });
}

export function statusOf(map: AlertStatusMap, alertId: string): AlertStatus {
  if (map.done.includes(alertId)) return "done";
  if (map.seen.includes(alertId)) return "seen";
  return "new";
}

export function withStatus(map: AlertStatusMap, alertId: string, status: AlertStatus): AlertStatusMap {
  const seen = map.seen.filter((id) => id !== alertId);
  const done = map.done.filter((id) => id !== alertId);
  if (status === "seen") seen.push(alertId);
  if (status === "done") done.push(alertId);
  return { seen, done };
}

/** Forget ids that no longer match any open alert, so the cookie never grows without bound. */
export function pruneStatuses(map: AlertStatusMap, openIds: Set<string>): AlertStatusMap {
  return { seen: map.seen.filter((id) => openIds.has(id)), done: map.done.filter((id) => openIds.has(id)) };
}
