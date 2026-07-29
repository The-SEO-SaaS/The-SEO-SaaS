import { IconTile } from "@theseosaas/ui/components/icon-tile";
import { Search } from "lucide-react";

/**
 * Root loading state, shown while a route segment streams in.
 *
 * Deliberately quiet: a branded mark with a soft pulse rather than a spinner.
 * Navigations here are fast, and a spinner on a 200ms transition reads as
 * slowness that isn't actually there.
 *
 * Note this is not the audit crawl loader — that's a real multi-minute job with
 * its own checklist UI in components/audit/crawl-checklist.tsx.
 */
export default function Loading() {
  return (
    <main className="flex min-h-svh items-center justify-center px-4">
      <div className="flex flex-col items-center gap-4">
        <IconTile tone="ink" size="xl" className="animate-pulse">
          <Search />
        </IconTile>
        <span className="sr-only">Loading</span>
      </div>
    </main>
  );
}
