"use client";

import { Badge } from "@theseosaas/ui/components/badge";
import { Button } from "@theseosaas/ui/components/button";
import { Card, CardContent } from "@theseosaas/ui/components/card";
import { Empty, EmptyDescription, EmptyMedia, EmptyTitle } from "@theseosaas/ui/components/empty";
import { IconTile } from "@theseosaas/ui/components/icon-tile";
import { CountUp, FadeIn, Stagger, StaggerItem } from "@theseosaas/ui/components/motion";
import { Stat } from "@theseosaas/ui/components/stat";
import { cn } from "@theseosaas/ui/lib/utils";
import { AlertTriangle, ArrowRight, Clock, Search } from "lucide-react";
import Link from "next/link";

import { useSiteDashboard } from "@/hooks/use-sites";
import type { SiteDashboard } from "@/lib/api";

/**
 * The dashboard content for one site.
 *
 * Adapted from the uploaded design's Verdict / Figures / Next action /
 * Rankings+competitors / Content-pipeline layout — but every section is real
 * data or an honest "not enough yet" state, never the design's implied
 * months-old history. See packages/core/src/projects/service.ts for what's
 * actually computable today and why.
 */
export function DashboardView({ projectId }: { projectId: string }) {
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
    <main className="flex flex-1 flex-col gap-8 px-4 py-6 sm:px-6 sm:py-8 lg:gap-10 lg:px-10 lg:py-10">
      <VerdictSection dashboard={dashboard} />
      <FiguresStrip dashboard={dashboard} />
      <NextActionSection dashboard={dashboard} />
      <RankingsAndCompetitors dashboard={dashboard} />
      <ContentPipelineSection dashboard={dashboard} />
    </main>
  );
}

const BAND_TONE: Record<"POOR" | "FAIR" | "GOOD", "critical" | "caution" | "success"> = {
  POOR: "critical",
  FAIR: "caution",
  GOOD: "success",
};

function VerdictSection({ dashboard }: { dashboard: SiteDashboard }) {
  const { score } = dashboard;

  return (
    <FadeIn className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start lg:gap-10">
      <div className="min-w-0">
        <div className="eyebrow text-ink-300">Latest audit</div>
        <p className="text-ink-900 mt-3 max-w-[52ch] text-xl leading-snug font-medium text-pretty sm:text-2xl">
          {score.verdict ?? "Your audit finished — the score and findings are ready below."}
        </p>
      </div>

      <div className="border-line min-w-[172px] pt-1 lg:border-l lg:pl-8">
        <div className="eyebrow text-ink-300">SEO score</div>
        <div className="mt-3 flex items-baseline gap-1.5">
          <span className="font-display text-ink-900 text-4xl font-semibold sm:text-5xl">
            {score.current !== null ? <CountUp value={score.current} /> : "—"}
          </span>
          <span className="text-ink-300 text-sm">/ 100</span>
        </div>
        {score.band ? (
          <Badge tone={BAND_TONE[score.band]} className="mt-2">
            {score.band === "GOOD" ? "Healthy" : score.band === "FAIR" ? "Needs work" : "At risk"}
          </Badge>
        ) : null}

        {score.history.length >= 2 ? (
          <Sparkline
            values={score.history.map((point) => point.score)}
            className="mt-4"
            color="var(--color-ink-900)"
          />
        ) : (
          <p className="text-ink-300 mt-4 max-w-[24ch] text-xs leading-relaxed">
            Re-run an audit later to start a score trend here.
          </p>
        )}
      </div>
    </FadeIn>
  );
}

function FiguresStrip({ dashboard }: { dashboard: SiteDashboard }) {
  const { figures, quota } = dashboard;
  const { critical, warning, notice } = figures.openIssues;
  const totalIssues = critical + warning + notice;

  return (
    <Stagger className="border-line grid divide-y border-y sm:grid-cols-3 sm:divide-x sm:divide-y-0">
      <StaggerItem className="py-5 sm:px-6 sm:py-0">
        <Stat
          label="Open issues"
          value={totalIssues}
          caption={
            totalIssues > 0
              ? `${critical} critical, ${warning} worth fixing`
              : "Nothing outstanding from the last audit."
          }
        />
      </StaggerItem>

      <StaggerItem className="py-5 sm:px-6 sm:py-0">
        <Stat
          label="Keyword opportunities"
          value={figures.opportunityCount}
          caption="Content ideas ready to act on."
        />
      </StaggerItem>

      <StaggerItem className="py-5 sm:px-6 sm:py-0">
        <Stat
          label="Average position"
          value={figures.averagePosition ?? "—"}
          caption={
            figures.averagePosition !== null
              ? `Across ${quota.keywords.used} tracked keyword${quota.keywords.used === 1 ? "" : "s"}.`
              : "Checks your tracked keywords daily — the first result lands within a day."
          }
        />
      </StaggerItem>
    </Stagger>
  );
}

function NextActionSection({ dashboard }: { dashboard: SiteDashboard }) {
  const { nextAction } = dashboard;

  return (
    <section>
      <div className="eyebrow text-ink-300">Do this next</div>

      {nextAction ? (
        <Card variant="opportunity" className="mt-4">
          <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 max-w-[56ch]">
              <div className="text-ink-900 text-lg font-semibold tracking-tight">
                {nextAction.title}
              </div>
              <p className="text-ink-500 mt-1.5 text-sm leading-relaxed">
                {nextAction.rationale}
              </p>
            </div>

            {nextAction.reportUrl ? (
              <Button variant="outline" render={<Link href={nextAction.reportUrl} />}>
                View in report
                <ArrowRight />
              </Button>
            ) : null}
          </CardContent>
        </Card>
      ) : (
        <Empty className="border-line mt-4 rounded-2xl border">
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
  const maxShared = Math.max(1, ...competitors.map((c) => c.sharedTerms));

  return (
    <section className="grid gap-8 lg:grid-cols-[1.5fr_1fr] lg:gap-10">
      <div className="min-w-0">
        <div className="flex items-baseline justify-between gap-4">
          <div className="eyebrow text-ink-300">Average position</div>
          <span className="text-ink-300 text-xs-plus">Lower is better</span>
        </div>

        {averagePositionTrend ? (
          <Sparkline
            // Negated: position 1 is the best rank, so plotting it raw would
            // draw "better" as a dip. Flipping the sign makes the line read
            // the way the label says — "higher line = better position".
            values={averagePositionTrend.map((p) => -p.averagePosition)}
            height={140}
            className="mt-4"
            color="var(--color-ink-900)"
            fill
          />
        ) : (
          <Empty className="border-line mt-4 rounded-2xl border">
            <EmptyTitle>Building your position history</EmptyTitle>
            <EmptyDescription>
              We check every tracked keyword once a day — check back in a couple of days for a
              trend line.
            </EmptyDescription>
          </Empty>
        )}
      </div>

      <div className="min-w-0">
        <div className="eyebrow text-ink-300">Competitors</div>

        {competitors.length > 0 ? (
          <div className="mt-4 flex flex-col">
            {competitors.map((competitor) => (
              <div key={competitor.domain} className="border-line border-b py-3.5">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-ink-900 truncate text-sm font-medium">
                    {competitor.name ?? competitor.domain}
                  </span>
                  <span className="text-ink-400 shrink-0 text-xs">
                    {competitor.bestPosition ? `best #${competitor.bestPosition}` : "not ranked"}
                  </span>
                </div>
                <div className="bg-surface-sunken mt-2 h-[3px] overflow-hidden rounded-full">
                  <div
                    className="bg-opportunity h-full"
                    style={{ width: `${(competitor.sharedTerms / maxShared) * 100}%` }}
                  />
                </div>
                {competitor.notes ? (
                  <p className="text-ink-300 mt-1.5 text-xs leading-relaxed">
                    {competitor.notes}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        ) : (
          <Empty className="border-line mt-4 rounded-2xl border">
            <EmptyTitle>No competitors tracked</EmptyTitle>
            <EmptyDescription>None were confirmed for this site during setup.</EmptyDescription>
          </Empty>
        )}
      </div>
    </section>
  );
}

function ContentPipelineSection({ dashboard }: { dashboard: SiteDashboard }) {
  return (
    <section>
      <div className="eyebrow text-ink-300">Content pipeline</div>

      <Empty className="border-line mt-4 rounded-2xl border">
        <EmptyMedia variant="icon">
          <Search />
        </EmptyMedia>
        <EmptyTitle>Content generation is coming soon</EmptyTitle>
        <EmptyDescription>
          {dashboard.figures.opportunityCount > 0
            ? `${dashboard.figures.opportunityCount} opportunit${dashboard.figures.opportunityCount === 1 ? "y is" : "ies are"} ready to turn into drafts once this ships.`
            : "Nothing queued yet."}
        </EmptyDescription>
      </Empty>
    </section>
  );
}

/** Small hand-rolled line chart — no charting library, matching the source design's approach. */
function Sparkline({
  values,
  height = 40,
  color = "#0B1220",
  className,
  fill = false,
}: {
  values: number[];
  height?: number;
  color?: string;
  className?: string;
  fill?: boolean;
}) {
  if (values.length < 2) return null;

  const width = 320;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const coords = values.map((value, index) => {
    const x = (index / (values.length - 1)) * width;
    const y = height - ((value - min) / range) * (height - 4) - 2;
    return { x, y };
  });

  const line = coords.map((point) => `${point.x},${point.y}`).join(" ");
  const area = `0,${height} ${line} ${width},${height}`;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width="100%"
      height={height}
      preserveAspectRatio="none"
      className={cn("block overflow-visible", className)}
    >
      {fill ? <polygon points={area} className="fill-surface-sunken" /> : null}
      <polyline
        points={line}
        fill="none"
        stroke={color}
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
