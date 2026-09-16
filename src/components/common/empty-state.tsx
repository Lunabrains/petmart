import { CircleCheck } from "lucide-react";

import { cn } from "@/lib/utils";

interface EmptyStateProps {
  title: string;
  description?: string;
  className?: string;
}

/** Good news, shown when a list of problems is empty. */
export function EmptyState({ title, description, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center gap-2 rounded-xl bg-muted/60 px-6 py-10 text-center", className)}>
      <CircleCheck className="size-8 text-success" />
      <p className="text-base font-medium">{title}</p>
      {description && <p className="max-w-md text-sm text-muted-foreground">{description}</p>}
    </div>
  );
}
