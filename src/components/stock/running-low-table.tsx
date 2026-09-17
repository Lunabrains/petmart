import { ProductLink } from "@/components/common/product-link";
import { Pill } from "@/components/common/status-pill";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDaysLeft, formatNumber, formatPerDay } from "@/lib/format";
import type { ProductStats } from "@/lib/metrics";
import { cn } from "@/lib/utils";

/** What to do about it, in the owner's words: Order Now (under 3 days), Order Soon (under a week), Low Stock (under two weeks). */
function OrderPill({ daysLeft }: { daysLeft: number | null }) {
  if (daysLeft !== null && daysLeft < 3) return <Pill tone="critical">Order Now</Pill>;
  if (daysLeft !== null && daysLeft < 7) return <Pill tone="critical">Order Soon</Pill>;
  return <Pill tone="warning">Low Stock</Pill>;
}

/** Products that will run out soon, soonest first: running low (under a week) and low stock (under two weeks). */
export function RunningLowTable({ rows }: { rows: ProductStats[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead className="pl-5 lg:pl-6">Product</TableHead>
          <TableHead className="text-right">Current Stock</TableHead>
          <TableHead className="text-right">Average Sales</TableHead>
          <TableHead className="text-right">Estimated Days Left</TableHead>
          <TableHead className="pr-5 text-right lg:pr-6">Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((s) => (
          <TableRow key={s.product.id}>
            <TableCell className="max-w-[11rem] sm:max-w-[16rem] pl-5 lg:pl-6">
              <ProductLink product={s.product} detail />
            </TableCell>
            <TableCell className={cn("tabular text-right font-semibold", s.status === "running-low" ? "text-critical" : "text-warning-foreground")}>
              {formatNumber(s.product.stock)}
            </TableCell>
            <TableCell className="tabular text-right">{formatPerDay(s.avgDaily)}</TableCell>
            <TableCell className="tabular text-right font-medium">{formatDaysLeft(s.daysLeft)}</TableCell>
            <TableCell className="pr-5 text-right lg:pr-6">
              <OrderPill daysLeft={s.daysLeft} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
