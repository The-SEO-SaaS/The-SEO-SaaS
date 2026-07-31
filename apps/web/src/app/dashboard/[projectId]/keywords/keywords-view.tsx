"use client";

import { Button } from "@theseosaas/ui/components/button";
import { Empty, EmptyDescription, EmptyTitle } from "@theseosaas/ui/components/empty";
import { IconTile } from "@theseosaas/ui/components/icon-tile";
import { FadeIn, Stagger, StaggerItem } from "@theseosaas/ui/components/motion";
import { cn } from "@theseosaas/ui/lib/utils";
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Pause,
  Play,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import Link from "next/link";
import * as React from "react";

import { PageHeader } from "@/components/dashboard/page-header";
import { PositionCell, RankSparkline } from "@/components/dashboard/rank-sparkline";
import { useKeywords } from "@/hooks/use-keywords";
import { useSites } from "@/hooks/use-sites";
import type { KeywordIntent, KeywordRow } from "@/lib/api";

/**
 * Keywords management, built to the design's five-section body: toolbar,
 * inline summary, table, gaps to competitors, tracking limit.
 *
 * The design's table carried VOLUME and DIFFICULTY columns and the gaps table
 * carried VOLUME. All three are gone: Serpex returns SERP results, not volume
 * or difficulty data, and a confident-looking fabricated number is worse than
 * an absent column when someone's deciding what to write next. The remaining
 * columns keep the design's exact widths; the freed space goes to the term,
 * which is the one thing that benefits from it.
 *
 * Responsive: the design is desktop-only. The table header hides below `lg`,
 * where rows become stacked cards.
 */
const INTENT_LABEL: Record<KeywordIntent, string> = {
  TRANSACTIONAL: "Ready to buy",
  COMMERCIAL: "Comparing",
  INFORMATIONAL: "Learning",
  NAVIGATIONAL: "Brand",
};

/**
 * Colour-coded by intent warmth, not just labelled by it.
 *
 * All four used to render in the same two colours (orange twice, then teal,
 * then grey), which meant scanning the term column for "what's actually worth
 * writing about" required reading every pill's text. The scale now runs hot to
 * cold left to right: green for transactional (someone about to buy), amber
 * for commercial (still comparing, still warm), orange for informational
 * (learning — further from a purchase), red for navigational (a brand search,
 * the one intent this page can't really write content to win).
 */
const INTENT_PILL: Record<KeywordIntent, string> = {
  TRANSACTIONAL: "border-[#BBE8CB] bg-[#EAF7EF] text-[#15803D]",
  COMMERCIAL: "border-[#FCE4B0] bg-[#FFF8EA] text-[#B45309]",
  INFORMATIONAL: "border-[#FCD9B6] bg-[#FFF6EE] text-[#EA580C]",
  NAVIGATIONAL: "border-[#F8C9C9] bg-[#FEF2F2] text-[#DC2626]",
};

type IntentFilter = KeywordIntent | "ALL";

const PAGE_SIZE = 12;

export function KeywordsView({ projectId }: { projectId: string }) {
  const flow = useKeywords(projectId);
  // The top bar's breadcrumb shows which site these belong to.
  const { sites } = useSites();
  const siteDomain = sites.find((entry) => entry.id === projectId)?.domain ?? null;
  const [query, setQuery] = React.useState("");
  const [intentFilter, setIntentFilter] = React.useState<IntentFilter>("ALL");
  const [newTerms, setNewTerms] = React.useState("");
  const [showAdd, setShowAdd] = React.useState(false);
  const [page, setPage] = React.useState(0);

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

  // A filter change that shortens the list would otherwise strand the viewer
  // on a page that no longer exists.
  React.useEffect(() => {
    setPage(0);
  }, [query, intentFilter]);

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

  const pageCount = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount - 1);
  const rows = visible.slice(currentPage * PAGE_SIZE, currentPage * PAGE_SIZE + PAGE_SIZE);

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
        meta={`${quota.used} of ${quota.limit} slots used`}
        action={
          <Button size="sm" onClick={() => setShowAdd((open) => !open)}>
            {showAdd ? <X /> : <Plus />}
            {showAdd ? "Cancel" : "Add keywords"}
          </Button>
        }
      />

      <main className="flex flex-1 flex-col px-4 pt-6 pb-10 sm:px-6 lg:px-9 lg:pt-[26px] lg:pb-15">
        {showAdd ? (
          <FadeIn className="mb-6 space-y-3 rounded-xl border border-[#E2E6EC] bg-[#F8F9FA] p-4">
            <label htmlFor="new-terms" className="block text-[13px] font-medium text-[#3F4854]">
              One keyword per line
            </label>
            <textarea
              id="new-terms"
              autoFocus
              rows={3}
              value={newTerms}
              onChange={(event) => setNewTerms(event.target.value)}
              placeholder={"best crm for startups\nhubspot alternative"}
              className="focus-visible:ring-ring/10 w-full resize-y rounded-lg border border-[#DFE3EA] bg-white px-3 py-2.5 text-[13.5px] text-[#0B1220] outline-none placeholder:text-[#9AA2AE] focus-visible:border-[#0B1220] focus-visible:ring-2"
            />

            {flow.addError ? (
              <div className="border-critical/20 bg-critical/5 text-critical-strong rounded-lg border px-3 py-2 text-[13px]">
                {flow.addError}
              </div>
            ) : null}

            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" onClick={submitNewTerms} disabled={flow.isAdding}>
                {flow.isAdding ? "Adding…" : "Add and check ranks"}
              </Button>
              <span className="text-[11.5px] text-[#6B7480]">
                We check each one straight away, so positions appear within seconds.
              </span>
            </div>
          </FadeIn>
        ) : null}

        {/* Toolbar — 240px search box, pill filters, per the design. */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <div className="flex min-w-[240px] items-center gap-[9px] rounded-lg border border-[#DFE3EA] bg-white px-3 py-2">
            <Search className="size-3.5 shrink-0 text-[#6B7480]" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={`Search ${payload.keywords.length} keywords`}
              className="w-full bg-transparent text-[13px] text-[#0B1220] outline-none placeholder:text-[#6B7480]"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {(["ALL", "TRANSACTIONAL", "COMMERCIAL", "INFORMATIONAL", "NAVIGATIONAL"] as const).map(
              (option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setIntentFilter(option)}
                  className={cn(
                    "rounded-full border px-3 py-[5px] text-[12.5px] whitespace-nowrap transition-colors",
                    intentFilter === option
                      ? "border-[#0B1220] bg-[#0B1220] font-medium text-white"
                      : "border-[#E2E6EC] bg-white text-[#6B7480] hover:border-[#D3D8E0]",
                  )}
                >
                  {option === "ALL" ? "All" : INTENT_LABEL[option]}
                </button>
              ),
            )}
          </div>
        </div>

        {/* Inline summary — 16px/600 figures against 12.5px labels. */}
        <div className="mt-5 flex flex-wrap items-baseline gap-x-[22px] gap-y-2">
          <SummaryFigure value={summary.tracked} label="tracked" />
          <SummaryFigure value={summary.ranking} label="ranking" />
          <SummaryFigure value={summary.topTen} label="in the top 10" tone="success" />
          <SummaryFigure value={summary.notRanking} label="not ranking yet" tone="muted" />
        </div>

        {/* Table */}
        <div className="mt-[22px]">
          {rows.length > 0 ? (
            <>
              <KeywordTable
                rows={rows}
                onToggleTracked={flow.setTracked}
                onRemove={flow.removeKeyword}
                isBusy={flow.isUpdatingTracked || flow.isRemoving}
              />

              <div className="flex flex-wrap items-center justify-between gap-x-5 gap-y-3 px-1 py-4">
                <div className="text-[12.5px] text-[#6B7480]">
                  Showing {rows.length} of {visible.length} tracked keywords
                </div>
                <div className="flex items-center gap-3.5">
                  <span className="text-[12.5px] text-[#6B7480]">
                    Rows {currentPage * PAGE_SIZE + 1}–{currentPage * PAGE_SIZE + rows.length}
                  </span>
                  <div className="flex gap-1.5">
                    <PageButton
                      label="Previous page"
                      disabled={currentPage === 0}
                      onClick={() => setPage(currentPage - 1)}
                    >
                      <ChevronLeft className="size-[11px]" />
                    </PageButton>
                    <PageButton
                      label="Next page"
                      disabled={currentPage >= pageCount - 1}
                      onClick={() => setPage(currentPage + 1)}
                    >
                      <ChevronRight className="size-[11px]" />
                    </PageButton>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <Empty className="rounded-2xl border border-[#E2E6EC]">
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
        </div>

        {flow.trackedError || flow.removeError ? (
          <div className="border-critical/20 bg-critical/5 text-critical-strong mt-4 rounded-lg border px-3.5 py-2.5 text-[13px]">
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
          <div className="mt-6 flex flex-wrap items-center justify-between gap-x-5 gap-y-3 rounded-xl border border-[#FCD9B6] bg-[#FFFBF6] px-[18px] py-4">
            <div className="flex min-w-0 items-center gap-[11px]">
              <ProPill />
              <p className="text-[13px] leading-[1.55] text-[#7C3D12]">
                You&apos;re tracking all {quota.limit} keywords your plan allows. Untrack one to
                make room, or upgrade for more.
              </p>
            </div>
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
  );
}

/** The design's 10.5px lock chip, used on every gated affordance. */
function ProPill() {
  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-[5px] border border-[#FCD9B6] bg-[#FFF6EE] px-1.5 py-0.5 text-[10.5px] font-semibold tracking-[0.04em] text-[#EA580C]">
      <svg width="9" height="9" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
        <rect x="5" y="9" width="10" height="8" rx="1.6" />
        <path d="M7 9V6.6C7 4.6 8.3 3 10 3C11.7 3 13 4.6 13 6.6V9" />
      </svg>
      PRO
    </span>
  );
}

function PageButton({
  children,
  label,
  disabled,
  onClick,
}: {
  children: React.ReactNode;
  label: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex size-[26px] items-center justify-center rounded-[6px] border border-[#DFE3EA] transition-colors",
        disabled ? "text-[#9AA2AE]" : "text-[#3F4854] hover:border-[#C6CDD8]",
      )}
    >
      {children}
    </button>
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
    <span className="flex items-baseline gap-[7px]">
      <span
        className={cn(
          "text-[16px] font-semibold tracking-[-0.01em] tabular-nums",
          tone === "success" && "text-[#16A34A]",
          tone === "muted" && "text-[#9AA2AE]",
          tone === "default" && "text-[#0B1220]",
        )}
      >
        {value}
      </span>
      <span className="text-[12.5px] text-[#6B7480]">{label}</span>
    </span>
  );
}

/**
 * The design's widths: minmax(0,1fr) 84px 78px 108px 84px 104px. VOLUME keeps
 * its 78px slot but carries a demand band rather than a monthly figure — see
 * DemandCell.
 */
const TABLE_GRID = "lg:grid-cols-[minmax(0,1fr)_84px_78px_108px_84px_104px]";

const DEMAND_LABEL = { HIGH: "High", MEDIUM: "Medium", LOW: "Low" } as const;

/**
 * Where the design put search volume.
 *
 * Nothing in a SERP response measures search demand, and Serpex returns only
 * organic results — so there is no honest way to print "2,100/mo" here. What
 * the results *do* describe is how contested the term is, which is what this
 * shows. Deliberately three bands: the signals cannot support a number, and a
 * number would imply a precision we don't have. Real volume needs Keyword
 * Planner or a paid keyword API.
 */
function DemandCell({ demand }: { demand: KeywordRow["demand"] }) {
  if (!demand) return <span className="text-[13px] text-[#9AA2AE] lg:text-right">—</span>;

  return (
    <span
      className={cn(
        "text-[13px] lg:text-right",
        demand === "HIGH" ? "font-medium text-[#0B1220]" : "text-[#3F4854]",
      )}
      title="How contested this term looks, from who currently ranks for it. Not a search-volume figure."
    >
      {DEMAND_LABEL[demand]}
    </span>
  );
}

/** The design's bar + number. Ours, from SERP composition — not an industry KD. */
function DifficultyCell({ difficulty }: { difficulty: number | null }) {
  if (difficulty === null) {
    return <span className="text-[12px] text-[#9AA2AE]">Not scored yet</span>;
  }

  const colour =
    difficulty >= 70 ? "#EA580C" : difficulty >= 40 ? "#B45309" : "#16A34A";

  return (
    <span
      className="flex items-center gap-[9px]"
      title="Our estimate of how hard this term is to win, from who currently holds the top results. Not comparable to Ahrefs or Semrush difficulty."
    >
      <span className="h-[3px] min-w-6 flex-1 overflow-hidden rounded-[2px] bg-[#F1F3F7]">
        <span
          className="block h-full"
          style={{ width: `${difficulty}%`, background: colour }}
        />
      </span>
      <span className="text-[12px] text-[#6B7480]">{difficulty}</span>
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
      <div
        className={cn(
          "hidden gap-4 border-b border-[#DFE3EA] px-1 pb-2.5 lg:grid lg:items-center",
          TABLE_GRID,
        )}
      >
        {["Keyword", "Position", "Demand", "Difficulty", "90 days", "Action"].map(
          (heading, index) => (
            <div
              key={heading}
              className={cn(
                "text-[11px] font-semibold tracking-[0.08em] text-[#6B7480] uppercase",
                (index === 2 || index === 5) && "text-right",
              )}
            >
              {heading}
            </div>
          ),
        )}
      </div>

      <Stagger className="flex flex-col" whenInView={false}>
        {rows.map((row) => (
          <StaggerItem key={row.id}>
            <div
              className={cn(
                "grid gap-3 border-b border-[#F3F5F8] px-1 py-3 lg:items-center lg:gap-4",
                TABLE_GRID,
                !row.isTracked && "opacity-60",
              )}
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="truncate text-[13.5px] font-medium text-[#0B1220]">
                    {row.term}
                  </span>
                  {/* Intent lost its own column when Demand and Difficulty
                      took their design slots back, but the toolbar filters by
                      it — so it stays visible here rather than disappearing. */}
                  <span
                    className={cn(
                      "shrink-0 rounded-full border px-2 py-px text-[10.5px] whitespace-nowrap",
                      INTENT_PILL[row.intent],
                    )}
                  >
                    {INTENT_LABEL[row.intent]}
                  </span>
                  {!row.isTracked ? (
                    <span className="shrink-0 rounded-[5px] border border-[#E2E6EC] px-1.5 py-px text-[10.5px] font-medium text-[#6B7480]">
                      Paused
                    </span>
                  ) : null}
                </div>
                {row.url ? (
                  <p className="mt-[3px] truncate text-[11.5px] text-[#6B7480]">{row.url}</p>
                ) : row.rationale ? (
                  <p className="mt-[3px] line-clamp-1 text-[11.5px] text-[#6B7480]">
                    {row.rationale}
                  </p>
                ) : null}
              </div>

              <div className="flex items-center gap-2 lg:block">
                <span className="text-[11.5px] text-[#6B7480] lg:hidden">Position</span>
                <PositionCell position={row.position} change={row.change} isPending={row.isPending} />
              </div>

              <div className="flex items-center gap-2 lg:block">
                <span className="text-[11.5px] text-[#6B7480] lg:hidden">Demand</span>
                <DemandCell demand={row.demand} />
              </div>

              <div className="flex items-center gap-2 lg:block">
                <span className="shrink-0 text-[11.5px] text-[#6B7480] lg:hidden">
                  Difficulty
                </span>
                <DifficultyCell difficulty={row.difficulty} />
              </div>

              <div className="hidden lg:block">
                <RankSparkline positions={row.trend} />
              </div>

              {/* The design's action column is a single 12.5px link. Ours
                  carries two icon buttons, since tracking is the lever this
                  page controls — pause/resume sitting right beside remove,
                  same weight and size, rather than one as text and one as an
                  icon. */}
              <div className="flex items-center gap-3 lg:justify-end">
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={() => onToggleTracked(row.id, !row.isTracked)}
                  aria-label={row.isTracked ? `Pause tracking ${row.term}` : `Resume tracking ${row.term}`}
                  title={row.isTracked ? "Pause tracking" : "Resume tracking"}
                  className="text-[#9AA2AE] transition-colors hover:text-[#0B1220] disabled:opacity-50"
                >
                  {row.isTracked ? (
                    <Pause className="size-3.5" />
                  ) : (
                    <Play className="size-3.5" />
                  )}
                </button>
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={() => onRemove(row.id)}
                  aria-label={`Remove ${row.term}`}
                  title="Remove"
                  className="text-[#9AA2AE] transition-colors hover:text-[#DC2626] disabled:opacity-50"
                >
                  <Trash2 className="size-3.5" />
                </button>
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
    <section className="mt-8 mb-[26px]">
      <div className="flex items-baseline justify-between gap-4 border-b border-[#DFE3EA] pb-2.5">
        <div className="text-[11px] font-semibold tracking-[0.08em] text-[#6B7480] uppercase">
          Gaps to competitors · {gaps.length} found
        </div>
        <span className="text-[12.5px] text-[#6B7480]">
          Terms your rivals rank for and you don&apos;t
        </span>
      </div>

      {error ? (
        <div className="border-critical/20 bg-critical/5 text-critical-strong mt-3 rounded-lg border px-3.5 py-2.5 text-[13px]">
          {error}
        </div>
      ) : null}

      <div className="flex flex-col">
        {gaps.slice(0, 20).map((gap) => (
          <div
            key={gap.term}
            className="grid gap-4 border-b border-[#F3F5F8] px-1 py-3 sm:grid-cols-[minmax(0,1fr)_150px_104px] sm:items-center"
          >
            <div className="min-w-0">
              <div className="truncate text-[13.5px] font-medium text-[#0B1220]">{gap.term}</div>
              {gap.rationale ? (
                <p className="mt-[3px] line-clamp-1 text-[11.5px] text-[#6B7480]">
                  {gap.rationale}
                </p>
              ) : null}
            </div>

            <div>
              <span
                className={cn(
                  "inline-flex shrink-0 rounded-full border px-2 py-px text-[10.5px] whitespace-nowrap",
                  INTENT_PILL[gap.intent],
                )}
              >
                {INTENT_LABEL[gap.intent]}
              </span>
            </div>

            <button
              type="button"
              disabled={isTracking}
              onClick={() => onTrack(gap.term)}
              className="text-left text-[12.5px] font-medium whitespace-nowrap text-[#0B1220] disabled:opacity-50 sm:text-right"
            >
              Track this
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
