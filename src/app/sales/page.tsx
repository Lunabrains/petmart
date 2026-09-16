import type { Metadata } from "next";

import { PageTitle } from "@/components/common/page-title";
import { Section } from "@/components/common/section";
import { SalesChart } from "@/components/charts/sales-chart";
import { BestSellersTable } from "@/components/sales/best-sellers-table";
import { SalesStats } from "@/components/sales/sales-stats";
import { SellingLessList } from "@/components/sales/selling-less-list";
import { bestSellers, dailySeries, getOverview, sellingLess } from "@/lib/metrics";
import { loadData } from "@/lib/server-data";

export const metadata: Metadata = { title: "Sales" };

export default async function SalesPage() {
  const data = await loadData();
  const overview = getOverview(data);
  const series = dailySeries(data, 90);
  const top = bestSellers(data, 10);
  const dropping = sellingLess(data);

  return (
    <div className="flex flex-col gap-8 lg:gap-10">
      <PageTitle title="Sales" subtitle="What is coming in today, this week and this month. This month means the last 30 days." />

      <SalesStats overview={overview} />

      <Section title="Sales Over Time" description="Sales per day, with profit as the dotted line.">
        <SalesChart series={series} initialDays={30} periods height={300} />
      </Section>

      <Section title="Best Sellers" description="Top 10 products of the last 30 days." flush>
        <BestSellersTable products={top} />
      </Section>

      <Section title="Products Selling Less" description="Last 30 days compared with the 30 days before.">
        <SellingLessList products={dropping} />
      </Section>
    </div>
  );
}
