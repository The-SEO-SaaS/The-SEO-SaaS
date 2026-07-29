"use client";

import { Button } from "@theseosaas/ui/components/button";
import { IconTile } from "@theseosaas/ui/components/icon-tile";
import { cn } from "@theseosaas/ui/lib/utils";
import { Check, Copy, Search } from "lucide-react";
import Link from "next/link";
import * as React from "react";

/**
 * Public report chrome.
 *
 * The share affordance is prominent because passing these links around is the
 * distribution model — a report nobody can easily copy the URL of doesn't get
 * shared, and the CTA for a visitor reading someone else's report is "audit
 * your own site", not "sign up".
 */
export function AuditHeader({ shareUrl }: { shareUrl?: string }) {
  const [copied, setCopied] = React.useState(false);

  const copy = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard can be blocked by permissions — the URL is visible anyway.
    }
  };

  return (
    <header className="border-line bg-surface/90 sticky top-0 z-10 border-b backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-3.5">
        <Link href="/" className="flex items-center gap-2.5 no-underline hover:no-underline">
          <IconTile tone="ink" size="md">
            <Search />
          </IconTile>
          <span className="font-display text-ink-900 text-md font-semibold tracking-tight">
            TheSEOSaaS
          </span>
        </Link>

        <div className="flex items-center gap-2">
          {shareUrl ? (
            <Button variant="outline" size="sm" onClick={copy}>
              {copied ? <Check /> : <Copy />}
              {copied ? "Copied" : "Copy link"}
            </Button>
          ) : null}

          <Button size="sm" render={<Link href="/" />}>
            Audit your own site
          </Button>
        </div>
      </div>
    </header>
  );
}

/** Byline above the report — establishes it as a document, not a dashboard. */
export function ReportMeta({
  domain,
  completedAt,
  pagesCrawled,
  className,
}: {
  domain: string;
  completedAt: string | null;
  pagesCrawled: number;
  className?: string;
}) {
  const date = completedAt
    ? new Date(completedAt).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;

  return (
    <div className={cn("space-y-3", className)}>
      <div className="eyebrow text-ink-300">
        Public audit report{date ? ` · ${date}` : ""}
      </div>
      <h1 className="font-display text-ink-900 text-4xl font-semibold tracking-tight">
        {domain}
      </h1>
      {pagesCrawled > 0 ? (
        <p className="text-ink-400 text-sm">
          {pagesCrawled} {pagesCrawled === 1 ? "page" : "pages"} crawled
        </p>
      ) : null}
    </div>
  );
}
