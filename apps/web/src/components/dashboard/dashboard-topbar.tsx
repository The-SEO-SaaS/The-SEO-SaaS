"use client";

import * as React from "react";

import { SiteSwitcher } from "@/components/dashboard/site-switcher";
import { rememberLastSiteId } from "@/hooks/use-sites";

/** Shared top bar for every per-site dashboard page. */
export function DashboardTopBar({ currentSiteId }: { currentSiteId: string }) {
  React.useEffect(() => {
    rememberLastSiteId(currentSiteId);
  }, [currentSiteId]);

  return (
    <div className="border-line flex items-center justify-between gap-4 border-b px-4 py-3 sm:px-6 lg:px-10 lg:py-5">
      <SiteSwitcher currentSiteId={currentSiteId} />
    </div>
  );
}
