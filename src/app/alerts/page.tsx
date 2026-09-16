import type { Metadata } from "next";
import { cookies } from "next/headers";

import { AlertFilters, CATEGORY_FILTERS, categoryLabel, type CategoryFilter, type StatusFilter } from "@/components/alerts/alert-filters";
import { AlertList, MarkAllSeenButton, type AlertItem } from "@/components/alerts/alert-list";
import { PageTitle } from "@/components/common/page-title";
import { Section } from "@/components/common/section";
import { ALERT_STATUS_COOKIE, parseAlertStatuses, statusOf } from "@/lib/alert-status";
import { buildAlerts } from "@/lib/alerts";
import { pluralize } from "@/lib/format";
import { loadData } from "@/lib/server-data";

export const metadata: Metadata = { title: "Alerts" };

type SearchParams = Promise<{ category?: string | string[]; status?: string | string[] }>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function readCategory(value: string | undefined): CategoryFilter {
  return (CATEGORY_FILTERS as string[]).includes(value ?? "") ? (value as CategoryFilter) : "all";
}

function readStatus(value: string | undefined): StatusFilter {
  return value === "done" ? "done" : "open";
}

export default async function AlertsPage({ searchParams }: { searchParams: SearchParams }) {
  const [params, data, cookieStore] = await Promise.all([searchParams, loadData(), cookies()]);
  const category = readCategory(first(params.category));
  const status = readStatus(first(params.status));

  const statuses = parseAlertStatuses(cookieStore.get(ALERT_STATUS_COOKIE)?.value);
  const items: AlertItem[] = buildAlerts(data).map((alert) => ({ alert, status: statusOf(statuses, alert.id) }));

  const open = items.filter((i) => i.status !== "done");
  const done = items.filter((i) => i.status === "done");
  const openCounts = Object.fromEntries(
    CATEGORY_FILTERS.map((c) => [c, c === "all" ? open.length : open.filter((i) => i.alert.category === c).length]),
  ) as Record<CategoryFilter, number>;

  const inCategory = (status === "done" ? done : open).filter((i) => category === "all" || i.alert.category === category);
  const newIds = status === "open" ? inCategory.filter((i) => i.status === "new").map((i) => i.alert.id) : [];

  const sectionTitle = category === "all" ? "All Alerts" : `${categoryLabel(category)} Alerts`;
  const sectionDescription =
    status === "done" ? "Marked done. Reopen one if it still needs work." : "Red needs action now. Orange is worth a look this week.";

  return (
    <div className="flex flex-col gap-8 lg:gap-10">
      <PageTitle title="Alerts" subtitle={pluralize(open.length, "open alert")} />

      <div className="flex flex-col gap-4">
        <AlertFilters category={category} status={status} openCounts={openCounts} doneCount={done.length} />

        <Section
          title={sectionTitle}
          description={sectionDescription}
          action={newIds.length > 0 ? <MarkAllSeenButton ids={newIds} /> : undefined}
          flush
        >
          <AlertList items={inCategory} showing={status} />
        </Section>
      </div>
    </div>
  );
}
