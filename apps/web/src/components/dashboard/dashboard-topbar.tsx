"use client";

import { HeaderChip } from "@/components/dashboard/page-header";
import { SiteSwitcher } from "@/components/dashboard/site-switcher";
import { useSites } from "@/hooks/use-sites";

/**
 * The dashboard index's top bar.
 *
 * Follows the design's bar — breadcrumb left, muted meta and a bordered chip
 * right — with the site switcher standing in for the second crumb, since this
 * build supports multiple sites where the design assumed one.
 *
 * Rendered by the dashboard page, not the layout: sibling screens draw their
 * own headers, so a shared one would stack two bars. Remembering the current
 * site moved to RememberSite for the same reason.
 */
export function DashboardTopBar({ currentSiteId }: { currentSiteId: string }) {
  const { sites } = useSites();

  const site = sites.find((entry) => entry.id === currentSiteId) ?? null;

  const month = new Date().toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="flex flex-col gap-3 border-b border-[#EDEFF3] px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:px-10 sm:py-5">
      <div className="flex min-w-0 items-center gap-1.5">
        <span className="text-[13px] text-[#6B7480]">Dashboard</span>
        <span className="text-[#D3D8E0]">/</span>
        <SiteSwitcher currentSiteId={currentSiteId} />
      </div>

      <div className="flex flex-wrap items-center gap-x-[18px] gap-y-2">
        {site?.score !== null && site !== null ? (
          <span className="text-[12.5px] text-[#6B7480]">
            Score {site.score} · {site.keywordCount} keywords tracked
          </span>
        ) : null}
        <HeaderChip>{month}</HeaderChip>
      </div>
    </div>
  );
}
