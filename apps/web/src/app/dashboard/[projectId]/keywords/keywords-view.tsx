"use client";

import { Badge } from "@theseosaas/ui/components/badge";
import { Button } from "@theseosaas/ui/components/button";
import { Empty, EmptyDescription, EmptyTitle } from "@theseosaas/ui/components/empty";
import { IconTile } from "@theseosaas/ui/components/icon-tile";
import { Input } from "@theseosaas/ui/components/input";
import { FadeIn, Stagger, StaggerItem } from "@theseosaas/ui/components/motion";
import { cn } from "@theseosaas/ui/lib/utils";
import { AlertTriangle, Plus, Search, Trash2, X } from "lucide-react";
import Link from "next/link";
import * as React from "react";

import { PageHeader } from "@/components/dashboard/page-header";
import { PositionCell, RankSparkline } from "@/components/dashboard/rank-sparkline";
import { useKeywords } from "@/hooks/use-keywords";
import { useSites } from "@/hooks/use-sites";
import type { KeywordIntent, KeywordRow } from "@/lib/api";

/**
 * Keywords management.
 *
 * The design's table carried VOLUME and DIFFICULTY columns. Both are gone:
 * Serpex returns SERP results, not volume or difficulty data, and a
 * confident-looking fabricated number is worse than an absent column when
 * someone's deciding what to write next. What's left is everything we can
 * state truthfully — where you rank, which way it's moving, and why the term
 * was suggested.
 */
const INTENT_LABEL: Record<KeywordIntent, string> = {
  TRANSACTIONAL: "Ready to buy",
  COMMERCIAL: "Comparing",
  INFORMATIONAL: "Learning",
  NAVIGATIONAL: "Brand",
};

const INTENT_TONE: Record<KeywordIntent, "opportunity" | "info" | "neutral"> = {
  TRANSACTIONAL: "opportunity",
  COMMERCIAL: "opportunity",
  INFORMATIONAL: "info",
  NAVIGATIONAL: "neutral",
};

type IntentFilter = KeywordIntent | "ALL";

export function KeywordsView({ projectId }: { projectId: string }) {
  const flow = useKeywords(projectId);
  // The top bar's breadcrumb shows which site these belong to.
  const { sites } = useSites();
  const siteDomain = sites.find((entry) => entry.id === projectId)?.domain ?? null;
  const [query, setQuery] = React.useState("");
  const [intentFilter, setIntentFilter] = React.useState<IntentFilter>("ALL");
  const [newTerms, setNewTerms] = React.useState("");
  const [showAdd, setShowAdd] = React.useState(false);

  const payload = flow.payload;

  const visible = React.useMemo(() => {
    if (!payload) return [];
    const needle = query.trim().toLowerCase();

    return payload.keywords.filter((keyword) => {
      if (intentFilter !== "ALL" && keyword.intent !== intentFilter) return false;
      if (needle && !keyword.term.toLowerCase().includes(needle)) return false;
      return true;
    });
  }, [payload, query, intentFilter]);

  if (flow.isLoading && !payload) {
    return (
      <main className="flex flex-1 items-center justify-center px-4 py-16">
        <IconTile tone="ink" size="xl" className="animate-pulse">
          <Search />
        </IconTile>
        <span className="sr-only">Loading keywords</span>
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
            We couldn&apos;t load your keywords
          </h1>
          <p className="text-ink-400 text-base leading-relaxed">
            {flow.errorMessage ?? "Please try again in a moment."}
          </p>
          <Button onClick={flow.refetch}>Try again</Button>
        </div>
      </main>
    );
  }

  const { summary, quota, gaps } = payload;

  const submitNewTerms = async () => {
    // One per line, so pasting a list from a spreadsheet just works.
    const terms = newTerms
      .split(/[\n,]/)
      .map((term) => term.trim())
      .filter(Boolean);

    if (terms.length === 0) return;

    const result = await flow.addKeywords({ terms });
    if (result) {
      setNewTerms("");
      setShowAdd(false);
    }
  };

  return (
    <>
      <PageHeader
        section="Keywords"
        current={siteDomain}
        meta={`${quota.used} of ${quota.limit} tracked`}
        action={
          <Button size="sm" onClick={() => setShowAdd((open) => !open)}>
            {showAdd ? <X /> : <Plus />}
            {showAdd ? "Cancel" : "Add keywords"}
          </Button>
        }
      />

      <main className="flex flex-1 flex-col gap-6 px-4 py-6 sm:px-6 lg:px-10">
        {showAdd ? (
          <FadeIn className="border-line bg-surface-sunken space-y-3 rounded-xl border p-4">
            <label htmlFor="new-terms" className="text-ink-700 block text-sm font-medium">
              One keyword per line
            </label>
            <textarea
              id="new-terms"
              autoFocus
              rows={3}
              value={newTerms}
              onChange={(event) => setNewTerms(event.target.value)}
              placeholder={"best crm for startups\nhubspot alternative"}
              className="bg-surface border-line text-ink-900 placeholder:text-ink-300 focus-visible:border-ink-900 focus-visible:ring-ring/10 w-full resize-y rounded-lg border px-3 py-2.5 text-base outline-none focus-visible:ring-2"
            />

            {flow.addError ? (
              <div className="border-critical/20 bg-critical/5 text-critical-strong rounded-lg border px-3 py-2 text-sm">
                {flow.addError}
              </div>
            ) : null}

            <div className="flex items-center gap-2">
              <Button size="sm" onClick={submitNewTerms} disabled={flow.isAdding}>
                {flow.isAdding ? "Adding…" : "Add and check ranks"}
              </Button>
              <span className="text-ink-300 text-xs">
                We check each one straight away, so positions appear within seconds.
              </span>
            </div>
          </FadeIn>
        ) : null}

        {/* Toolbar */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative sm:max-w-xs sm:flex-1">
            <Search className="text-ink-300 pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2" />
            <Input
              size="sm"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={`Search ${payload.keywords.length} keywords`}
              className="pl-8"
            />
          </div>

          <div className="flex flex-wrap gap-1.5">
            {(["ALL", "TRANSACTIONAL", "COMMERCIAL", "INFORMATIONAL", "NAVIGATIONAL"] as const).map(
              (option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setIntentFilter(option)}
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs-plus font-medium transition-colors",
                    intentFilter === option
                      ? "border-ink-900 bg-ink-900 text-white"
                      : "border-line text-ink-400 hover:border-line-strong",
                  )}
                >
                  {option === "ALL" ? "All" : INTENT_LABEL[option]}
                </button>
              ),
            )}
          </div>
        </div>

        {/* Inline summary */}
        <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2">
          <SummaryFigure value={summary.tracked} label="tracked" />
          <SummaryFigure value={summary.ranking} label="ranking" />
          <SummaryFigure value={summary.topTen} label="in the top 10" tone="success" />
          <SummaryFigure value={summary.notRanking} label="not ranking yet" tone="muted" />
        </div>

        {/* Table */}
        {visible.length > 0 ? (
          <KeywordTable
            rows={visible}
            onToggleTracked={flow.setTracked}
            onRemove={flow.removeKeyword}
            isBusy={flow.isUpdatingTracked || flow.isRemoving}
          />
        ) : (
          <Empty className="border-line rounded-2xl border">
            <EmptyTitle>
              {payload.keywords.length === 0 ? "No keywords yet" : "Nothing matches that filter"}
            </EmptyTitle>
            <EmptyDescription>
              {payload.keywords.length === 0
                ? "Add the terms your buyers search for, or adopt one of the gaps below."
                : "Try a different search or intent filter."}
            </EmptyDescription>
          </Empty>
        )}

        {(flow.trackedError || flow.removeError) ? (
          <div className="border-critical/20 bg-critical/5 text-critical-strong rounded-lg border px-3.5 py-2.5 text-sm">
            {flow.trackedError ?? flow.removeError}
          </div>
        ) : null}

        {/* Gaps */}
        {gaps.length > 0 ? (
          <GapsSection
            gaps={gaps}
            onTrack={(term) => flow.trackGaps([term])}
            isTracking={flow.isTrackingGaps}
            error={flow.gapsError}
          />
        ) : null}

        {/* Tracking limit */}
        {!quota.canAdd ? (
          <div className="border-opportunity-line bg-opportunity-surface flex flex-col gap-3 rounded-xl border px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-opportunity-strong text-sm leading-relaxed">
              You&apos;re tracking all {quota.limit} keywords your plan allows. Untrack one to
              make room, or upgrade for more.
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

function SummaryFigure({
  value,
  label,
  tone = "default",
}: {
  value: number;
  label: string;
  tone?: "default" | "success" | "muted";
}) {
  return (
    <span className="flex items-baseline gap-1.5">
      <span
        className={cn(
          "font-display text-base font-semibold tabular-nums",
          tone === "success" && "text-success-strong",
          tone === "muted" && "text-ink-300",
          tone === "default" && "text-ink-900",
        )}
      >
        {value}
      </span>
      <span className="text-ink-400 text-sm">{label}</span>
    </span>
  );
}

function KeywordTable({
  rows,
  onToggleTracked,
  onRemove,
  isBusy,
}: {
  rows: KeywordRow[];
  onToggleTracked: (keywordId: string, isTracked: boolean) => void;
  onRemove: (keywordId: string) => void;
  isBusy: boolean;
}) {
  return (
    <div>
      {/* Desktop header. Hidden on mobile, where rows become stacked cards. */}
      <div className="border-line-strong text-ink-400 hidden grid-cols-[minmax(0,1fr)_120px_140px_90px_90px] gap-4 border-b pb-2.5 lg:grid">
        <div className="eyebrow">Keyword</div>
        <div className="eyebrow">Position</div>
        <div className="eyebrow">Intent</div>
        <div className="eyebrow">Trend</div>
        <div className="eyebrow text-right">Actions</div>
      </div>

      <Stagger className="flex flex-col" whenInView={false}>
        {rows.map((row) => (
          <StaggerItem key={row.id}>
            <div
              className={cn(
                "border-line-soft grid gap-3 border-b py-3.5 lg:grid-cols-[minmax(0,1fr)_120px_140px_90px_90px] lg:items-center lg:gap-4",
                !row.isTracked && "opacity-60",
              )}
            >
              <div className="min-w-0">
                <div className="text-ink-900 flex items-center gap-2 text-base font-medium">
                  <span className="truncate">{row.term}</span>
                  {!row.isTracked ? <Badge tone="neutral">Paused</Badge> : null}
                </div>
                {row.rationale ? (
                  <p className="text-ink-400 mt-0.5 line-clamp-1 text-xs">{row.rationale}</p>
                ) : row.url ? (
                  <p className="text-ink-300 mt-0.5 truncate text-xs">{row.url}</p>
                ) : null}
              </div>

              <div className="flex items-center gap-2 lg:block">
                <span className="text-ink-300 text-xs lg:hidden">Position</span>
                <PositionCell
                  position={row.position}
                  change={row.change}
                  isPending={row.isPending}
                />
              </div>

              <div>
                <Badge tone={INTENT_TONE[row.intent]} shape="pill">
                  {INTENT_LABEL[row.intent]}
                </Badge>
              </div>

              <div className="hidden lg:block">
                <RankSparkline positions={row.trend} />
              </div>

              <div className="flex items-center gap-1 lg:justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={isBusy}
                  onClick={() => onToggleTracked(row.id, !row.isTracked)}
                >
                  {row.isTracked ? "Pause" : "Track"}
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  disabled={isBusy}
                  onClick={() => onRemove(row.id)}
                  aria-label={`Remove ${row.term}`}
                >
                  <Trash2 />
                </Button>
              </div>
            </div>
          </StaggerItem>
        ))}
      </Stagger>
    </div>
  );
}

function GapsSection({
  gaps,
  onTrack,
  isTracking,
  error,
}: {
  gaps: { term: string; intent: KeywordIntent; rationale: string | null }[];
  onTrack: (term: string) => void;
  isTracking: boolean;
  error: string | null;
}) {
  return (
    <section>
      <div className="border-line-strong flex items-baseline justify-between gap-4 border-b pb-2.5">
        <div className="eyebrow text-ink-300">Gaps · {gaps.length} found</div>
        <span className="text-ink-300 text-xs">Terms your audit found that you aren&apos;t tracking</span>
      </div>

      {error ? (
        <div className="border-critical/20 bg-critical/5 text-critical-strong mt-3 rounded-lg border px-3.5 py-2.5 text-sm">
          {error}
        </div>
      ) : null}

      <div className="flex flex-col">
        {gaps.slice(0, 20).map((gap) => (
          <div
            key={gap.term}
            className="border-line-soft flex flex-col gap-2 border-b py-3.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
          >
            <div className="min-w-0">
              <div className="text-ink-900 text-base font-medium">{gap.term}</div>
              {gap.rationale ? (
                <p className="text-ink-400 mt-0.5 text-xs leading-relaxed">{gap.rationale}</p>
              ) : null}
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <Badge tone={INTENT_TONE[gap.intent]} shape="pill">
                {INTENT_LABEL[gap.intent]}
              </Badge>
              <Button
                size="sm"
                variant="outline"
                disabled={isTracking}
                onClick={() => onTrack(gap.term)}
              >
                Track
              </Button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
