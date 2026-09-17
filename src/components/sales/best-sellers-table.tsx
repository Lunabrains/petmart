import { ProductLink } from "@/components/common/product-link";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatMoney, formatNumber } from "@/lib/format";
import type { ProductStats } from "@/lib/metrics";

/** Top products of the last 30 days. Goes inside a flush Section. */
export function BestSellersTable({ products }: { products: ProductStats[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead className="pl-5 lg:pl-6">Product</TableHead>
          <TableHead className="text-right">Sold</TableHead>
          <TableHead className="text-right">Sales</TableHead>
          <TableHead className="text-right">Profit</TableHead>
          <TableHead className="pr-5 text-right lg:pr-6">Stock</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {products.map((s) => (
          <TableRow key={s.product.id}>
            <TableCell className="max-w-[11rem] sm:max-w-[16rem] pl-5 lg:pl-6">
              <ProductLink product={s.product} detail />
            </TableCell>
            <TableCell className="tabular text-right">{formatNumber(s.units30)}</TableCell>
            <TableCell className="tabular text-right font-medium">{formatMoney(s.revenue30)}</TableCell>
            <TableCell className="tabular text-right text-success">{formatMoney(s.profit30)}</TableCell>
            <TableCell className="tabular pr-5 text-right lg:pr-6">
              <span className={s.status === "running-low" ? "font-semibold text-critical" : undefined}>{formatNumber(s.product.stock)}</span>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
