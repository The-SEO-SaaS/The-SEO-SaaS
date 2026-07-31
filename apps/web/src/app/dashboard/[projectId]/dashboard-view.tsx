"use client";

import { toParagraphs } from "@theseosaas/core/text";
import { Button } from "@theseosaas/ui/components/button";
import { Empty, EmptyDescription, EmptyMedia, EmptyTitle } from "@theseosaas/ui/components/empty";
import { IconTile } from "@theseosaas/ui/components/icon-tile";
import { CountUp, FadeIn, Stagger, StaggerItem } from "@theseosaas/ui/components/motion";
import { cn } from "@theseosaas/ui/lib/utils";
import { AlertTriangle, ArrowRight, Clock, Search } from "lucide-react";
import Link from "next/link";

import { DashboardTopBar } from "@/components/dashboard/dashboard-topbar";
import { useSiteDashboard } from "@/hooks/use-sites";
import type { CompetitorStanding, SiteDashboard } from "@/lib/api";

/**
 * The dashboard body for one site.
 *
 * Built to the design's exact measurements: a 40px-gap column capped at
 * 1120px, holding Verdict / Figures strip / Do this next / Average position +
 * Share of voice / Content in flight.
 *
 * Two deliberate departures, both because the design assumes data this build
 * doesn't have (see HANDOVER.md "Missing data the design assumes"):
 *
 *  - The eyebrow reads LATEST AUDIT, not THIS MONTH. A full audit is too
 *    expensive to run monthly on a schedule, so the verdict is "as of the last
 *    crawl", and labelling it as a month would misdate it.
 *  - Share of voice shows shared-term counts, not a 0–100 competitor score.
 *    We never crawl competitor sites, so there is no score to show and none is
 *    invented.
 *
 * Deltas and trend lines render only where a second data point genuinely
 * exists; otherwise the slot is omitted rather than zeroed.
 *
 * Responsive: the design file is desktop-only. Every multi-column grid here
 * collapses to a single column below `lg`, and the figures strip stacks to
 * rows below `sm`.
 */
export function DashboardView({ projectId }: { projectId: string }) {
  return (
    <>
      <DashboardTopBar currentSiteId={projectId} />
      <DashboardBody projectId={projectId} />
    </>
  );
}

function DashboardBody({ projectId }: { projectId: string }) {
  const { dashboard, isLoading, isError, errorMessage, refetch } = useSiteDashboard(projectId);

  if (isLoading && !dashboard) {
    return (
      <main className="flex flex-1 items-center justify-center px-4 py-16">
        <IconTile tone="ink" size="xl" className="animate-pulse">
          <Search />
        </IconTile>
        <span className="sr-only">Loading dashboard</span>
      </main>
    );
  }

  if (isError || !dashboard) {
    return (
      <main className="flex flex-1 items-center justify-center px-4 py-16">
        <div className="w-full max-w-md space-y-4 text-center">
          <IconTile tone="critical" size="xl" className="mx-auto">
            <AlertTriangle />
          </IconTile>
          <h1 className="font-display text-ink-900 text-2xl font-semibold">
            We couldn&apos;t load this site
          </h1>
          <p className="text-ink-400 text-base leading-relaxed">
            {errorMessage ?? "Please try again in a moment."}
          </p>
          <Button onClick={refetch}>Try again</Button>
        </div>
      </main>
    );
  }

  if (!dashboard.hasCompletedAudit) {
    return (
      <main className="flex flex-1 items-center justify-center px-4 py-16">
        <Empty className="max-w-md">
          <EmptyMedia variant="icon">
            <Clock />
          </EmptyMedia>
          <EmptyTitle>Your first audit is still running</EmptyTitle>
          <EmptyDescription>
            This usually takes a few minutes. The dashboard fills in as soon as it finishes —
            no need to keep this open.
          </EmptyDescription>
        </Empty>
      </main>
    );
  }

  return (
    <main className="flex max-w-[1120px] flex-1 flex-col gap-8 px-4 py-8 sm:px-6 lg:gap-10 lg:px-10 lg:pt-10 lg:pb-16">
      <VerdictSection dashboard={dashboard} />
      <FiguresStrip dashboard={dashboard} />
      <NextActionSection dashboard={dashboard} />
      <RankingsAndCompetitors dashboard={dashboard} />
      <ContentPipelineSection dashboard={dashboard} />
    </main>
  );
}

/** 11px / 600 / 0.1em / #6B7480 — the design's app-screen section label. */
function Eyebrow({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "text-[11px] font-semibold tracking-[0.1em] text-[#6B7480] uppercase",
        className,
      )}
    >
      {children}
    </div>
  );
}

/** Signed delta in the design's semantic colours. `goodDirection` flips them. */
function Delta({
  value,
  goodDirection = "up",
  suffix = "",
  className,
}: {
  value: number;
  goodDirection?: "up" | "down";
  suffix?: string;
  className?: string;
}) {
  if (value === 0) return null;
  const isGood = goodDirection === "up" ? value > 0 : value < 0;

  return (
    <span className={cn(isGood ? "text-[#16A34A]" : "text-[#DC2626]", className)}>
      {value > 0 ? "+" : ""}
      {value}
      {suffix}
    </span>
  );
}

function VerdictSection({ dashboard }: { dashboard: SiteDashboard }) {
  const { score, competitors } = dashboard;
  const history = score.history;

  const scoreChange =
    history.length >= 2 ? history[history.length - 1]!.score - history[history.length - 2]!.score : null;

  // `score.verdict` is the same AI-written text as the report's own summary
  // (see `latest?.summary` in projects/service.ts) — two or three sentences,
  // not one. Rendered as a single block at 22-27px with a 30ch cap, it turned
  // into a tall, dense wall next to the score card. Only the opening sentence
  // keeps the headline treatment; anything after it reads as normal body copy,
  // the same demotion the report header gives its own opening paragraph.
  const verdictParagraphs = toParagraphs(
    score.verdict ?? "Your audit finished — the score and findings are ready below.",
  );

  return (
    <FadeIn className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start lg:gap-10">
      <div className="min-w-0">
        <Eyebrow>Latest audit</Eyebrow>
        <div className="mt-3.5 max-w-[46ch] space-y-2.5">
          {verdictParagraphs.map((paragraph, index) => (
            <p
              key={index}
              className={
                index === 0
                  ? "text-[22px] leading-[1.3] font-medium tracking-[-0.02em] text-pretty text-[#0B1220] sm:text-[27px]"
                  : "text-[14.5px] leading-[1.6] text-[#5B6472]"
              }
            >
              <HighlightRivals text={paragraph} competitors={competitors} />
            </p>
          ))}
        </div>
        {dashboard.nextAction ? (
          <p className="mt-3 max-w-[52ch] text-[14px] leading-[1.6] text-[#6B7480]">
            {dashboard.nextAction.rationale}
          </p>
        ) : null}
      </div>

      <div className="min-w-[172px] lg:border-l lg:border-[#EDEFF3] lg:pl-8">
        <Eyebrow>SEO score</Eyebrow>
        <div className="mt-3 flex items-baseline gap-[7px]">
          <span className="text-[46px] leading-none font-medium tracking-[-0.03em] text-[#0B1220]">
            {score.current !== null ? <CountUp value={score.current} /> : "—"}
          </span>
          <span className="text-[14px] text-[#6B7480]">/ 100</span>
        </div>

        {scoreChange !== null ? (
          <div className="mt-2 text-[12.5px]">
            <Delta value={scoreChange} suffix={` from ${formatShortDate(history[history.length - 2]!.date)}`} />
          </div>
        ) : null}

        {history.length >= 2 ? (
          <>
            <Sparkline
              values={history.map((point) => point.score)}
              width={160}
              height={40}
              className="mt-4 max-w-[160px]"
              fill
            />
            <div className="mt-1 text-[11px] text-[#6B7480]">
              {formatShortDate(history[0]!.date)} — {formatShortDate(history[history.length - 1]!.date)}
            </div>
          </>
        ) : (
          <p className="mt-4 max-w-[24ch] text-[11px] leading-relaxed text-[#6B7480]">
            Re-run an audit later to start a score trend here.
          </p>
        )}
      </div>
    </FadeIn>
  );
}

/**
 * The design paints the rival's name in #EA580C inside the verdict sentence.
 * We only do it when a tracked competitor's name actually appears in the
 * AI-written verdict — no name is inserted that the model didn't write.
 */
function HighlightRivals({
  text,
  competitors,
}: {
  text: string;
  competitors: CompetitorStanding[];
}) {
  const names = competitors
    .flatMap((competitor) => [competitor.name, competitor.domain])
    .filter((name): name is string => Boolean(name))
    .sort((a, b) => b.length - a.length);

  if (names.length === 0) return <>{text}</>;

  // The capture group means split() interleaves matches at odd indices, so no
  // second regex pass is needed — .test() on a /g/ regex is stateful and would
  // skip every other hit.
  const parts = text.split(new RegExp(`(${names.map(escapeRegExp).join("|")})`, "gi"));

  return (
    <>
      {parts.map((part, index) =>
        index % 2 === 1 ? (
          <span key={index} className="text-[#EA580C]">
            {part}
          </span>
        ) : (
          <span key={index}>{part}</span>
        ),
      )}
    </>
  );
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Three cells separated by 1px gaps over an #EDEFF3 backdrop — the hairline
 * grid the design uses instead of borders, so the rules meet exactly.
 */
function FiguresStrip({ dashboard }: { dashboard: SiteDashboard }) {
  const { figures, quota } = dashboard;
  const { critical, warning, notice } = figures.openIssues;
  const totalIssues = critical + warning + notice;

  return (
    <Stagger className="grid gap-px border-y border-[#EDEFF3] bg-[#EDEFF3] sm:grid-cols-3">
      <StaggerItem className="min-w-0 bg-white px-0 py-5 sm:px-[26px] sm:py-[22px]">
        <Figure
          label="Open issues"
          value={totalIssues}
          delta={
            figures.openIssuesChange !== null ? (
              <Delta value={figures.openIssuesChange} goodDirection="down" />
            ) : null
          }
          spark={figures.openIssuesHistory}
          sparkGoodDirection="down"
          note={
            totalIssues > 0
              ? `${critical} critical, ${warning} worth fixing.`
              : "Nothing outstanding from the last audit."
          }
        />
      </StaggerItem>

      <StaggerItem className="min-w-0 bg-white px-0 py-5 sm:px-[26px] sm:py-[22px]">
        <Figure
          label="Keyword opportunities"
          value={figures.opportunityCount}
          note="Content ideas ready to act on."
        />
      </StaggerItem>

      <StaggerItem className="min-w-0 bg-white px-0 py-5 sm:px-[26px] sm:py-[22px]">
        <Figure
          label="Average position"
          value={figures.averagePosition ?? "—"}
          delta={
            figures.averagePositionChange !== null ? (
              <Delta value={figures.averagePositionChange} goodDirection="down" />
            ) : null
          }
          spark={
            dashboard.averagePositionTrend
              ? // Negated so a rising line means a better rank, matching the
                // "higher line = better position" note on the big chart.
                dashboard.averagePositionTrend.map((point) => -point.averagePosition)
              : []
          }
          note={
            figures.averagePosition !== null
              ? `Across ${quota.keywords.used} tracked keyword${quota.keywords.used === 1 ? "" : "s"}.`
              : "Checked daily — the first result lands within a day."
          }
        />
      </StaggerItem>
    </Stagger>
  );
}

function Figure({
  label,
  value,
  delta,
  spark,
  sparkGoodDirection = "up",
  note,
}: {
  label: string;
  value: React.ReactNode;
  delta?: React.ReactNode;
  spark?: number[];
  sparkGoodDirection?: "up" | "down";
  note: string;
}) {
  const hasSpark = Boolean(spark && spark.length >= 2);
  const series = hasSpark && sparkGoodDirection === "down" ? spark!.map((v) => -v) : spark;

  return (
    <div className="min-w-0">
      <div className="text-[12.5px] text-[#6B7480]">{label}</div>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="text-[22px] font-medium tracking-[-0.02em] text-[#0B1220]">{value}</span>
        {delta ? <span className="text-[12px]">{delta}</span> : null}
      </div>

      {hasSpark ? (
        <Sparkline values={series!} width={120} height={22} className="mt-3 max-w-[150px]" />
      ) : null}

      <div className={cn("text-[11.5px] leading-[1.5] text-[#6B7480]", hasSpark ? "mt-2.5" : "mt-3")}>
        {note}
      </div>
    </div>
  );
}

function NextActionSection({ dashboard }: { dashboard: SiteDashboard }) {
  const { nextAction, queuedActions } = dashboard;

  return (
    <section>
      <Eyebrow>Do this next</Eyebrow>

      {nextAction ? (
        <>
          {/* 26px/28px inset, 14px radius, #F8F9FA on #E2E6EC — the design's
              one filled card on this screen. */}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-6 rounded-[14px] border border-[#E2E6EC] bg-[#F8F9FA] px-5 py-5 sm:gap-7 sm:px-7 sm:py-[26px]">
            <div className="min-w-0 max-w-[56ch]">
              <div className="text-[17px] font-semibold tracking-[-0.015em] text-[#0B1220]">
                {nextAction.title}
              </div>
              <p className="mt-[7px] text-[13.5px] leading-[1.6] text-[#5B6472]">
                {nextAction.rationale}
              </p>
              {nextAction.keywords.length > 0 ? (
                <p className="mt-2 text-[12.5px] text-[#6B7480]">
                  Targets {nextAction.keywords.slice(0, 3).join(", ")}
                </p>
              ) : null}
            </div>

            {/* The design's primary CTA here is "Generate drafts". Content
                generation isn't built (contentApi is a stub), so the card
                links to the finding in the report rather than promising an
                action that would fail. */}
            {nextAction.reportUrl ? (
              <Button size="sm" render={<Link href={nextAction.reportUrl} />}>
                View in report
                <ArrowRight />
              </Button>
            ) : null}
          </div>

          {queuedActions.length > 0 ? (
            <div className="mt-1.5">
              {queuedActions.map((action) => (
                <div
                  key={action.opportunityId}
                  className="flex items-start justify-between gap-5 border-b border-[#EDEFF3] px-1 py-4"
                >
                  <div className="min-w-0">
                    <div className="text-[14px] font-medium text-[#0B1220]">{action.title}</div>
                    <div className="mt-1 max-w-[64ch] text-[12.5px] leading-[1.5] text-[#6B7480]">
                      {action.rationale}
                    </div>
                  </div>
                  {nextAction.reportUrl ? (
                    <Link
                      href={nextAction.reportUrl}
                      className="shrink-0 text-[13px] font-medium whitespace-nowrap text-[#0B1220]"
                    >
                      Review
                    </Link>
                  ) : null}
                </div>
              ))}
            </div>
          ) : null}
        </>
      ) : (
        <Empty className="mt-4 rounded-2xl border border-[#E2E6EC]">
          <EmptyTitle>No open opportunities right now</EmptyTitle>
          <EmptyDescription>
            Re-run an audit once you&apos;ve made some changes to surface new ones.
          </EmptyDescription>
        </Empty>
      )}
    </section>
  );
}

function RankingsAndCompetitors({ dashboard }: { dashboard: SiteDashboard }) {
  const { averagePositionTrend, competitors } = dashboard;

  return (
    <section className="grid gap-8 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] lg:gap-10">
      <div className="min-w-0">
        <div className="flex items-baseline justify-between gap-4">
          <Eyebrow>Average position</Eyebrow>
          <span className="text-[11.5px] text-[#6B7480]">Higher line = better position</span>
        </div>

        {averagePositionTrend ? (
          <>
            <PositionChart points={averagePositionTrend} />
            <div className="mt-2 flex justify-between">
              {axisLabels(averagePositionTrend.map((point) => point.date)).map((label, index) => (
                <div key={index} className="text-[11.5px] text-[#6B7480]">
                  {label}
                </div>
              ))}
            </div>
          </>
        ) : (
          <Empty className="mt-4 rounded-2xl border border-[#E2E6EC]">
            <EmptyTitle>Building your position history</EmptyTitle>
            <EmptyDescription>
              We check every tracked keyword once a day — check back in a couple of days for a
              trend line.
            </EmptyDescription>
          </Empty>
        )}
      </div>

      <div className="min-w-0">
        {/* The design calls this SHARE OF VOICE and scores each rival 0–100.
            We don't crawl competitor sites, so there's no score — the honest
            equivalent is how many of your tracked terms each one also ranks
            for, which the audit does measure. */}
        <Eyebrow>Shared terms</Eyebrow>

        {competitors.length > 0 ? (
          <>
            <div className="mt-[18px] flex flex-col">
              {competitors.map((competitor) => (
                <ShareOfVoiceRow
                  key={competitor.domain}
                  competitor={competitor}
                  max={Math.max(1, ...competitors.map((entry) => entry.sharedTerms))}
                />
              ))}
            </div>
            <p className="mt-3.5 text-[12.5px] leading-[1.6] text-[#6B7480]">
              Counted from the last audit&apos;s search results — how many of your terms each rival
              also appears for.
            </p>
          </>
        ) : (
          <Empty className="mt-4 rounded-2xl border border-[#E2E6EC]">
            <EmptyTitle>No competitors tracked</EmptyTitle>
            <EmptyDescription>None were confirmed for this site during setup.</EmptyDescription>
          </Empty>
        )}
      </div>
    </section>
  );
}

function ShareOfVoiceRow({
  competitor,
  max,
}: {
  competitor: CompetitorStanding;
  max: number;
}) {
  return (
    <div className="border-b border-[#EDEFF3] py-3.5">
      <div className="flex items-baseline justify-between gap-3">
        <span className="truncate text-[13.5px] font-medium text-[#0B1220]">
          {competitor.name ?? competitor.domain}
        </span>
        <span className="shrink-0 text-[13px] text-[#6B7480]">
          {competitor.sharedTerms} shared
          {competitor.bestPosition ? ` · best #${competitor.bestPosition}` : ""}
        </span>
      </div>
      <div className="mt-2.5 h-[3px] w-full overflow-hidden rounded-[2px] bg-[#F1F3F7]">
        <div
          className="h-full bg-[#EA580C]"
          style={{ width: `${Math.round((competitor.sharedTerms / max) * 100)}%` }}
        />
      </div>
    </div>
  );
}

const CONTENT_STATUS_LABEL: Record<SiteDashboard["contentInFlight"][number]["status"], string> = {
  DRAFT: "Draft",
  GENERATING: "Writing…",
  GENERATED: "Ready to publish",
  PUBLISHED: "Published",
  ARCHIVED: "Archived",
  FAILED: "Failed",
};

const CONTENT_STATUS_COLOUR: Record<
  SiteDashboard["contentInFlight"][number]["status"],
  string
> = {
  DRAFT: "#9AA2AE",
  GENERATING: "#EA580C",
  GENERATED: "#0B1220",
  PUBLISHED: "#16A34A",
  ARCHIVED: "#9AA2AE",
  FAILED: "#DC2626",
};

/** The design's 3-column table: title, target term, status. */
function ContentPipelineSection({ dashboard }: { dashboard: SiteDashboard }) {
  const rows = dashboard.contentInFlight;
  const contentHref = `/dashboard/${dashboard.project.id}/content`;

  return (
    <section>
      <div className="flex items-baseline justify-between gap-4">
        <Eyebrow>Content in flight</Eyebrow>
        <Link href={contentHref} className="text-[12.5px] font-medium">
          All content
        </Link>
      </div>

      {rows.length > 0 ? (
        <div className="mt-3.5 border-t border-[#EDEFF3]">
          {rows.map((row) => (
            <Link
              key={row.id}
              href={`${contentHref}/${row.id}`}
              className="grid items-center gap-3 border-b border-[#EDEFF3] px-1 py-3.5 no-underline sm:grid-cols-[minmax(0,1fr)_128px_110px] sm:gap-5"
            >
              <span className="truncate text-[14px] font-medium text-[#0B1220]">{row.title}</span>
              <span className="truncate text-[12.5px] font-normal text-[#6B7480]">
                {row.target ?? "—"}
              </span>
              <span
                className="text-[12.5px] font-medium sm:text-right"
                style={{ color: CONTENT_STATUS_COLOUR[row.status] }}
              >
                {CONTENT_STATUS_LABEL[row.status]}
              </span>
            </Link>
          ))}
        </div>
      ) : (
        <Empty className="mt-3.5 rounded-2xl border border-[#E2E6EC]">
          <EmptyMedia variant="icon">
            <Search />
          </EmptyMedia>
          <EmptyTitle>Nothing being written yet</EmptyTitle>
          <EmptyDescription>
            {dashboard.figures.opportunityCount > 0
              ? `${dashboard.figures.opportunityCount} opportunit${dashboard.figures.opportunityCount === 1 ? "y is" : "ies are"} ready to turn into blog posts.`
              : "Run an audit to surface something worth writing about."}
          </EmptyDescription>
          <Button size="sm" variant="outline" className="mt-3" render={<Link href={contentHref} />}>
            Open content
          </Button>
        </Empty>
      )}
    </section>
  );
}

/**
 * The big average-position chart: 560×170 with three #F3F5F8 gridlines, a
 * #F4F5F7 area, a 2px ink line and a labelled endpoint — all per the design.
 * Values arrive as raw positions and are negated here so the line rises as
 * the rank improves.
 */
function PositionChart({ points }: { points: { date: string; averagePosition: number }[] }) {
  const width = 560;
  const height = 170;
  const values = points.map((point) => -point.averagePosition);

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const coords = values.map((value, index) => ({
    x: (index / Math.max(1, values.length - 1)) * width,
    y: height - 16 - ((value - min) / range) * (height - 40),
  }));

  const line = coords.map((point, index) => `${index === 0 ? "M" : "L"}${point.x},${point.y}`).join(" ");
  const area = `M0,${height} L${coords.map((p) => `${p.x},${p.y}`).join(" L")} L${width},${height} Z`;
  const last = coords[coords.length - 1]!;
  const latest = points[points.length - 1]!.averagePosition;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width="100%"
      height={height}
      className="mt-[18px] block overflow-visible"
      role="img"
      aria-label={`Average position over ${points.length} days, currently ${latest}`}
    >
      {[16, 80, 144].map((y) => (
        <line key={y} x1={0} y1={y} x2={width} y2={y} stroke="#F3F5F8" strokeWidth={1} />
      ))}
      <path d={area} fill="#F4F5F7" stroke="none" />
      <path
        d={line}
        fill="none"
        stroke="#0B1220"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={last.x} cy={last.y} r={3.6} fill="#0B1220" />
      <text
        x={last.x - 8}
        y={last.y - 10}
        textAnchor="end"
        fontSize={12}
        fontWeight={500}
        fill="#0B1220"
      >
        {latest}
      </text>
    </svg>
  );
}

/** Small line chart — no charting library, matching the design's inline SVGs. */
function Sparkline({
  values,
  width = 120,
  height = 22,
  className,
  fill = false,
}: {
  values: number[];
  width?: number;
  height?: number;
  className?: string;
  fill?: boolean;
}) {
  if (values.length < 2) return null;

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const coords = values.map((value, index) => {
    const x = (index / (values.length - 1)) * width;
    const y = height - ((value - min) / range) * (height - 4) - 2;
    return { x, y };
  });

  const line = coords.map((point, index) => `${index === 0 ? "M" : "L"}${point.x},${point.y}`).join(" ");
  const area = `M0,${height} L${coords.map((p) => `${p.x},${p.y}`).join(" L")} L${width},${height} Z`;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width="100%"
      height={height}
      preserveAspectRatio="none"
      className={cn("block overflow-visible", className)}
      aria-hidden="true"
    >
      {fill ? <path d={area} fill="#F1F3F7" stroke="none" /> : null}
      <path
        d={line}
        fill="none"
        stroke="#0B1220"
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

/**
 * The design's six month labels under the chart. We have daily points from an
 * arbitrary window, so this takes evenly-spaced samples instead — at most six,
 * fewer when there's less history than that.
 */
function axisLabels(dates: string[]): string[] {
  const count = Math.min(6, dates.length);
  if (count <= 1) return dates.map(formatShortDate);

  return Array.from({ length: count }, (_, index) => {
    const position = Math.round((index / (count - 1)) * (dates.length - 1));
    return formatShortDate(dates[position]!);
  });
}

function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
