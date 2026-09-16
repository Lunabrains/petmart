import { formatDaysAgo, formatDaysLeft, formatMoney, formatNumber, formatPercent, formatPrice } from "@/lib/format";
import type { ProductStats } from "@/lib/metrics";
import { cn } from "@/lib/utils";

type FactTone = "default" | "critical" | "warning" | "success";

const TONE: Record<FactTone, string> = {
  default: "text-foreground",
  critical: "text-critical",
  warning: "text-warning-foreground",
  success: "text-success",
};

interface FactProps {
  label: string;
  value: React.ReactNode;
  caption?: React.ReactNode;
  tone?: FactTone;
  /** Words rather than a number: a little smaller so they fit on a phone. */
  text?: boolean;
}

/** One fact per card, in the same style as the big numbers on Home. */
function Fact({ label, value, caption, tone = "default", text }: FactProps) {
  return (
    <div className="flex flex-col rounded-2xl bg-card p-5 ring-1 ring-foreground/10">
      <span className="text-sm font-medium text-muted-foreground">{label}</span>
      <span
        className={cn(
          "mt-3 font-semibold tracking-tight break-words",
          text ? "text-xl leading-snug lg:text-2xl" : "tabular text-2xl lg:text-3xl",
          TONE[tone],
        )}
      >
        {value}
      </span>
      <span className="mt-2 min-h-5 text-sm text-muted-foreground">{caption}</span>
    </div>
  );
}

/** The eight facts the owner needs about one product. */
export function ProductFacts({ stats }: { stats: ProductStats }) {
  const p = stats.product;
  const runningLow = stats.status === "running-low";
  const lowStock = stats.status === "low-stock";

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <Fact label="Selling Price" value={formatPrice(p.price)} caption="Per unit" />
      <Fact label="Cost" value={formatPrice(p.cost)} caption="Latest delivery" />
      <Fact
        label="Profit Per Unit"
        value={formatPrice(stats.profitPerUnit)}
        caption={`${formatPercent(stats.margin)} margin`}
        tone={stats.profitPerUnit > 0 ? "success" : "critical"}
      />
      <Fact label="Current Stock" value={formatNumber(p.stock)} caption={`${formatMoney(stats.stockValue)} in stock`} />
      <Fact label="Sold Last 30 Days" value={formatNumber(stats.units30)} caption={`${formatNumber(stats.unitsPrev30)} the 30 days before`} />
      <Fact label="Last Sale" value={formatDaysAgo(stats.lastSaleDaysAgo)} text />
      <Fact
        label="Estimated Days of Stock"
        value={formatDaysLeft(stats.daysLeft)}
        caption={runningLow ? "Running low" : lowStock ? "Low stock" : undefined}
        tone={runningLow ? "critical" : lowStock ? "warning" : "default"}
        text
      />
      <Fact label="Supplier" value={p.supplier} text />
    </div>
  );
}
