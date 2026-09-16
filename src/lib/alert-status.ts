import type { AlertRule, AlertStatus } from "./alerts";

/**
 * Alert statuses (New / Seen / Done) are the only thing the dashboard
 * remembers, and they live in one small cookie in the owner's browser.
 * Only ids that are not "new" are stored, in a compact form, so even
 * "Mark All Seen" over a hundred alerts stays well under the cookie limit.
 */

export const ALERT_STATUS_COOKIE = "petmart-alerts";

export interface AlertStatusMap {
  seen: string[];
  done: string[];
}

const EMPTY: AlertStatusMap = { seen: [], done: [] };

/** "running-low:P0012" is stored as "rlP0012". Codes are two letters so they can be decoded again. */
const RULE_CODE: Record<AlertRule, string> = {
  "running-low": "rl",
  "low-stock": "ls",
  slow: "sl",
  "no-sales": "ns",
  "selling-less": "se",
  "cost-increase": "ci",
  "profit-drop": "pd",
};
const CODE_RULE = Object.fromEntries(Object.entries(RULE_CODE).map(([rule, code]) => [code, rule])) as Record<string, AlertRule>;

/** Only characters encodeURIComponent leaves alone, so the cookie is never inflated by escaping. */
const SAFE_ID = /^[A-Za-z0-9\-~*!']+$/;
const LIST_SEPARATOR = ".";
const SECTION_SEPARATOR = "_";

function encodeId(id: string): string | null {
  const colon = id.indexOf(":");
  if (colon > 0) {
    const code = RULE_CODE[id.slice(0, colon) as AlertRule];
    const productId = id.slice(colon + 1);
    if (code && SAFE_ID.test(productId)) return code + productId;
  }
  return SAFE_ID.test(id) ? `~${id}` : null;
}

function decodeId(token: string): string | null {
  if (!token) return null;
  if (token.startsWith("~")) return SAFE_ID.test(token) ? token.slice(1) : null;
  const rule = CODE_RULE[token.slice(0, 2)];
  const productId = token.slice(2);
  if (!rule || !SAFE_ID.test(productId)) return null;
  return `${rule}:${productId}`;
}

function decodeList(section: string | undefined): string[] {
  if (!section) return [];
  return section
    .split(LIST_SEPARATOR)
    .map(decodeId)
    .filter((id): id is string => id !== null);
}

export function parseAlertStatuses(raw: string | undefined | null): AlertStatusMap {
  if (!raw) return { ...EMPTY };
  // Cookies written before the compact format were JSON.
  if (raw.startsWith("{")) {
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
  const [seen, done] = raw.split(SECTION_SEPARATOR);
  return { seen: decodeList(seen), done: decodeList(done) };
}

export function serializeAlertStatuses(map: AlertStatusMap): string {
  const encode = (ids: string[]) =>
    ids
      .map(encodeId)
      .filter((v): v is string => v !== null)
      .join(LIST_SEPARATOR);
  return `${encode(map.seen)}${SECTION_SEPARATOR}${encode(map.done)}`;
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
