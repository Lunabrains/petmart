import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex flex-col items-start gap-4 py-10">
      <h1 className="text-3xl font-semibold tracking-tight">We could not find that page</h1>
      <p className="text-muted-foreground">It may have moved, or the link may be out of date.</p>
      <Button asChild>
        <Link href="/">Back to Home</Link>
      </Button>
    </div>
  );
}
