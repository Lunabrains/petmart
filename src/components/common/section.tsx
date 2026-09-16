import { cn } from "@/lib/utils";

interface SectionProps {
  title: React.ReactNode;
  description?: React.ReactNode;
  /** Right-hand side of the header: a link, a toggle. */
  action?: React.ReactNode;
  /** Anchor id so cards can link straight to a section, e.g. /stock#slow. */
  id?: string;
  children: React.ReactNode;
  className?: string;
  /** Remove the inner padding, for tables that run edge to edge. */
  flush?: boolean;
}

/** A titled card. Every page is a stack of these. */
export function Section({ title, description, action, id, children, className, flush }: SectionProps) {
  return (
    <section id={id} className={cn("scroll-mt-20 rounded-2xl bg-card ring-1 ring-foreground/10", className)}>
      <div className="flex flex-col gap-2 px-5 pt-5 sm:flex-row sm:items-start sm:justify-between lg:px-6 lg:pt-6">
        <div>
          <h2 className="text-lg font-semibold leading-tight">{title}</h2>
          {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      <div className={cn("pt-4", flush ? "pb-2" : "px-5 pb-5 lg:px-6 lg:pb-6")}>{children}</div>
    </section>
  );
}

interface SectionHeadingProps {
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

/** A plain heading between groups of cards, e.g. "Needs Your Attention". */
export function SectionHeading({ title, description, action, className }: SectionHeadingProps) {
  return (
    <div className={cn("mb-4 flex items-end justify-between gap-3", className)}>
      <div>
        <h2 className="text-xl font-semibold tracking-tight lg:text-2xl">{title}</h2>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
  );
}
