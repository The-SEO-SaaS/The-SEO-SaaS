"use client";

import { Button } from "@theseosaas/ui/components/button";
import { Card, CardContent } from "@theseosaas/ui/components/card";
import { Empty, EmptyDescription, EmptyTitle } from "@theseosaas/ui/components/empty";
import { IconTile } from "@theseosaas/ui/components/icon-tile";
import { Input } from "@theseosaas/ui/components/input";
import { FadeIn, Stagger, StaggerItem } from "@theseosaas/ui/components/motion";
import { cn } from "@theseosaas/ui/lib/utils";
import { AlertTriangle, ExternalLink, Plus, Search, Trash2, X } from "lucide-react";
import Link from "next/link";
import * as React from "react";

import { PageHeader } from "@/components/dashboard/page-header";
import { RankSparkline } from "@/components/dashboard/rank-sparkline";
import { useCompetitors } from "@/hooks/use-competitors";
import type { CompetitorStanding, MatrixRow } from "@/lib/api";

/**
 * Competitors: head-to-head standings plus a shared-keyword matrix.
 *
 * The matrix is real data at no extra cost — the daily rank sweep already
 * fetches the whole SERP for each tracked keyword, so every rival's position
 * is in that same response.
 *
 * The design's "what they shipped this month" change log is deliberately
 * absent: it needs recurring crawls of each rival's site, which is its own
 * pipeline and its own per-rival cost. Deferred rather than stubbed with
 * plausible-looking rows.
 */
export function CompetitorsView({ projectId }: { projectId: string }) {
  const flow = useCompetitors(projectId);
  const [showAdd, setShowAdd] = React.useState(false);
  const [domain, setDomain] = React.useState("");

  const payload = flow.payload;

  if (flow.isLoading && !payload) {
    return (
      <main className="flex flex-1 items-center justify-center px-4 py-16">
        <IconTile tone="ink" size="xl" className="animate-pulse">
          <Search />
        </IconTile>
        <span className="sr-only">Loading competitors</span>
      </main>
    );
  }

  if (flow.isError || !payload) {
    return (
      <main className="flex flex-1 items-center justify-center px-4 py-16">
        <div className="w-full max-w-md space-y-4 text-center">
          <IconTile tone="critical" size="xl" className="mx-auto">
            <AlertTriangle />
          </IconTile>
          <h1 className="font-display text-ink-900 text-2xl font-semibold">
            We couldn&apos;t load your competitors
          </h1>
          <p className="text-ink-400 text-base leading-relaxed">
            {flow.errorMessage ?? "Please try again in a moment."}
          </p>
          <Button onClick={flow.refetch}>Try again</Button>
        </div>
      </main>
    );
  }

  const { competitors, matrix, quota, isAwaitingFirstCheck } = payload;

  const submit = async () => {
    if (!domain.trim()) return;
    const result = await flow.addCompetitor({ domain: domain.trim() });
    if (result) {
      setDomain("");
      setShowAdd(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Competitors"
        meta={`${quota.used} of ${quota.limit} tracked · refreshed daily`}
        action={
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowAdd((open) => !open)}
            disabled={!quota.canAdd && !showAdd}
          >
            {showAdd ? <X /> : <Plus />}
            {showAdd ? "Cancel" : "Add competitor"}
          </Button>
        }
      />

      <main className="flex flex-1 flex-col gap-8 px-4 py-6 sm:px-6 lg:px-10">
        {showAdd ? (
          <FadeIn className="border-line bg-surface-sunken space-y-3 rounded-xl border p-4">
            <label htmlFor="competitor-domain" className="text-ink-700 block text-sm font-medium">
              Competitor domain
            </label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                id="competitor-domain"
                autoFocus
                value={domain}
                onChange={(event) => setDomain(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") void submit();
                }}
                placeholder="rival.com"
                spellCheck={false}
                inputMode="url"
                className="sm:max-w-xs"
              />
              <Button onClick={submit} disabled={!domain.trim() || flow.isAdding}>
                {flow.isAdding ? "Adding…" : "Add"}
              </Button>
            </div>

            {flow.addError ? (
              <div className="border-critical/20 bg-critical/5 text-critical-strong rounded-lg border px-3 py-2 text-sm">
                {flow.addError}
              </div>
            ) : null}

            <p className="text-ink-300 text-xs leading-relaxed">
              Their positions come from the keyword checks you already run, so they&apos;ll fill
              in on tomorrow&apos;s sweep — no extra cost.
            </p>
          </FadeIn>
        ) : null}

        {competitors.length === 0 ? (
          <Empty className="border-line rounded-2xl border">
            <EmptyTitle>No competitors tracked</EmptyTitle>
            <EmptyDescription>
              Add the rivals you keep losing traffic to and we&apos;ll compare positions on every
              keyword you track.
            </EmptyDescription>
          </Empty>
        ) : (
          <>
            <Stagger className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3" whenInView={false}>
              {competitors.map((competitor) => (
                <StaggerItem key={competitor.id} className="h-full">
                  <RivalCard
                    competitor={competitor}
                    onRemove={() => flow.removeCompetitor(competitor.id)}
                    isRemoving={flow.isRemoving}
                  />
                </StaggerItem>
              ))}
            </Stagger>

            {flow.removeError ? (
              <div className="border-critical/20 bg-critical/5 text-critical-strong rounded-lg border px-3.5 py-2.5 text-sm">
                {flow.removeError}
              </div>
            ) : null}

            <MatrixSection
              matrix={matrix}
              competitors={competitors}
              isAwaitingFirstCheck={isAwaitingFirstCheck}
              projectId={projectId}
            />
          </>
        )}

        {!quota.canAdd && competitors.length > 0 ? (
          <div className="border-opportunity-line bg-opportunity-surface flex flex-col gap-3 rounded-xl border px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-opportunity-strong text-sm leading-relaxed">
              You&apos;re tracking all {quota.limit} competitors your plan allows for this site.
            </p>
            <Button size="sm" variant="outline" render={<Link href="/dashboard/settings" />}>
              See plans
            </Button>
          </div>
        ) : null}
      </main>
    </>
  );
}

function RivalCard({
  competitor,
  onRemove,
  isRemoving,
}: {
  competitor: CompetitorStanding;
  onRemove: () => void;
  isRemoving: boolean;
}) {
  const total = competitor.beatingUsOn + competitor.losingToUsOn;
  const aheadPct = total > 0 ? (competitor.beatingUsOn / total) * 100 : 0;

  return (
    <Card variant="panel" className="h-full">
      <CardContent className="flex h-full flex-col gap-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="text-ink-900 truncate text-base font-semibold">
              {competitor.name ?? competitor.domain}
            </div>
            <div className="text-ink-300 truncate text-xs">{competitor.domain}</div>
          </div>

          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onRemove}
            disabled={isRemoving}
            aria-label={`Remove ${competitor.domain}`}
          >
            <Trash2 />
          </Button>
        </div>

        {competitor.isPending ? (
          <p className="text-ink-300 text-sm leading-relaxed">
            Waiting on the first rank check — positions appear after tonight&apos;s sweep.
          </p>
        ) : (
          <>
            <div className="flex items-baseline gap-2">
              <span className="font-display text-ink-900 text-3xl font-semibold tabular-nums">
                {competitor.beatingUsOn}
              </span>
              <span className="text-ink-400 text-sm">
                {competitor.beatingUsOn === 1 ? "term ahead of you" : "terms ahead of you"}
              </span>
            </div>

            <div className="space-y-1.5">
              <div className="bg-surface-sunken h-[3px] overflow-hidden rounded-full">
                <div
                  className={cn("h-full", aheadPct > 50 ? "bg-critical" : "bg-success")}
                  style={{ width: `${aheadPct}%` }}
                />
              </div>
              <p className="text-ink-300 text-xs">
                You lead on {competitor.losingToUsOn} of {total} shared terms
              </p>
            </div>

            {competitor.trend.length >= 2 ? (
              <RankSparkline positions={competitor.trend} width={140} height={26} />
            ) : null}

            {competitor.averagePosition !== null ? (
              <p className="text-ink-400 text-sm leading-relaxed">
                Average position {competitor.averagePosition}
                {competitor.bestPosition !== null ? `, best #${competitor.bestPosition}` : null}.
              </p>
            ) : null}
          </>
        )}

        {competitor.notes ? (
          <p className="text-ink-400 text-sm leading-relaxed">{competitor.notes}</p>
        ) : null}

        {competitor.bestPage ? (
          <a
            href={competitor.bestPage.url}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="text-ink-500 mt-auto flex items-start gap-1.5 text-sm"
          >
            <span className="line-clamp-2">{competitor.bestPage.title}</span>
            <ExternalLink className="mt-0.5 size-3 shrink-0" />
          </a>
        ) : null}
      </CardContent>
    </Card>
  );
}

function MatrixSection({
  matrix,
  competitors,
  isAwaitingFirstCheck,
  projectId,
}: {
  matrix: MatrixRow[];
  competitors: CompetitorStanding[];
  isAwaitingFirstCheck: boolean;
  projectId: string;
}) {
  if (matrix.length === 0) {
    return (
      <section>
        <div className="eyebrow text-ink-300">Shared keywords</div>
        <Empty className="border-line mt-4 rounded-2xl border">
          <EmptyTitle>No tracked keywords yet</EmptyTitle>
          <EmptyDescription>
            The comparison is built from the keywords you track. Add some to see who holds each
            term.
          </EmptyDescription>
          <Button
            size="sm"
            className="mt-2"
            render={<Link href={`/dashboard/${projectId}/keywords`} />}
          >
            Add keywords
          </Button>
        </Empty>
      </section>
    );
  }

  if (isAwaitingFirstCheck) {
    return (
      <section>
        <div className="eyebrow text-ink-300">Shared keywords</div>
        <Empty className="border-line mt-4 rounded-2xl border">
          <EmptyTitle>First rank check is still pending</EmptyTitle>
          <EmptyDescription>
            We check every tracked keyword daily. Once the first sweep runs, this fills in with
            your position against each rival.
          </EmptyDescription>
        </Empty>
      </section>
    );
  }

  return (
    <section>
      <div className="flex items-baseline justify-between gap-4">
        <div className="eyebrow text-ink-300">Shared keywords · who owns them</div>
        <span className="text-ink-300 text-xs">Shaded cell marks the best position</span>
      </div>

      {/* Horizontal scroll below xl: a column per rival plus the term can't
          compress onto a phone without becoming unreadable. */}
      <div className="mt-4 -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <div className="min-w-[560px]">
          <div
            className="border-line-strong text-ink-400 grid gap-3 border-b pb-2.5"
            style={{ gridTemplateColumns: `minmax(0,1fr) repeat(${competitors.length + 1}, 72px)` }}
          >
            <div className="eyebrow">Keyword</div>
            <div className="eyebrow text-ink-900 text-center">You</div>
            {competitors.map((competitor) => (
              <div key={competitor.id} className="eyebrow truncate text-center">
                {competitor.domain.split(".")[0]}
              </div>
            ))}
          </div>

          {matrix.map((row) => (
            <div
              key={row.keywordId}
              className="border-line-soft grid items-center gap-3 border-b py-2.5"
              style={{
                gridTemplateColumns: `minmax(0,1fr) repeat(${competitors.length + 1}, 72px)`,
              }}
            >
              <div className="text-ink-900 truncate text-sm font-medium">{row.term}</div>

              <MatrixCell position={row.own} isLeader={row.leader === "own"} isOwn />

              {competitors.map((competitor) => (
                <MatrixCell
                  key={competitor.id}
                  position={row.byCompetitor[competitor.id] ?? null}
                  isLeader={row.leader === competitor.id}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function MatrixCell({
  position,
  isLeader,
  isOwn = false,
}: {
  position: number | null;
  isLeader: boolean;
  isOwn?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-md py-1.5 text-center text-sm tabular-nums",
        isLeader && isOwn && "bg-success-surface text-success-strong font-semibold",
        isLeader && !isOwn && "bg-opportunity-surface text-opportunity font-semibold",
        !isLeader && position !== null && "text-ink-500",
        position === null && "text-ink-300",
      )}
    >
      {position ?? "—"}
    </div>
  );
}
