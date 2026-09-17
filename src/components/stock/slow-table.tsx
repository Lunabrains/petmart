import { ProductLink } from "@/components/common/product-link";
import { StatusPill } from "@/components/common/status-pill";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDaysAgo, formatMoney, formatNumber } from "@/lib/format";
import type { ProductStats } from "@/lib/metrics";

/** Products that sold 5 or fewer units in the last 60 days, biggest value first. */
export function SlowTable({ rows }: { rows: ProductStats[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead className="pl-5 lg:pl-6">Product</TableHead>
          <TableHead className="text-right">Current Stock</TableHead>
          <TableHead className="text-right">Stock Value</TableHead>
          <TableHead className="text-right">Last Sale</TableHead>
          <TableHead className="text-right">Sold Last 30 Days</TableHead>
          <TableHead className="pr-5 text-right lg:pr-6">Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((s) => (
          <TableRow key={s.product.id}>
            <TableCell className="max-w-[11rem] sm:max-w-[16rem] pl-5 lg:pl-6">
              <ProductLink product={s.product} detail />
            </TableCell>
            <TableCell className="tabular text-right">{formatNumber(s.product.stock)}</TableCell>
            <TableCell className="tabular text-right font-medium">{formatMoney(s.stockValue)}</TableCell>
            <TableCell className="tabular text-right">{formatDaysAgo(s.lastSaleDaysAgo)}</TableCell>
            <TableCell className="tabular text-right">{formatNumber(s.units30)}</TableCell>
            <TableCell className="pr-5 text-right lg:pr-6">
              <StatusPill status={s.status} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
