"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

import { buildAlerts, type AlertStatus } from "@/lib/alerts";
import {
  ALERT_STATUS_COOKIE,
  parseAlertStatuses,
  pruneStatuses,
  serializeAlertStatuses,
  statusOf,
  withStatus,
  type AlertStatusMap,
} from "@/lib/alert-status";
import { loadData } from "@/lib/server-data";

const STATUSES: readonly AlertStatus[] = ["new", "seen", "done"];

function isAlertStatus(value: unknown): value is AlertStatus {
  return typeof value === "string" && (STATUSES as readonly string[]).includes(value);
}

/** Read the cookie, apply a change, forget ids that no longer match an alert, write it back. */
async function saveStatuses(change: (map: AlertStatusMap) => AlertStatusMap) {
  const store = await cookies();
  const current = parseAlertStatuses(store.get(ALERT_STATUS_COOKIE)?.value);
  const openIds = new Set(buildAlerts(await loadData()).map((a) => a.id));
  const next = pruneStatuses(change(current), openIds);
  store.set(ALERT_STATUS_COOKIE, serializeAlertStatuses(next), { path: "/", maxAge: 60 * 60 * 24 * 30, sameSite: "lax" });
  revalidatePath("/alerts");
}

/** Form fields: "id" (alert id) and "status" ("new" | "seen" | "done"). */
export async function setAlertStatus(formData: FormData) {
  const id = formData.get("id");
  const status = formData.get("status");
  if (typeof id !== "string" || id.length === 0 || !isAlertStatus(status)) return;
  await saveStatuses((map) => withStatus(map, id, status));
}

/** Form field: "ids", comma-separated alert ids. Alerts already marked done are left alone. */
export async function markAllSeen(formData: FormData) {
  const raw = formData.get("ids");
  if (typeof raw !== "string") return;
  const ids = raw
    .split(",")
    .map((id) => id.trim())
    .filter((id) => id.length > 0);
  if (ids.length === 0) return;
  await saveStatuses((map) => ids.reduce((acc, id) => (statusOf(acc, id) === "done" ? acc : withStatus(acc, id, "seen")), map));
}
