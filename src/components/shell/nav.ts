import { Bell, House, MessageCircleQuestion, Package, Tag, TrendingUp, type LucideIcon } from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

/** The whole menu. Nothing else in the first version. */
export const NAV: NavItem[] = [
  { href: "/", label: "Home", icon: House },
  { href: "/sales", label: "Sales", icon: TrendingUp },
  { href: "/stock", label: "Stock", icon: Package },
  { href: "/products", label: "Products", icon: Tag },
  { href: "/alerts", label: "Alerts", icon: Bell },
  { href: "/ask", label: "Ask", icon: MessageCircleQuestion },
];

export function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}
