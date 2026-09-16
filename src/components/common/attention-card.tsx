import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";

export type AttentionLevel = "red" | "orange";

interface AttentionCardProps {
  level: AttentionLevel;
  /** One plain sentence, e.g. "12 products are running low". */
  title: React.ReactNode;
  /** Optional second line with a little more detail. */
  description?: React.ReactNode;
  href: string;
  /** Button label, defaults to "See Products". */
  cta?: string;
  className?: string;
}

const DOT: Record<AttentionLevel, string> = {
  red: "bg-critical",
  orange: "bg-warning",
};

const BAR: Record<AttentionLevel, string> = {
  red: "before:bg-critical",
  orange: "before:bg-warning",
};

/** A problem the owner should look at, with one button that takes them there. */
export function AttentionCard({ level, title, description, href, cta = "See Products", className }: AttentionCardProps) {
  return (
    <Link
      href={href}
      className={cn(
        "group relative flex items-center gap-4 overflow-hidden rounded-2xl bg-card p-5 pl-6 ring-1 ring-foreground/10 transition-shadow hover:shadow-md hover:ring-foreground/15",
        "before:absolute before:inset-y-0 before:left-0 before:w-1.5",
        BAR[level],
        className,
      )}
    >
      <span className={cn("size-3 shrink-0 rounded-full", DOT[level])} aria-hidden />
      <span className="min-w-0 flex-1">
        <span className="block text-lg font-semibold leading-snug">{title}</span>
        {description && <span className="mt-0.5 block text-sm text-muted-foreground">{description}</span>}
      </span>
      <span className="hidden shrink-0 items-center gap-1 rounded-lg bg-secondary px-3 py-2 text-sm font-medium text-secondary-foreground group-hover:bg-accent sm:inline-flex">
        {cta}
        <ChevronRight className="size-4" />
      </span>
      <ChevronRight className="size-5 shrink-0 text-muted-foreground sm:hidden" />
    </Link>
  );
}

export function AttentionDot({ level, className }: { level: AttentionLevel; className?: string }) {
  return <span className={cn("inline-block size-2.5 rounded-full", DOT[level], className)} aria-hidden />;
}
