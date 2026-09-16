import Link from "next/link";
import { ArrowDownRight, ArrowUpRight, ChevronRight, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export type StatTone = "default" | "critical" | "warning" | "success" | "brand";

interface BigStatProps {
  label: string;
  value: React.ReactNode;
  /** Small line under the number, e.g. "+8% vs last week" or "$38,400 sitting in them". */
  caption?: React.ReactNode;
  /** Direction of the caption's change, colours it green / red. */
  trend?: "up" | "down";
  /** Whether that direction is good news. */
  trendGood?: boolean;
  tone?: StatTone;
  icon?: LucideIcon;
  href?: string;
  className?: string;
}

const VALUE_TONE: Record<StatTone, string> = {
  default: "text-foreground",
  critical: "text-critical",
  warning: "text-warning-foreground",
  success: "text-success",
  brand: "text-brand",
};

const ICON_TONE: Record<StatTone, string> = {
  default: "bg-muted text-muted-foreground",
  critical: "bg-critical-muted text-critical",
  warning: "bg-warning-muted text-warning-foreground",
  success: "bg-success-muted text-success",
  brand: "bg-brand-muted text-brand",
};

/** One big number with a short label. The heart of the Home page. */
export function BigStat({ label, value, caption, trend, trendGood, tone = "default", icon: Icon, href, className }: BigStatProps) {
  const TrendIcon = trend === "up" ? ArrowUpRight : trend === "down" ? ArrowDownRight : null;
  const trendColor = trend ? (trendGood ? "text-success" : "text-critical") : "text-muted-foreground";

  const body = (
    <div
      className={cn(
        "flex h-full flex-col rounded-2xl bg-card p-5 ring-1 ring-foreground/10 transition-shadow",
        href && "hover:shadow-md hover:ring-foreground/15",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
        {Icon ? (
          <span className={cn("flex size-8 items-center justify-center rounded-lg", ICON_TONE[tone])}>
            <Icon className="size-4" />
          </span>
        ) : href ? (
          <ChevronRight className="size-4 text-muted-foreground" />
        ) : null}
      </div>
      <div className={cn("tabular mt-3 text-3xl font-semibold tracking-tight lg:text-4xl", VALUE_TONE[tone])}>{value}</div>
      <div className={cn("mt-2 flex min-h-5 items-center gap-1 text-sm", trendColor)}>
        {TrendIcon && <TrendIcon className="size-4" />}
        {caption}
      </div>
    </div>
  );

  return href ? (
    <Link href={href} className="block h-full rounded-2xl outline-none focus-visible:ring-[3px] focus-visible:ring-ring/30">
      {body}
    </Link>
  ) : (
    body
  );
}
