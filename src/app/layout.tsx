import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { MobileNav, Sidebar } from "@/components/shell/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { buildAlerts } from "@/lib/alerts";
import { loadData } from "@/lib/server-data";

import "./globals.css";

const geistSans = Geist({ variable: "--font-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "Petmart", template: "%s · Petmart" },
  description: "A simple dashboard for the owner: what is selling, what is running out, where profit is lost.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const data = await loadData();
  const redAlerts = buildAlerts(data).filter((a) => a.level === "red").length;

  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full">
        <TooltipProvider delayDuration={200}>
          <Sidebar alertCount={redAlerts} />
          <MobileNav alertCount={redAlerts} />
          <div className="lg:pl-64">
            <main className="mx-auto w-full max-w-6xl px-4 pt-6 pb-24 lg:px-8 lg:pt-10 lg:pb-16">{children}</main>
          </div>
        </TooltipProvider>
      </body>
    </html>
  );
}
