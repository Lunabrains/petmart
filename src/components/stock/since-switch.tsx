import Link from "next/link";

import { cn } from "@/lib/utils";

export const SINCE_CHOICES = [30, 60, 90] as const;
export type Since = (typeof SINCE_CHOICES)[number];

/** "since" from the address bar: 30, 60 or 90. Anything else means 90. */
export function parseSince(raw: string | string[] | undefined): Since {
  const value = Number(Array.isArray(raw) ? raw[0] : raw);
  return SINCE_CHOICES.find((choice) => choice === value) ?? 90;
}

/** Three links, one highlighted: how long a product must have gone without a sale. */
export function SinceSwitch({ since }: { since: Since }) {
  return (
    <nav aria-label="No sales for" className="inline-flex rounded-lg bg-muted p-1">
      {SINCE_CHOICES.map((choice) => {
        const active = choice === since;
        return (
          <Link
            key={choice}
            href={`/stock?since=${choice}#no-sales`}
            aria-current={active ? "page" : undefined}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-colors",
              active ? "bg-card text-foreground shadow-sm ring-1 ring-foreground/10" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {choice} Days
          </Link>
        );
      })}
    </nav>
  );
}
