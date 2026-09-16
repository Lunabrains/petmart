import { EmptyState } from "@/components/common/empty-state";
import { ProductLink } from "@/components/common/product-link";
import { formatNumber, formatPercent } from "@/lib/format";
import type { ProductStats } from "@/lib/metrics";

const MAX_ROWS = 12;

function Figure({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className="min-w-0">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={className ?? "tabular text-base font-medium"}>{value}</div>
    </div>
  );
}

/** Products whose sales dropped vs the 30 days before, one row each. */
export function SellingLessList({ products }: { products: ProductStats[] }) {
  if (products.length === 0) {
    return <EmptyState title="Nothing is selling less" description="No product dropped compared with the 30 days before." />;
  }

  const shown = products.slice(0, MAX_ROWS);
  const more = products.length - shown.length;

  return (
    <div>
      <ul className="divide-y">
        {shown.map((s) => (
          <li key={s.product.id} className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
            <ProductLink product={s.product} detail className="sm:max-w-[18rem] sm:flex-1" />
            <div className="grid grid-cols-[1fr_1fr_auto] gap-4 sm:w-auto sm:min-w-[22rem]">
              <Figure label="Last Month" value={`${formatNumber(s.unitsPrev30)} sold`} />
              <Figure label="This Month" value={`${formatNumber(s.units30)} sold`} />
              <Figure
                label="Change"
                value={`Sales Down ${formatPercent(s.salesChange ?? 0)}`}
                className="tabular text-base font-bold whitespace-nowrap text-critical"
              />
            </div>
          </li>
        ))}
      </ul>
      {more > 0 && <p className="mt-4 border-t pt-4 text-sm text-muted-foreground">and {formatNumber(more)} more</p>}
    </div>
  );
}
