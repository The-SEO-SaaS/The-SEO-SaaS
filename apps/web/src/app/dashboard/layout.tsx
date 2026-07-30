import type { Metadata } from "next";

import { AppMobileNav, AppSidebar } from "@/components/layout/app-sidebar";

export const metadata: Metadata = {
  title: "Dashboard — TheSEOSaaS",
  robots: { index: false, follow: false },
};

/**
 * Shared chrome for every signed-in page: sidebar on desktop, a slide-over
 * drawer on mobile. The per-site top bar (site switcher, last-crawl info)
 * lives one level down in dashboard/[projectId]/layout.tsx, since it needs to
 * know which site is active and this layout doesn't.
 */
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-svh">
      <AppSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <AppMobileNav />
        {children}
      </div>
    </div>
  );
}
