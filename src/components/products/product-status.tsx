import { Pill, StatusPill } from "@/components/common/status-pill";
import type { ProductStats } from "@/lib/metrics";

/**
 * The stock status pill, plus a red "Profit Dropped" pill when the cost went up
 * and the selling price did not. A product losing profit is never labelled OK.
 */
export function ProductStatusPills({ stats, className }: { stats: ProductStats; className?: string }) {
  const profitDropped = stats.costChange?.profitDropped ?? false;
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      {(stats.status !== "ok" || !profitDropped) && <StatusPill status={stats.status} className={className} />}
      {profitDropped && (
        <Pill tone="critical" className={className}>
          Profit Dropped
        </Pill>
      )}
    </span>
  );
}
