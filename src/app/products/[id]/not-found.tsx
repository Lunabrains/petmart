import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function ProductNotFound() {
  return (
    <div className="flex flex-col items-start gap-4 py-10">
      <h1 className="text-3xl font-semibold tracking-tight">We could not find that product</h1>
      <p className="text-muted-foreground">It may have been removed, or the link may be out of date.</p>
      <Button asChild>
        <Link href="/products">Back to Products</Link>
      </Button>
    </div>
  );
}
