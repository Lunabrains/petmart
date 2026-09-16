import { cn } from "@/lib/utils";

interface PageTitleProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  /** Right-hand side: a button, a filter, a link. */
  action?: React.ReactNode;
  className?: string;
}

export function PageTitle({ title, subtitle, action, className }: PageTitleProps) {
  return (
    <div className={cn("mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between lg:mb-8", className)}>
      <div>
        <h1 className="text-3xl font-semibold tracking-tight lg:text-4xl">{title}</h1>
        {subtitle && <p className="mt-1.5 text-base text-muted-foreground">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
