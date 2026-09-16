import type { ProductStatus } from "@/lib/metrics";
import { cn } from "@/lib/utils";

export type PillTone = "critical" | "warning" | "success" | "info" | "neutral";

const TONE_CLASS: Record<PillTone, string> = {
  critical: "bg-critical-muted text-critical",
  warning: "bg-warning-muted text-warning-foreground",
  success: "bg-success-muted text-success",
  info: "bg-info-muted text-info",
  neutral: "bg-muted text-muted-foreground",
};

export const STATUS_LABEL: Record<ProductStatus, string> = {
  "running-low": "Running Low",
  "low-stock": "Low Stock",
  "no-sales": "No Sales",
  slow: "Selling Slowly",
  overstocked: "Too Much Stock",
  ok: "OK",
};

export const STATUS_TONE: Record<ProductStatus, PillTone> = {
  "running-low": "critical",
  "low-stock": "warning",
  "no-sales": "critical",
  slow: "warning",
  overstocked: "info",
  ok: "success",
};

interface PillProps {
  tone: PillTone;
  children: React.ReactNode;
  className?: string;
}

export function Pill({ tone, children, className }: PillProps) {
  return (
    <span className={cn("inline-flex h-6 items-center rounded-full px-2.5 text-xs font-semibold whitespace-nowrap", TONE_CLASS[tone], className)}>
      {children}
    </span>
  );
}

/** Product status in plain words: Running Low, Selling Slowly, OK... */
export function StatusPill({ status, className }: { status: ProductStatus; className?: string }) {
  return (
    <Pill tone={STATUS_TONE[status]} className={className}>
      {STATUS_LABEL[status]}
    </Pill>
  );
}
