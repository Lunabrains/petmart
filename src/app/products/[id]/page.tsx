import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { ProductCostChart, ProductSalesChart } from "@/components/charts/product-charts";
import { PageTitle } from "@/components/common/page-title";
import { Section } from "@/components/common/section";
import { StatusPill } from "@/components/common/status-pill";
import { DeliveriesTable } from "@/components/products/deliveries-table";
import { ProductAlerts } from "@/components/products/product-alerts";
import { ProductFacts } from "@/components/products/product-facts";
import { alertsForProduct } from "@/lib/alerts";
import { getProductStats, productCostHistory, productSalesHistory } from "@/lib/metrics";
import { loadData } from "@/lib/server-data";

interface ProductPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { id } = await params;
  const stats = getProductStats(await loadData(), id);
  return { title: stats?.product.name ?? "Product" };
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { id } = await params;
  const data = await loadData();
  const stats = getProductStats(data, id);
  if (!stats) notFound();

  const { product } = stats;
  const history = productSalesHistory(data, id, 90);
  const deliveries = productCostHistory(data, id);
  const alerts = alertsForProduct(data, id);

  return (
    <div className="flex flex-col gap-8 lg:gap-10">
      <div>
        <Link href="/products" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-brand hover:underline">
          <ArrowLeft className="size-4" />
          Back to Products
        </Link>
        <PageTitle
          title={
            <span className="flex flex-wrap items-center gap-x-3 gap-y-2">
              {product.name}
              <StatusPill status={stats.status} className="h-7 px-3 text-sm" />
            </span>
          }
          subtitle={`${product.brand} · ${product.category} · Code ${product.code} · Barcode ${product.barcode}`}
        />
      </div>

      <ProductFacts stats={stats} />

      <Section title="Sales History" description="Units sold per week, last 90 days.">
        <ProductSalesChart days={history} />
      </Section>

      <Section title="Cost History" description="What each delivery cost, against the selling price." flush>
        {deliveries.length > 0 ? (
          <>
            <div className="px-5 lg:px-6">
              <ProductCostChart purchases={deliveries} price={product.price} />
            </div>
            <div className="mt-4 border-t pt-2">
              <DeliveriesTable purchases={deliveries} />
            </div>
          </>
        ) : (
          <p className="px-5 pb-4 text-sm text-muted-foreground lg:px-6">No deliveries on record.</p>
        )}
      </Section>

      <Section title="Alerts" description="Anything about this product that needs your attention.">
        <ProductAlerts alerts={alerts} costChange={stats.costChange} />
      </Section>
    </div>
  );
}
