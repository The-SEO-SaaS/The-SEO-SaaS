"use client";

import { Button } from "@theseosaas/ui/components/button";
import { Empty, EmptyDescription, EmptyTitle } from "@theseosaas/ui/components/empty";
import { IconTile } from "@theseosaas/ui/components/icon-tile";
import { Input } from "@theseosaas/ui/components/input";
import { FadeIn } from "@theseosaas/ui/components/motion";
import { cn } from "@theseosaas/ui/lib/utils";
import { AlertTriangle, ExternalLink, Plus, Search, Trash2, X } from "lucide-react";
import Link from "next/link";
import * as React from "react";

import { PageHeader } from "@/components/dashboard/page-header";
import { RankSparkline } from "@/components/dashboard/rank-sparkline";
import { useCompetitors } from "@/hooks/use-competitors";
import { useSites } from "@/hooks/use-sites";
import type { CompetitorStanding, MatrixRow } from "@/lib/api";

/**
 * Competitors: the design's full-bleed rival strip over a shared-keyword
 * matrix.
 *
 * The matrix is real data at no extra cost — the daily rank sweep already
 * fetches the whole SERP for each tracked keyword, so every rival's position
 * is in that same response.
 *
 * Two things the design shows that aren't here, both because there's nothing
 * true to put in them (HANDOVER.md, "Missing data the design assumes"):
 *
 *  - Each rival's 0–100 SCORE. We never crawl competitor sites. The cell keeps
 *    its 32px figure slot but fills it with how many of your shared terms they
 *    currently beat you on, which the rank sweep does measure.
 *  - "What they shipped this month". That needs recurring crawls of each
 *    rival's site — its own pipeline and its own per-rival cost. Deferred
 *    rather than stubbed with plausible-looking rows.
 *
 * Responsive: the design is desktop-only. The rival strip goes 1-up then 2-up
 * before reaching its 4 columns, and the matrix scrolls horizontally below
 * `sm` rather than crushing a column per rival onto a phone.
 */
export function CompetitorsView({ projectId }: { projectId: string }) {
  const flow = useCompetitors(projectId);
  // The top bar's breadcrumb shows which site these belong to.
  const { sites } = useSites();
  const siteDomain = sites.find((entry) => entry.id === projectId)?.domain ?? null;
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
        section="Competitors"
        current={siteDomain}
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

      {showAdd ? (
        <FadeIn className="space-y-3 border-b border-[#EDEFF3] bg-[#FAFAFB] px-4 py-4 sm:px-6 lg:px-9">
          <label
            htmlFor="competitor-domain"
            className="block text-[13px] font-medium text-[#3F4854]"
          >
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
            <div className="border-critical/20 bg-critical/5 text-critical-strong rounded-lg border px-3 py-2 text-[13px]">
              {flow.addError}
            </div>
          ) : null}

          <p className="text-[11.5px] leading-relaxed text-[#6B7480]">
            Their positions come from the keyword checks you already run, so they&apos;ll fill in
            on tomorrow&apos;s sweep — no extra cost.
          </p>
        </FadeIn>
      ) : null}

      {competitors.length === 0 ? (
        <main className="flex flex-1 flex-col px-4 py-8 sm:px-6 lg:px-9">
          <Empty className="rounded-2xl border border-[#E2E6EC]">
            <EmptyTitle>No competitors tracked</EmptyTitle>
            <EmptyDescription>
              Add the rivals you keep losing traffic to and we&apos;ll compare positions on every
              keyword you track.
            </EmptyDescription>
          </Empty>
        </main>
      ) : (
        <>
          {/* Full-bleed hairline strip — 1px gaps over #EDEFF3, exactly as the
              figures strip on the dashboard. */}
          <div className="grid gap-px border-b border-[#EDEFF3] bg-[#EDEFF3] sm:grid-cols-2 xl:grid-cols-4">
            {competitors.map((competitor) => (
              <RivalCell
                key={competitor.id}
                competitor={competitor}
                onRemove={() => flow.removeCompetitor(competitor.id)}
                isRemoving={flow.isRemoving}
              />
            ))}
          </div>

          <main className="flex flex-1 flex-col px-4 pt-6 pb-10 sm:px-6 lg:px-9 lg:pt-[30px] lg:pb-14">
            {flow.removeError ? (
              <div className="border-critical/20 bg-critical/5 text-critical-strong mb-6 rounded-lg border px-3.5 py-2.5 text-[13px]">
                {flow.removeError}
              </div>
            ) : null}

            <MatrixSection
              matrix={matrix}
              competitors={competitors}
              isAwaitingFirstCheck={isAwaitingFirstCheck}
              projectId={projectId}
            />

            {!quota.canAdd ? (
              <div className="mt-8 flex flex-wrap items-center justify-between gap-x-5 gap-y-3 rounded-xl border border-[#FCD9B6] bg-[#FFFBF6] px-[18px] py-4">
                <p className="text-[13px] leading-[1.55] text-[#7C3D12]">
                  You&apos;re tracking all {quota.limit} competitors your plan allows for this
                  site.
                </p>
                <Link
                  href="/dashboard/settings"
                  className="text-[13px] font-medium whitespace-nowrap text-[#EA580C]"
                >
                  See plans
                </Link>
              </div>
            ) : null}
          </main>
        </>
      )}
    </>
  );
}

function RivalCell({
  competitor,
  onRemove,
  isRemoving,
}: {
  competitor: CompetitorStanding;
  onRemove: () => void;
  isRemoving: boolean;
}) {
  const total = competitor.beatingUsOn + competitor.losingToUsOn;
  const isThreat = total > 0 && competitor.beatingUsOn > competitor.losingToUsOn;

  return (
    <div className="group min-w-0 bg-white px-4 py-5 sm:px-[26px] sm:py-6">
      <div className="flex items-center gap-2">
        <span
          className="h-[7px] w-[7px] shrink-0 rounded-full"
          style={{ background: isThreat ? "#EA580C" : "#16A34A" }}
        />
        <span className="truncate text-[13px] font-semibold text-[#0B1220]">
          {competitor.domain}
        </span>
        {competitor.isPending ? (
          <span className="text-[11px] whitespace-nowrap text-[#6B7480]">pending</span>
        ) : (
          <span className="text-[11px] whitespace-nowrap text-[#6B7480]">
            {isThreat ? "outranks you" : "behind you"}
          </span>
        )}

        <button
          type="button"
          onClick={onRemove}
          disabled={isRemoving}
          aria-label={`Remove ${competitor.domain}`}
          className="ml-auto text-[#9AA2AE] opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 disabled:opacity-40"
        >
          <Trash2 className="size-3.5" />
        </button>
      </div>

      {competitor.isPending ? (
        <p className="mt-3.5 text-[12px] leading-[1.55] text-[#5B6472]">
          Waiting on the first rank check — positions appear after tonight&apos;s sweep.
        </p>
      ) : (
        <>
          {/* The design's 32px figure is a whole-site score. We don't crawl
              rival sites, so this is their visibility across *your* tracked
              terms — coverage weighted by rank quality, from the sweep we
              already run. Labelled "visibility", not "score". */}
          <div
            className="mt-3.5 flex items-baseline gap-2"
            title="How visible they are across your tracked keywords, weighted by position. Not a score for their whole site."
          >
            <span className="text-[32px] leading-none font-medium tracking-[-0.03em] text-[#0B1220]">
              {competitor.visibilityScore ?? "—"}
            </span>
            <span className="text-[12.5px] text-[#6B7480]">visibility</span>
          </div>

          <div className="mt-1.5 text-[12px] text-[#6B7480]">
            Ahead of you on {competitor.beatingUsOn} of {total} shared term
            {total === 1 ? "" : "s"}
          </div>

          {competitor.trend.length >= 2 ? (
            <RankSparkline
              positions={competitor.trend}
              width={120}
              height={26}
              className="mt-3.5 w-full max-w-[170px]"
            />
          ) : null}

          <p className="mt-3.5 text-[12px] leading-[1.55] text-[#5B6472]">
            {competitor.notes ??
              (competitor.averagePosition !== null
                ? `Average position ${competitor.averagePosition}${
                    competitor.bestPosition !== null ? `, best #${competitor.bestPosition}` : ""
                  }.`
                : "No positions recorded yet.")}
          </p>

          {competitor.bestPage ? (
            <a
              href={competitor.bestPage.url}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="mt-2.5 flex items-start gap-1.5 text-[12px] text-[#6B7480]"
            >
              <span className="line-clamp-2">{competitor.bestPage.title}</span>
              <ExternalLink className="mt-0.5 size-3 shrink-0" />
            </a>
          ) : null}
        </>
      )}
    </div>
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
  const heading = (
    <div className="text-[11px] font-semibold tracking-[0.1em] text-[#6B7480] uppercase">
      Shared keywords · who owns them
    </div>
  );

  if (matrix.length === 0) {
    return (
      <section>
        {heading}
        <Empty className="mt-4 rounded-2xl border border-[#E2E6EC]">
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
        {heading}
        <Empty className="mt-4 rounded-2xl border border-[#E2E6EC]">
          <EmptyTitle>First rank check is still pending</EmptyTitle>
          <EmptyDescription>
            We check every tracked keyword daily. Once the first sweep runs, this fills in with
            your position against each rival.
          </EmptyDescription>
        </Empty>
      </section>
    );
  }

  // minmax(0,1fr) then 78px per column, per the design.
  const columns = `minmax(0,1fr) repeat(${competitors.length + 1}, 78px)`;

  return (
    <section>
      <div className="flex items-baseline justify-between gap-4">
        {heading}
        <span className="text-[12.5px] text-[#6B7480]">Shaded cell marks the best position</span>
      </div>

      {/* Horizontal scroll below sm: a column per rival plus the term can't
          compress onto a phone without becoming unreadable. */}
      <div className="-mx-4 mt-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <div className="min-w-[560px]">
          <div
            className="grid gap-3.5 border-b border-[#DFE3EA] px-1 pb-2.5"
            style={{ gridTemplateColumns: columns }}
          >
            <div className="text-[11px] font-semibold tracking-[0.08em] text-[#6B7480] uppercase">
              Keyword
            </div>
            <div className="text-center text-[11px] font-semibold tracking-[0.08em] text-[#0B1220] uppercase">
              You
            </div>
            {competitors.map((competitor) => (
              <div
                key={competitor.id}
                className="truncate text-center text-[11px] font-semibold tracking-[0.08em] text-[#6B7480] uppercase"
                title={competitor.domain}
              >
                {competitor.domain.split(".")[0]}
              </div>
            ))}
          </div>

          {matrix.map((row) => (
            <div
              key={row.keywordId}
              className="grid items-center gap-3.5 border-b border-[#F3F5F8] px-1 py-3"
              style={{ gridTemplateColumns: columns }}
            >
              <div className="truncate text-[13.5px] font-medium text-[#0B1220]">{row.term}</div>

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
        "rounded-[6px] py-1.5 text-center text-[13.5px] tabular-nums",
        isLeader && isOwn && "bg-[#F0FDF4] font-semibold text-[#15803D]",
        isLeader && !isOwn && "bg-[#FFF6EE] font-semibold text-[#EA580C]",
        !isLeader && position !== null && "text-[#3F4854]",
        position === null && "text-[#9AA2AE]",
      )}
    >
      {position ?? "—"}
    </div>
  );
}
