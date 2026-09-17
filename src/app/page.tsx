import Link from "next/link";
import { format, parseISO } from "date-fns";
import { Package, ShoppingBag, Turtle, Wallet, Warehouse } from "lucide-react";

import { AttentionCard } from "@/components/common/attention-card";
import { BigStat } from "@/components/common/big-stat";
import { ProductLink } from "@/components/common/product-link";
import { Section, SectionHeading } from "@/components/common/section";
import { SalesChart } from "@/components/charts/sales-chart";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatMoney, formatNumber, formatSignedPercent, pluralize } from "@/lib/format";
import { dailySeries, getOverview } from "@/lib/metrics";
import { loadData } from "@/lib/server-data";

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good Morning";
  if (hour < 18) return "Good Afternoon";
  return "Good Evening";
}

export default async function HomePage() {
  const data = await loadData();
  const o = getOverview(data);
  const series = dailySeries(data, 30);

  const attention = [
    o.runningLow.length > 0 && {
      level: "red" as const,
      title: `${pluralize(o.runningLow.length, "product is", "products are")} running low`,
      description: `${o.runningLow.slice(0, 2).map((s) => s.product.name).join(", ")}${o.runningLow.length > 2 ? " and more" : ""} may run out within a week.`,
      href: "/stock",
    },
    o.slow.length > 0 && {
      level: "orange" as const,
      title: `${formatMoney(o.slowValue)} is sitting in slow products`,
      description: `${pluralize(o.slow.length, "product")} sold 5 or fewer units in the last 60 days.`,
      href: "/stock#slow",
    },
    o.profitDrops.length > 0 && {
      level: "red" as const,
      title: `Profit dropped on ${pluralize(o.profitDrops.length, "product")}`,
      description: "Supplier costs went up but selling prices stayed the same.",
      href: "/alerts?category=profit",
    },
    o.costIncreases.length > 0 && {
      level: "orange" as const,
      title: `Supplier cost increased on ${pluralize(o.costIncreases.length, "product")}`,
      description: "Latest deliveries cost more than 5% above the previous ones.",
      href: "/alerts?category=profit",
    },
    o.noSales.length > 0 && {
      level: "orange" as const,
      title: `${pluralize(o.noSales.length, "product has", "products have")} had no sales for 90 days`,
      description: `${formatMoney(o.noSalesValue)} in stock that is not moving.`,
      href: "/stock#no-sales",
    },
  ].filter(Boolean) as Array<{ level: "red" | "orange"; title: string; description: string; href: string }>;

  return (
    <div className="flex flex-col gap-8 lg:gap-10">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight lg:text-4xl">{greeting()}</h1>
        <p className="mt-1.5 text-base text-muted-foreground">
          {format(parseISO(data.today), "EEEE, MMMM d")}. Here is how the business looks right now.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <BigStat
          label="Sales Today"
          value={formatMoney(o.salesToday)}
          icon={ShoppingBag}
          tone="brand"
          caption={o.todayVsLastWeek !== null ? `${formatSignedPercent(o.todayVsLastWeek)} vs last week` : `${pluralize(o.ordersToday, "order")}`}
          trend={o.todayVsLastWeek === null ? undefined : o.todayVsLastWeek >= 0 ? "up" : "down"}
          trendGood={(o.todayVsLastWeek ?? 0) >= 0}
          href="/sales"
        />
        <BigStat label="Profit Today" value={formatMoney(o.profitToday)} icon={Wallet} tone="success" caption={`${pluralize(o.ordersToday, "order")} today`} href="/sales" />
        <BigStat label="Stock Value" value={formatMoney(o.stockValue)} icon={Warehouse} caption={`${pluralize(data.products.length, "product")} in stock`} href="/stock" />
        <BigStat
          label="Running Low"
          value={formatNumber(o.runningLow.length)}
          icon={Package}
          tone={o.runningLow.length ? "critical" : "success"}
          caption={o.runningLow.length ? "May run out within a week" : "Nothing running out soon"}
          href="/stock"
        />
        <BigStat
          label="Slow Products"
          value={formatNumber(o.slow.length)}
          icon={Turtle}
          tone={o.slow.length ? "warning" : "success"}
          caption={o.slow.length ? `${formatMoney(o.slowValue)} sitting in them` : "Everything is moving"}
          href="/stock#slow"
        />
      </div>

      <div>
        <SectionHeading title="Needs Your Attention" description={attention.length ? undefined : "Nothing needs your attention right now."} />
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {attention.map((item) => (
            <AttentionCard key={item.href + item.title} level={item.level} title={item.title} description={item.description} href={item.href} />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-5">
        <Section
          title="Best Sellers"
          description="Last 30 days"
          action={
            <Link href="/sales" className="text-sm font-medium text-brand hover:underline">
              See all
            </Link>
          }
          className="xl:col-span-3"
          flush
        >
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
              {o.bestSellers.map((s) => (
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
        </Section>

        <Section
          title="Sales"
          description="Last 30 days, with profit as the dotted line."
          action={
            <Link href="/sales" className="text-sm font-medium text-brand hover:underline">
              See sales
            </Link>
          }
          className="xl:col-span-2"
        >
          <SalesChart series={series} initialDays={30} height={240} />
        </Section>
      </div>
    </div>
  );
}
