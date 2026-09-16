import Link from "next/link";

import { markAllSeen, setAlertStatus } from "@/app/alerts/actions";
import { AttentionDot } from "@/components/common/attention-card";
import { EmptyState } from "@/components/common/empty-state";
import { Pill, type PillTone } from "@/components/common/status-pill";
import type { Alert, AlertStatus } from "@/lib/alerts";

import { PendingButton } from "./pending-button";

export interface AlertItem {
  alert: Alert;
  status: AlertStatus;
}

const STATUS_LABEL: Record<AlertStatus, string> = { new: "New", seen: "Seen", done: "Done" };
const STATUS_TONE: Record<AlertStatus, PillTone> = { new: "info", seen: "neutral", done: "success" };

/** Read-aloud-only suffix so each button says which alert it belongs to. */
function WhichAlert({ alert }: { alert: Alert }) {
  return (
    <span className="sr-only">
      : {alert.title}, {alert.productName}
    </span>
  );
}

function AlertRow({ alert, status }: AlertItem) {
  return (
    <li className="flex gap-3 px-5 py-4 lg:px-6">
      <AttentionDot level={alert.level} className="mt-[7px] shrink-0" />
      <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="font-semibold">{alert.title}</span>
            <Link href={alert.href} className="min-w-0 truncate font-medium text-brand hover:underline">
              {alert.productName}
            </Link>
            <Pill tone={STATUS_TONE[status]}>{STATUS_LABEL[status]}</Pill>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{alert.message}</p>
        </div>
        <form action={setAlertStatus} className="flex shrink-0 flex-wrap gap-2">
          <input type="hidden" name="id" value={alert.id} />
          {status === "new" && (
            <PendingButton variant="outline" size="sm" name="status" value="seen">
              Mark Seen
              <WhichAlert alert={alert} />
            </PendingButton>
          )}
          {status !== "done" ? (
            <PendingButton variant="secondary" size="sm" name="status" value="done">
              Mark Done
              <WhichAlert alert={alert} />
            </PendingButton>
          ) : (
            <PendingButton variant="outline" size="sm" name="status" value="new">
              Reopen
              <WhichAlert alert={alert} />
            </PendingButton>
          )}
        </form>
      </div>
    </li>
  );
}

/** "Mark All Seen" for the new alerts currently on screen. The page only renders it when there are some. */
export function MarkAllSeenButton({ ids }: { ids: string[] }) {
  return (
    <form action={markAllSeen}>
      <input type="hidden" name="ids" value={ids.join(",")} />
      <PendingButton variant="outline" size="sm">
        Mark All Seen
      </PendingButton>
    </form>
  );
}

interface AlertListProps {
  items: AlertItem[];
  /** Which view is empty, so the empty message fits. */
  showing: "open" | "done";
}

/** The alerts, one plain row each, red first. */
export function AlertList({ items, showing }: AlertListProps) {
  if (items.length === 0) {
    return (
      <div className="px-5 pb-3 lg:px-6 lg:pb-4">
        {showing === "done" ? (
          <EmptyState title="Nothing marked done yet" description="Alerts you mark done will show up here." />
        ) : (
          <EmptyState title="No open alerts here" description="Nothing in this group needs your attention." />
        )}
      </div>
    );
  }

  return (
    <ul className="divide-y divide-border border-t border-border">
      {items.map((item) => (
        <AlertRow key={item.alert.id} alert={item.alert} status={item.status} />
      ))}
    </ul>
  );
}
