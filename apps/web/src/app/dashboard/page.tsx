"use client";

import { IconTile } from "@theseosaas/ui/components/icon-tile";
import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";

import { DashboardEmpty } from "@/components/dashboard/dashboard-empty";
import { useLastSiteId, useSites } from "@/hooks/use-sites";

/**
 * /dashboard resolves to a specific site and redirects. It prefers the last
 * site the user was looking at — so closing the tab on "acme.com" and coming
 * back doesn't dump them on whichever site sorts first — then falls back to the
 * first site.
 *
 * With no sites at all it used to redirect to /dashboard/sites/new. That has
 * been removed. Sending someone straight from a magic link into a setup wizard
 * gives them no sense of what they've signed into, and it meant the dashboard
 * was a page they had never actually seen. The zero state renders the real
 * layout at zero instead, with one obvious way forward.
 */
export default function DashboardIndexPage() {
  const router = useRouter();
  const { sites, isLoading } = useSites();
  const lastSiteId = useLastSiteId();

  React.useEffect(() => {
    if (isLoading || sites.length === 0) return;

    const target = sites.find((site) => site.id === lastSiteId) ?? sites[0]!;
    router.replace(`/dashboard/${target.id}`);
  }, [isLoading, sites, lastSiteId, router]);

  if (!isLoading && sites.length === 0) {
    return <DashboardEmpty />;
  }

  // Either still loading, or a redirect is already in flight.
  return (
    <main className="flex flex-1 items-center justify-center px-4">
      <IconTile tone="ink" size="xl" className="animate-pulse">
        <Search />
      </IconTile>
      <span className="sr-only">Loading your dashboard</span>
    </main>
  );
}
