"use client";

import { IconTile } from "@theseosaas/ui/components/icon-tile";
import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";

import { useLastSiteId, useSites } from "@/hooks/use-sites";

/**
 * /dashboard has no content of its own — it resolves to a specific site and
 * redirects. Prefers the last site the user was looking at (so closing the
 * tab on "acme.com" and coming back later doesn't dump them on whichever site
 * happens to sort first), falling back to the first site, falling back to the
 * add-site flow for a brand-new account with none yet.
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

  React.useEffect(() => {
    if (isLoading || sites.length > 0) return;
    router.replace("/dashboard/sites/new");
  }, [isLoading, sites, router]);

  return (
    <main className="flex flex-1 items-center justify-center px-4">
      <IconTile tone="ink" size="xl" className="animate-pulse">
        <Search />
      </IconTile>
      <span className="sr-only">Loading your dashboard</span>
    </main>
  );
}
