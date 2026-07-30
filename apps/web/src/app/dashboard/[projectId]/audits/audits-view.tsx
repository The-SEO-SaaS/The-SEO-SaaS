"use client";

import { Badge } from "@theseosaas/ui/components/badge";
import { Button } from "@theseosaas/ui/components/button";
import { Card, CardContent } from "@theseosaas/ui/components/card";
import { Empty, EmptyDescription, EmptyTitle } from "@theseosaas/ui/components/empty";
import { IconTile } from "@theseosaas/ui/components/icon-tile";
import { FadeIn, Stagger, StaggerItem } from "@theseosaas/ui/components/motion";
import { cn } from "@theseosaas/ui/lib/utils";
import { AlertTriangle, ArrowRight, RefreshCw, Search } from "lucide-react";
import Link from "next/link";

import { PageHeader } from "@/components/dashboard/page-header";
import { useAudits } from "@/hooks/use-audits";
import type { AuditHistoryEntry } from "@/lib/api";

/**
 * Audit history and re-running.
 *
 * This is what makes the dashboard's score trend real: a full audit is too
 * expensive to run automatically every day, so improvement only becomes
 * visible when the user re-measures after making changes. The page is
 * therefore built around one action — run it again — plus the record of what
 * changed each time.
 */
export function AuditsView({ projectId }: { projectId: string }) {
  const flow = useAudits(projectId);
  const history = flow.history;

  if (flow.isLoading && !history) {
    return (
      <main className="flex flex-1 items-center justify-center px-4 py-16">
        <IconTile tone="ink" size="xl" className="animate-pulse">
          <Search />
        </IconTile>
        <span className="sr-only">Loading audits</span>
      </main>
    );
  }

  if (flow.isError || !history) {
    return (
      <main className="flex flex-1 items-center justify-center px-4 py-16">
        <div className="w-full max-w-md space-y-4 text-center">
          <IconTile tone="critical" size="xl" className="mx-auto">
            <AlertTriangle />
          </IconTile>
          <h1 className="font-display text-ink-900 text-2xl font-semibold">
            We couldn&apos;t load your audits
          </h1>
          <p className="text-ink-400 text-base leading-relaxed">
            {flow.errorMessage ?? "Please try again in a moment."}
          </p>
          <Button onClick={flow.refetch}>Try again</Button>
        </div>
      </main>
    );
  }

  const latest = history.audits.find((entry) => entry.status === "COMPLETED") ?? null;

  return (
    <>
      <PageHeader
        title="Audits"
        meta={history.site.domain}
        action={
          <Button
            size="sm"
            onClick={flow.rerun}
            disabled={!history.canRerun || flow.isRerunning}
          >
            <RefreshCw className={cn(flow.isRerunning && "animate-spin")} />
            {flow.isRerunning ? "Starting…" : "Run audit"}
          </Button>
        }
      />

      <main className="flex flex-1 flex-col gap-6 px-4 py-6 sm:px-6 lg:px-10">
        {history.inFlight ? (
          <FadeIn>
            <Card variant="well">
              <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="text-ink-900 text-base font-medium">
                    An audit is running now
                  </div>
                  <p className="text-ink-400 mt-0.5 text-sm">
                    It takes a couple of minutes. You don&apos;t need to stay on this page.
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  render={<Link href={`/audit/${history.inFlight.publicId}`} />}
                >
                  Watch progress
                  <ArrowRight />
                </Button>
              </CardContent>
            </Card>
          </FadeIn>
        ) : history.rerunBlockedReason ? (
          <p className="text-ink-300 text-sm">{history.rerunBlockedReason}</p>
        ) : null}

        {flow.rerunError ? (
          <div className="border-critical/20 bg-critical/5 text-critical-strong rounded-lg border px-3.5 py-2.5 text-sm">
            {flow.rerunError}
          </div>
        ) : null}

        {latest ? (
          <FadeIn delay={0.05}>
            <Card variant="panel">
              <CardContent className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="eyebrow text-ink-300">Latest verdict</div>
                  <p className="text-ink-900 mt-2 max-w-[52ch] text-base leading-relaxed">
                    {latest.summary ?? "This audit finished — open it for the full findings."}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-6">
                  <div>
                    <div className="font-display text-ink-900 text-3xl font-semibold tabular-nums">
                      {latest.score ?? "—"}
                    </div>
                    <div className="text-ink-300 text-xs">of 100</div>
                  </div>

                  <Button variant="outline" render={<Link href={`/audit/${latest.publicId}`} />}>
                    Open report
                  </Button>
                </div>
              </CardContent>
            </Card>
          </FadeIn>
        ) : null}

        {history.audits.length > 0 ? (
          <section>
            <div className="border-line-strong text-ink-400 hidden grid-cols-[minmax(0,1fr)_90px_90px_100px_110px] gap-4 border-b pb-2.5 lg:grid">
              <div className="eyebrow">Run</div>
              <div className="eyebrow">Score</div>
              <div className="eyebrow">Issues</div>
              <div className="eyebrow">Pages</div>
              <div className="eyebrow text-right">Report</div>
            </div>

            <Stagger className="flex flex-col" whenInView={false}>
              {history.audits.map((entry) => (
                <StaggerItem key={entry.id}>
                  <AuditRow entry={entry} />
                </StaggerItem>
              ))}
            </Stagger>
          </section>
        ) : (
          <Empty className="border-line rounded-2xl border">
            <EmptyTitle>No audits yet</EmptyTitle>
            <EmptyDescription>
              Run one to get your score, technical issues, competitors and keyword gaps.
            </EmptyDescription>
          </Empty>
        )}
      </main>
    </>
  );
}

const STATUS_TONE = {
  COMPLETED: "success",
  FAILED: "critical",
  RUNNING: "info",
  QUEUED: "neutral",
} as const;

function AuditRow({ entry }: { entry: AuditHistoryEntry }) {
  const isDone = entry.status === "COMPLETED";

  return (
    <div className="border-line-soft grid gap-2 border-b py-3.5 lg:grid-cols-[minmax(0,1fr)_90px_90px_100px_110px] lg:items-center lg:gap-4">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-ink-900 text-base font-medium">
            {formatDateTime(entry.createdAt)}
          </span>
          {!isDone ? (
            <Badge tone={STATUS_TONE[entry.status]}>{entry.status.toLowerCase()}</Badge>
          ) : null}
        </div>
        {entry.status === "FAILED" && entry.summary ? (
          <p className="text-critical mt-0.5 line-clamp-1 text-xs">{entry.summary}</p>
        ) : null}
      </div>

      <div className="flex items-baseline gap-1.5">
        <span className="text-ink-300 text-xs lg:hidden">Score</span>
        <span className="text-ink-900 text-base font-medium tabular-nums">
          {entry.score ?? "—"}
        </span>
        {entry.scoreChange !== null && entry.scoreChange !== 0 ? (
          <span
            className={cn(
              "text-xs-plus tabular-nums",
              entry.scoreChange > 0 ? "text-success-strong" : "text-critical",
            )}
          >
            {entry.scoreChange > 0 ? "+" : ""}
            {entry.scoreChange}
          </span>
        ) : null}
      </div>

      <div className="text-ink-500 text-sm tabular-nums">
        <span className="text-ink-300 mr-1.5 text-xs lg:hidden">Issues</span>
        {isDone ? entry.issueCount : "—"}
      </div>

      <div className="text-ink-500 text-sm tabular-nums">
        <span className="text-ink-300 mr-1.5 text-xs lg:hidden">Pages</span>
        {isDone ? entry.pagesCrawled : "—"}
      </div>

      <div className="lg:text-right">
        {isDone ? (
          <Link href={`/audit/${entry.publicId}`} className="text-ink-500 text-sm">
            View
          </Link>
        ) : null}
      </div>
    </div>
  );
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
