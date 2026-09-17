import { AttentionDot } from "@/components/common/attention-card";
import { EmptyState } from "@/components/common/empty-state";
import type { Alert } from "@/lib/alerts";
import { formatPercent, formatPrice, formatSignedPercent } from "@/lib/format";
import type { CostChange } from "@/lib/metrics";

interface ProductAlertsProps {
  alerts: Alert[];
  costChange: CostChange | null;
}

/** Open problems for one product. A profit problem gets its own card on top. */
export function ProductAlerts({ alerts, costChange }: ProductAlertsProps) {
  const profitProblem = costChange?.profitDropped ? costChange : null;
  const priceAdjusted = !profitProblem && costChange && costChange.changePct > 0 && costChange.priceChanged ? costChange : null;
  // The card above already states the cost change once; keep the list to stock and sales problems.
  const listed = profitProblem || priceAdjusted ? alerts.filter((a) => a.rule !== "profit-drop" && a.rule !== "cost-increase") : alerts;

  if (listed.length === 0 && !profitProblem && !priceAdjusted) {
    return <EmptyState title="No alerts for this product" description="Stock, sales and profit all look fine." />;
  }

  return (
    <div className="flex flex-col gap-5">
      {profitProblem && <ProfitProblem change={profitProblem} />}
      {priceAdjusted && <PriceAdjusted change={priceAdjusted} />}
      {listed.length > 0 && (
        <ul className="divide-y">
          {listed.map((a) => (
            <li key={a.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
              <AttentionDot level={a.level} className="mt-2 shrink-0" />
              <div className="min-w-0">
                <p className="font-semibold leading-snug">{a.title}</p>
                <p className="mt-0.5 text-sm text-muted-foreground">{a.message}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Cost went up, price stayed the same: the owner is losing profit on every unit. */
function ProfitProblem({ change: c }: { change: CostChange }) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-card p-5 pl-6 ring-1 ring-critical/30 before:absolute before:inset-y-0 before:left-0 before:w-1.5 before:bg-critical">
      <h3 className="text-lg font-semibold text-critical">Your Cost Increased</h3>
      <p className="mt-2 text-base leading-relaxed">
        {`Supplier cost increased from ${formatPrice(c.previousCost)} to ${formatPrice(c.currentCost)} (${formatSignedPercent(c.changePct)}), but your selling price stayed the same at ${formatPrice(c.currentPrice)}.`}
      </p>
      <p className="mt-1 text-base leading-relaxed">
        {`Your profit on this product dropped from ${formatPrice(c.profitPerUnitBefore)} to ${formatPrice(c.profitPerUnitNow)} per unit.`}
      </p>
      <p className="mt-4 text-sm text-muted-foreground">Suggested Action</p>
      <p className="text-base font-bold">Review Selling Price</p>
    </div>
  );
}

/** Cost went up, but the price was already adjusted: nothing to do. */
function PriceAdjusted({ change: c }: { change: CostChange }) {
  return (
    <div className="rounded-xl bg-muted/60 px-5 py-4 text-base leading-relaxed">
      {`Cost increased by ${formatPercent(c.changePct)} and the selling price was adjusted from ${formatPrice(c.previousPrice)} to ${formatPrice(c.currentPrice)}.`}
    </div>
  );
}
