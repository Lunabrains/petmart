"use client";

import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";

/** A form button that greys out while its form is being sent. */
export function PendingButton({ disabled, children, ...props }: React.ComponentProps<typeof Button>) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={disabled || pending} aria-busy={pending || undefined} {...props}>
      {children}
    </Button>
  );
}
