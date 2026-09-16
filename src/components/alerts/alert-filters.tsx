import Link from "next/link";

import { ALERT_CATEGORY_LABEL, type AlertCategory } from "@/lib/alerts";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

export type CategoryFilter = AlertCategory | "all";
export type StatusFilter = "open" | "done";

export const CATEGORY_FILTERS: CategoryFilter[] = ["all", "stock", "sales", "profit"];

export function categoryLabel(category: CategoryFilter): string {
  return category === "all" ? "All" : ALERT_CATEGORY_LABEL[category];
}

/** Builds /alerts?category=...&status=... leaving out the defaults. */
export function alertsHref(category: CategoryFilter, status: StatusFilter): string {
  const params = new URLSearchParams();
  if (category !== "all") params.set("category", category);
  if (status === "done") params.set("status", status);
  const query = params.toString();
  return query ? `/alerts?${query}` : "/alerts";
}

interface SegmentProps {
  href: string;
  active: boolean;
  children: React.ReactNode;
  count?: number;
}

function Segment({ href, active, children, count }: SegmentProps) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "inline-flex h-9 items-center justify-center gap-1.5 rounded-lg px-3 text-sm font-medium whitespace-nowrap transition-colors",
        active ? "bg-card text-foreground shadow-sm ring-1 ring-foreground/10" : "text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
      {count !== undefined && (
        <span className={cn("tabular rounded-full px-1.5 text-xs", active ? "bg-muted text-foreground" : "bg-muted/70 text-muted-foreground")}>
          {formatNumber(count)}
        </span>
      )}
    </Link>
  );
}

/**
 * A pill-shaped group of links. On phones it is a two-column grid that fills the
 * width, so every choice stays visible without a hidden sideways scroll; from
 * small screens up it is a single row.
 */
const SEGMENT_GROUP = "grid grid-cols-2 gap-1 rounded-xl bg-muted p-1 sm:inline-flex";

interface AlertFiltersProps {
  category: CategoryFilter;
  status: StatusFilter;
  /** Open alerts (new + seen) per category, including "all". */
  openCounts: Record<CategoryFilter, number>;
  doneCount: number;
}

/** Two rows of links: which kind of alert, and open or done. */
export function AlertFilters({ category, status, openCounts, doneCount }: AlertFiltersProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <nav aria-label="Alert type" className={SEGMENT_GROUP}>
        {CATEGORY_FILTERS.map((c) => (
          <Segment key={c} href={alertsHref(c, status)} active={c === category} count={openCounts[c]}>
            {categoryLabel(c)}
          </Segment>
        ))}
      </nav>
      <nav aria-label="Alert status" className={SEGMENT_GROUP}>
        <Segment href={alertsHref(category, "open")} active={status === "open"}>
          Open
        </Segment>
        <Segment href={alertsHref(category, "done")} active={status === "done"} count={doneCount}>
          Done
        </Segment>
      </nav>
    </div>
  );
}
