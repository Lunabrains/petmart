import { ProductLink } from "@/components/common/product-link";
import { StatusPill } from "@/components/common/status-pill";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDaysLeft, formatMoney, formatNumber } from "@/lib/format";
import type { ProductStats } from "@/lib/metrics";

/** Products with far more stock than they sell, biggest value first. */
export function TooMuchTable({ rows }: { rows: ProductStats[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead className="pl-5 lg:pl-6">Product</TableHead>
          <TableHead className="text-right">Current Stock</TableHead>
          <TableHead className="text-right">Stock Value</TableHead>
          <TableHead className="text-right">Sold Last 30 Days</TableHead>
          <TableHead className="text-right">Enough Stock For</TableHead>
          <TableHead className="pr-5 text-right lg:pr-6">Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((s) => (
          <TableRow key={s.product.id}>
            <TableCell className="max-w-[16rem] pl-5 lg:pl-6">
              <ProductLink product={s.product} detail />
            </TableCell>
            <TableCell className="tabular text-right">{formatNumber(s.product.stock)}</TableCell>
            <TableCell className="tabular text-right font-medium">{formatMoney(s.stockValue)}</TableCell>
            <TableCell className="tabular text-right">{formatNumber(s.units30)}</TableCell>
            <TableCell className="tabular text-right font-medium text-info">{formatDaysLeft(s.daysLeft)}</TableCell>
            <TableCell className="pr-5 text-right lg:pr-6">
              <StatusPill status={s.status} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
