import type { Metadata } from "next";

import { EmptyState } from "@/components/common/empty-state";
import { PageTitle } from "@/components/common/page-title";
import { Section } from "@/components/common/section";
import { NoSalesTable } from "@/components/stock/no-sales-table";
import { RunningLowTable } from "@/components/stock/running-low-table";
import { parseSince, SinceSwitch } from "@/components/stock/since-switch";
import { SlowTable } from "@/components/stock/slow-table";
import { TooMuchTable } from "@/components/stock/too-much-table";
import { formatMoney, pluralize } from "@/lib/format";
import { historyDays, needsOrdering, noSales, overstocked, runningLow, slowProducts, stockValue, type ProductStats } from "@/lib/metrics";
import { loadData } from "@/lib/server-data";

export const metadata: Metadata = { title: "Stock" };

function totalValue(rows: ProductStats[]): number {
  return rows.reduce((total, s) => total + s.stockValue, 0);
}

export default async function StockPage({ searchParams }: { searchParams: Promise<{ since?: string | string[] }> }) {
  const since = parseSince((await searchParams).since);
  const data = await loadData();

  const low = runningLow(data);
  const ordering = needsOrdering(data);
  const lowSoon = ordering.length - low.length;
  const tooMuch = overstocked(data);
  const slow = slowProducts(data);
  const dead = noSales(data, since);

  return (
    <div className="flex flex-col gap-8 lg:gap-10">
      <PageTitle
        title="Stock"
        subtitle={`Stock is worth ${formatMoney(stockValue(data))} across ${pluralize(data.products.length, "product")}.`}
      />

      <Section
        id="running-low"
        title={`Running Low · ${pluralize(low.length, "product")}`}
        description={
          ordering.length
            ? `${low.length ? `${pluralize(low.length, "product")} may run out within a week` : "Nothing runs out this week"}${
                lowSoon ? `, ${pluralize(lowSoon, "more product")} within two weeks` : ""
              }. Soonest to run out first, at the current pace of sales.`
            : "No product will run out within two weeks at the current pace of sales."
        }
        flush={ordering.length > 0}
      >
        {ordering.length ? (
          <RunningLowTable rows={ordering} />
        ) : (
          <EmptyState title="Nothing is running low" description="No product needs ordering right now." />
        )}
      </Section>

      <Section
        id="too-much"
        title={`Too Much Stock · ${pluralize(tooMuch.length, "product")}`}
        description={
          tooMuch.length
            ? `${formatMoney(totalValue(tooMuch))} is sitting in products with more than 4 months of stock.`
            : "No product has far more stock than it sells."
        }
        flush={tooMuch.length > 0}
      >
        {tooMuch.length ? (
          <TooMuchTable rows={tooMuch} />
        ) : (
          <EmptyState title="No product has too much stock" description="Stock levels match how fast things sell." />
        )}
      </Section>

      <Section
        id="slow"
        title={`Slow Products · ${pluralize(slow.length, "product")}`}
        description={
          slow.length
            ? `${formatMoney(totalValue(slow))} is sitting in these products. Each sold 5 or fewer units in the last 60 days.`
            : "Everything sold more than 5 units in the last 60 days."
        }
        flush={slow.length > 0}
      >
        {slow.length ? (
          <SlowTable rows={slow} />
        ) : (
          <EmptyState title="No slow products" description="Everything is moving." />
        )}
      </Section>

      <Section
        id="no-sales"
        title={`No Sales · ${pluralize(dead.length, "product")}`}
        description={
          dead.length
            ? `${formatMoney(totalValue(dead))} is sitting in products that have not sold for ${since} days.`
            : `Every product with stock has sold at least once in the last ${since} days.`
        }
        action={<SinceSwitch since={since} />}
        flush={dead.length > 0}
      >
        {dead.length ? (
          <NoSalesTable rows={dead} history={historyDays(data)} />
        ) : (
          <EmptyState title={`Everything has sold in the last ${since} days`} description="No stock is sitting still." />
        )}
      </Section>
    </div>
  );
}
