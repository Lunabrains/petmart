"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PawPrint } from "lucide-react";

import { isActive, NAV } from "@/components/shell/nav";
import { cn } from "@/lib/utils";

interface SidebarProps {
  /** Open red alerts, shown next to "Alerts". */
  alertCount: number;
}

export function Brand() {
  return (
    <Link href="/" className="flex h-16 items-center gap-3 px-5">
      <span className="flex size-9 items-center justify-center rounded-xl bg-brand text-brand-foreground">
        <PawPrint className="size-5" strokeWidth={2.25} />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-base font-semibold leading-tight">Petmart</span>
        <span className="block text-xs leading-tight text-muted-foreground">Owner dashboard</span>
      </span>
    </Link>
  );
}

export function Sidebar({ alertCount }: SidebarProps) {
  const pathname = usePathname();
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-sidebar-border bg-sidebar lg:flex">
      <Brand />
      <nav className="flex flex-1 flex-col gap-1 px-3 pt-2" aria-label="Main">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] font-medium transition-colors",
                active ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <Icon className={cn("size-5", active ? "text-brand" : "")} strokeWidth={active ? 2.25 : 2} />
              <span className="flex-1">{label}</span>
              {href === "/alerts" && alertCount > 0 && (
                <span className="tabular rounded-full bg-critical px-2 py-0.5 text-xs font-semibold text-critical-foreground">{alertCount}</span>
              )}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-sidebar-border p-4 text-xs leading-relaxed text-muted-foreground">
        Numbers come from Wizzard.
        <br />
        Nothing here changes Wizzard.
      </div>
    </aside>
  );
}

/** Phone: a small header on top and the menu along the bottom. */
export function MobileNav({ alertCount }: SidebarProps) {
  const pathname = usePathname();
  return (
    <>
      <header className="sticky top-0 z-30 flex h-14 items-center border-b border-sidebar-border bg-sidebar/95 px-2 backdrop-blur lg:hidden">
        <Brand />
      </header>
      <nav
        className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-6 border-t border-sidebar-border bg-sidebar/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
        aria-label="Main"
      >
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium",
                active ? "text-brand" : "text-muted-foreground",
              )}
            >
              <Icon className="size-5" strokeWidth={active ? 2.25 : 2} />
              {label}
              {href === "/alerts" && alertCount > 0 && (
                <span className="absolute top-1 right-1/2 -mr-5 size-2 rounded-full bg-critical" aria-label={`${alertCount} alerts`} />
              )}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
