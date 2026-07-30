"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@theseosaas/ui/components/dropdown-menu";
import { cn } from "@theseosaas/ui/lib/utils";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { useRouter } from "next/navigation";

import { useSites } from "@/hooks/use-sites";
import type { SiteSummary } from "@/lib/api";

/**
 * Site switcher — the dashboard's top-bar dropdown.
 *
 * "Site" not "company" or "project": matches onboarding's own copy ("Which
 * site are we working on?"). Each entry's name is the bare domain, since
 * that's the one label a user never has to think to set.
 */
export function SiteSwitcher({ currentSiteId }: { currentSiteId: string }) {
  const router = useRouter();
  const { sites, addSiteQuota, isLoading } = useSites();

  const current = sites.find((site) => site.id === currentSiteId) ?? null;

  if (isLoading && sites.length === 0) {
    return <div className="bg-surface-sunken h-8 w-40 animate-pulse rounded-lg" />;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "border-line hover:bg-surface-sunken flex max-w-[220px] items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors",
        )}
      >
        <span className="truncate">{current?.domain ?? "Select a site"}</span>
        <ChevronsUpDown className="text-ink-300 size-3.5 shrink-0" />
      </DropdownMenuTrigger>

      <DropdownMenuContent className="w-64 rounded-xl p-1">
        <DropdownMenuLabel>Your sites</DropdownMenuLabel>

        {sites.map((site) => (
          <SiteRow
            key={site.id}
            site={site}
            isCurrent={site.id === currentSiteId}
            onSelect={() => router.push(`/dashboard/${site.id}`)}
          />
        ))}

        <DropdownMenuSeparator />

        <DropdownMenuItem
          onClick={() => router.push("/dashboard/sites/new")}
          className="text-ink-700 flex items-center gap-2 rounded-lg"
        >
          <Plus className="size-4" />
          <span>Add a site</span>
          {addSiteQuota ? (
            <span className="text-ink-300 ml-auto text-xs">
              {addSiteQuota.used}/{addSiteQuota.limit}
            </span>
          ) : null}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function SiteRow({
  site,
  isCurrent,
  onSelect,
}: {
  site: SiteSummary;
  isCurrent: boolean;
  onSelect: () => void;
}) {
  return (
    <DropdownMenuItem onClick={onSelect} className="flex items-center gap-2 rounded-lg">
      <span className="min-w-0 flex-1 truncate">{site.domain}</span>
      {site.score !== null ? (
        <span className="text-ink-300 text-xs tabular-nums">{site.score}</span>
      ) : null}
      {isCurrent ? <Check className="text-ink-900 size-3.5 shrink-0" /> : null}
    </DropdownMenuItem>
  );
}
