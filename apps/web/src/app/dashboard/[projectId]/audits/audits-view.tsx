"use client";

import { Button } from "@theseosaas/ui/components/button";
import { Empty, EmptyDescription, EmptyTitle } from "@theseosaas/ui/components/empty";
import { IconTile } from "@theseosaas/ui/components/icon-tile";
import { FadeIn } from "@theseosaas/ui/components/motion";
import { cn } from "@theseosaas/ui/lib/utils";
import { AlertTriangle, ArrowRight, RefreshCw, Search } from "lucide-react";
import Link from "next/link";

import { useAudits } from "@/hooks/use-audits";
import type {
  AuditHistoryEntry,
  AuditIssue,
  AuditReport,
  IssueCategory,
  IssueSeverity,
} from "@/lib/api";

/**
 * The audits screen — a detail view of the newest crawl, not a bare list.
 *
 * Design structure, matched: a #FAFAFB run-header band carrying the run's
 * inline metadata and actions, then a `minmax(0,1fr) 208px` body of grouped
 * findings beside a crawl-history rail.
 *
 * Departures, all for the same reason — the design assumes data this build
 * doesn't produce (HANDOVER.md, "Missing data the design assumes"):
 *
 *  - The header omits "traffic at risk" (no traffic data source) and the
 *    "weekly crawl · next Monday" line (audits are re-run on demand; only rank
 *    tracking is scheduled).
 *  - The primary action is "Run audit", not "Fix 3 critical" — automatic
 *    fixing isn't built, and a button that can't do what it says is worse than
 *    a plainer one.
 *
 * Responsive: the design is desktop-only. The rail drops below the findings
 * under `xl`, and the header band's two rows wrap.
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

  const latest = flow.latest;

  if (!latest) {
    return (
      <main className="flex flex-1 flex-col gap-6 px-4 py-8 sm:px-6 lg:px-10">
        {history.inFlight ? <InFlightNotice publicId={history.inFlight.publicId} /> : null}
        <Empty className="rounded-2xl border border-[#E2E6EC]">
          <EmptyTitle>No completed audits yet</EmptyTitle>
          <EmptyDescription>
            Run one to get your score, technical issues, competitors and keyword gaps.
          </EmptyDescription>
          <Button
            className="mt-4"
            onClick={flow.rerun}
            disabled={!history.canRerun || flow.isRerunning}
          >
            <RefreshCw className={cn(flow.isRerunning && "animate-spin")} />
            {flow.isRerunning ? "Starting…" : "Run audit"}
          </Button>
        </Empty>
      </main>
    );
  }

  return (
    <>
      <RunHeader
        entry={latest}
        report={flow.report ?? null}
        canRerun={history.canRerun}
        isRerunning={flow.isRerunning}
        onRerun={flow.rerun}
      />

      <div className="grid flex-1 items-start xl:grid-cols-[minmax(0,1fr)_208px]">
        <div className="min-w-0 px-4 pt-6 pb-10 sm:px-6 lg:px-9 lg:pt-[30px] lg:pb-15">
          {history.inFlight ? (
            <div className="mb-6">
              <InFlightNotice publicId={history.inFlight.publicId} />
            </div>
          ) : history.rerunBlockedReason ? (
            <p className="mb-6 text-[12.5px] text-[#6B7480]">{history.rerunBlockedReason}</p>
          ) : null}

          {flow.rerunError ? (
            <div className="border-critical/20 bg-critical/5 text-critical-strong mb-6 rounded-lg border px-3.5 py-2.5 text-[13px]">
              {flow.rerunError}
            </div>
          ) : null}

          {flow.report ? (
            <FindingsBody report={flow.report} />
          ) : flow.isReportLoading ? (
            <p className="text-[12.5px] text-[#6B7480]">Loading findings…</p>
          ) : null}
        </div>

        <CrawlHistoryRail audits={history.audits} latestId={latest.id} />
      </div>
    </>
  );
}

function InFlightNotice({ publicId }: { publicId: string }) {
  return (
    <FadeIn className="flex flex-wrap items-center justify-between gap-4 rounded-[14px] border border-[#E2E6EC] bg-[#F8F9FA] px-5 py-4">
      <div>
        <div className="text-[14px] font-medium text-[#0B1220]">An audit is running now</div>
        <p className="mt-0.5 text-[12.5px] text-[#6B7480]">
          It takes a couple of minutes. You don&apos;t need to stay on this page.
        </p>
      </div>
      <Button variant="outline" size="sm" render={<Link href={`/audit/${publicId}`} />}>
        Watch progress
        <ArrowRight />
      </Button>
    </FadeIn>
  );
}

/**
 * The run header band: 22px/36px on #FAFAFB with a #EDEFF3 rule, dense inline
 * metadata, and a divider-separated figure row — per the design, no headline
 * statement.
 */
function RunHeader({
  entry,
  report,
  canRerun,
  isRerunning,
  onRerun,
}: {
  entry: AuditHistoryEntry;
  report: AuditReport | null;
  canRerun: boolean;
  isRerunning: boolean;
  onRerun: () => void;
}) {
  const elapsed = formatElapsed(entry.startedAt ?? entry.createdAt, entry.completedAt);

  const figures: { label: string; value: string; delta: number | null }[] = [
    { label: "SEO score", value: entry.score !== null ? String(entry.score) : "—", delta: entry.scoreChange },
    { label: "Pages crawled", value: String(entry.pagesCrawled), delta: null },
    { label: "Findings", value: String(entry.issueCount), delta: null },
  ];

  if (report && report.technicalHealth !== null) {
    figures.push({ label: "Technical health", value: String(report.technicalHealth), delta: null });
  }

  return (
    <div className="border-b border-[#EDEFF3] bg-[#FAFAFB] px-4 py-5 sm:px-6 lg:px-9 lg:py-[22px]">
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <div className="flex min-w-0 flex-wrap items-center gap-3.5">
          <span className="text-[18px] font-semibold tracking-[-0.015em] whitespace-nowrap text-[#0B1220]">
            Crawl · {formatLongDate(entry.completedAt ?? entry.createdAt)}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#C6EBD1] bg-[#F0FDF4] px-[9px] py-0.5 text-[11.5px] font-medium whitespace-nowrap text-[#15803D]">
            <span className="h-[5px] w-[5px] rounded-full bg-[#16A34A]" />
            Complete
          </span>
          {elapsed ? (
            <span className="text-[12.5px] whitespace-nowrap text-[#6B7480]">
              {formatTime(entry.completedAt ?? entry.createdAt)} · {elapsed}
            </span>
          ) : null}
        </div>

        {/* The design says "Weekly crawl · next Monday 04:00". Audits are
            re-run on demand in this build — only rank tracking is scheduled —
            so this states what's actually automatic. */}
        <div className="shrink-0 text-[12.5px] text-[#6B7480]">
          Rank tracking runs daily · audits on demand
        </div>
      </div>

      <div className="mt-[18px] flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div className="flex flex-wrap items-stretch gap-6">
          {figures.map((figure, index) => (
            <div key={figure.label} className="flex items-stretch gap-6">
              {index > 0 ? <span className="hidden w-px bg-[#E4E7ED] sm:block" /> : null}
              <div>
                <div className="text-[11px] font-semibold tracking-[0.08em] text-[#6B7480] uppercase">
                  {figure.label}
                </div>
                <div className="mt-1.5 flex items-baseline gap-[7px]">
                  <span className="text-[19px] font-medium tracking-[-0.02em] text-[#0B1220]">
                    {figure.value}
                  </span>
                  {figure.delta !== null && figure.delta !== 0 ? (
                    <span
                      className={cn(
                        "text-[12px]",
                        figure.delta > 0 ? "text-[#16A34A]" : "text-[#DC2626]",
                      )}
                    >
                      {figure.delta > 0 ? "+" : ""}
                      {figure.delta}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex shrink-0 items-center gap-3.5">
          <Button variant="outline" size="sm" render={<Link href={`/audit/${entry.publicId}`} />}>
            Open report
          </Button>
          <Button size="sm" onClick={onRerun} disabled={!canRerun || isRerunning}>
            <RefreshCw className={cn(isRerunning && "animate-spin")} />
            {isRerunning ? "Starting…" : "Run audit"}
          </Button>
        </div>
      </div>
    </div>
  );
}

const SEVERITY_LEGEND: { severity: IssueSeverity; label: string; colour: string }[] = [
  { severity: "CRITICAL", label: "critical", colour: "#EA580C" },
  { severity: "WARNING", label: "worth fixing", colour: "#0B1220" },
  { severity: "NOTICE", label: "notices", colour: "#E1E5EB" },
];

const SEVERITY_DOT: Record<IssueSeverity, string> = {
  CRITICAL: "#EA580C",
  WARNING: "#0B1220",
  NOTICE: "#E1E5EB",
};

/** The design's four sections, in its order. */
const CATEGORY_GROUPS: { key: IssueCategory; label: string }[] = [
  { key: "TECHNICAL", label: "Technical" },
  { key: "ON_PAGE", label: "On-page" },
  { key: "CONTENT", label: "Content" },
  { key: "SPEED", label: "Speed" },
];

function FindingsBody({ report }: { report: AuditReport }) {
  const total = report.counts.critical + report.counts.warning + report.counts.notice;

  const legend = SEVERITY_LEGEND.map((entry) => ({
    ...entry,
    count:
      entry.severity === "CRITICAL"
        ? report.counts.critical
        : entry.severity === "WARNING"
          ? report.counts.warning
          : report.counts.notice,
  }));

  const byCategory = CATEGORY_GROUPS.map((group) => ({
    ...group,
    issues: report.issues.filter((issue) => issue.category === group.key),
    score: report.categories?.[group.key] ?? null,
  }));

  const hidden = Math.max(0, total - report.issues.length);

  return (
    <div className="min-w-0">
      {/* Severity legend as one 6px segmented bar, per the design. */}
      <div>
        <div className="flex h-[6px] gap-[2px] overflow-hidden rounded-[3px]">
          {legend.map((entry) =>
            entry.count > 0 ? (
              <div
                key={entry.severity}
                style={{
                  width: `${(entry.count / Math.max(1, total)) * 100}%`,
                  background: entry.colour,
                }}
              />
            ) : null,
          )}
          {total === 0 ? <div className="w-full bg-[#E1E5EB]" /> : null}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2">
          {legend.map((entry) => (
            <div key={entry.severity} className="flex items-center gap-2">
              <span
                className="h-[6px] w-[6px] rounded-full"
                style={{ background: entry.colour }}
              />
              <span className="text-[12.5px] text-[#3F4854]">
                {entry.count} {entry.label}
              </span>
            </div>
          ))}
          <div className="text-[12.5px] text-[#6B7480]">of {report.pagesCrawled} pages crawled</div>
        </div>
      </div>

      {byCategory.map((group) =>
        group.issues.length > 0 || group.score !== null ? (
          <FindingsSection
            key={group.key}
            label={group.label}
            issues={group.issues}
            score={group.score}
            isSpeed={group.key === "SPEED"}
          />
        ) : null,
      )}

      {report.healthy.length > 0 ? (
        <section className="mt-[38px]">
          <div className="flex items-center gap-3.5 border-b border-[#E4E7ED] pb-3">
            <span className="text-[15px] font-semibold tracking-[-0.01em] whitespace-nowrap text-[#0B1220]">
              Already right
            </span>
            <span className="h-[3px] min-w-10 flex-1 overflow-hidden rounded-[2px] bg-[#F1F3F7]">
              <span className="block h-full w-full bg-[#16A34A]" />
            </span>
            <span className="text-[13px] font-medium whitespace-nowrap text-[#0B1220]">
              {report.healthy.length}
            </span>
          </div>
          <ul className="mt-1">
            {report.healthy.map((item) => (
              <li
                key={item}
                className="grid grid-cols-[15px_minmax(0,1fr)] border-b border-[#F3F5F8] px-0.5 py-3.5"
              >
                <span className="mt-[7px] h-[6px] w-[6px] shrink-0 rounded-full bg-[#16A34A]" />
                <span className="min-w-0 text-[14px] font-medium text-[#0B1220]">{item}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {hidden > 0 ? (
        <p className="mt-[22px] text-[12.5px] leading-[1.6] text-[#6B7480]">
          {hidden} further finding{hidden === 1 ? " is" : "s are"} recorded but not listed here.{" "}
          <Link href={`/audit/${report.publicId}`} className="font-medium">
            Open the full report
          </Link>
        </p>
      ) : null}
    </div>
  );
}

function FindingsSection({
  label,
  issues,
  score,
  isSpeed,
}: {
  label: string;
  issues: AuditIssue[];
  score: number | null;
  isSpeed: boolean;
}) {
  const barColour = score === null ? "#E1E5EB" : score >= 75 ? "#16A34A" : score >= 50 ? "#B45309" : "#EA580C";

  return (
    <section className="mt-[38px]">
      {/* Section header: label · score bar · score — the design's shape. */}
      <div className="flex items-center gap-3.5 border-b border-[#E4E7ED] pb-3">
        <span
          className="text-[15px] font-semibold tracking-[-0.01em] whitespace-nowrap text-[#0B1220]"
          // Stated once, where it matters: an HTTP crawl can time the server,
          // not the browser. Claiming otherwise would be the one dishonest
          // thing on this page.
          title={
            isSpeed
              ? "Server response time across crawled pages. Not Core Web Vitals — measuring those needs a real browser."
              : undefined
          }
        >
          {label}
        </span>
        <span className="h-[3px] min-w-10 flex-1 overflow-hidden rounded-[2px] bg-[#F1F3F7]">
          <span
            className="block h-full"
            style={{ width: `${score ?? 0}%`, background: barColour }}
          />
        </span>
        <span className="text-[13px] font-medium whitespace-nowrap text-[#0B1220]">
          {score ?? "—"}
        </span>
      </div>

      {issues.length > 0 ? (
        issues.map((issue) => (
          <FindingRow key={issue.id} issue={issue} colour={SEVERITY_DOT[issue.severity]} />
        ))
      ) : (
        <p className="px-0.5 py-4 text-[12.5px] text-[#6B7480]">
          Nothing flagged here on the last crawl.
        </p>
      )}
    </section>
  );
}

function FindingRow({ issue, colour }: { issue: AuditIssue; colour: string }) {
  const affected = issue.affectedUrls.length;

  return (
    <div className="grid gap-5 border-b border-[#F3F5F8] px-0.5 py-4 sm:grid-cols-[minmax(0,1fr)_118px] sm:items-start">
      <div className="grid min-w-0 grid-cols-[15px_minmax(0,1fr)]">
        <span
          className="mt-[7px] h-[6px] w-[6px] shrink-0 rounded-full"
          style={{ background: colour }}
        />
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
            <span className="text-[14px] font-medium text-[#0B1220]">{issue.title}</span>
            {affected > 0 ? (
              <span className="text-[11.5px] text-[#6B7480]">
                {affected} page{affected === 1 ? "" : "s"}
              </span>
            ) : null}
          </div>
          <div className="mt-[5px] max-w-[64ch] text-[12.5px] leading-[1.55] text-[#6B7480]">
            {issue.whyItMatters}
          </div>
          {issue.howToFix ? (
            <details className="group mt-2">
              <summary className="cursor-pointer list-none text-[12.5px] font-medium text-[#0B1220] sm:hidden">
                How to fix
              </summary>
              <div className="mt-1.5 max-w-[64ch] text-[12.5px] leading-[1.55] text-[#5B6472]">
                {issue.howToFix}
              </div>
            </details>
          ) : null}
        </div>
      </div>

      {/* The design's action column reads "Fix automatically" / "Regenerate".
          Neither exists yet, so this reveals the fix we do have written down
          rather than offering an action that would no-op. */}
      <div className="hidden pt-px text-right text-[13px] font-medium text-[#0B1220] sm:block">
        {issue.howToFix ? (
          <span className="text-[#6B7480]">See fix above</span>
        ) : (
          <span className="text-[#9AA2AE]">—</span>
        )}
      </div>
    </div>
  );
}

/**
 * The 208px right rail: a dotted timeline of past runs, with the current one
 * ringed. Below `xl` it drops under the findings and loses its left rule.
 */
function CrawlHistoryRail({
  audits,
  latestId,
}: {
  audits: AuditHistoryEntry[];
  latestId: string;
}) {
  const shown = audits.slice(0, 8);

  return (
    <aside className="min-w-0 border-t border-[#EDEFF3] px-4 pt-6 pb-10 sm:px-6 xl:border-t-0 xl:border-l xl:px-6 xl:pt-[30px] xl:pb-15">
      <div className="text-[11px] font-semibold tracking-[0.1em] text-[#6B7480] uppercase">
        Crawl history
      </div>

      <div className="mt-[18px] flex flex-col">
        {shown.map((entry, index) => {
          const isCurrent = entry.id === latestId;
          const isLast = index === shown.length - 1;

          return (
            <div key={entry.id} className="grid grid-cols-[14px_minmax(0,1fr)] gap-2.5">
              <div className="flex flex-col items-center">
                <span
                  className={cn(
                    "shrink-0 rounded-full",
                    isCurrent ? "h-[9px] w-[9px] bg-[#0B1220]" : "h-[7px] w-[7px] bg-[#C6CDD8]",
                  )}
                  style={isCurrent ? { boxShadow: "0 0 0 3px rgba(11,18,32,0.10)" } : undefined}
                />
                {!isLast ? <span className="w-px flex-1 bg-[#E7EAEF]" /> : null}
              </div>

              <div className="min-w-0 pb-5">
                <div
                  className={cn(
                    "text-[13px]",
                    isCurrent ? "font-semibold text-[#0B1220]" : "font-normal text-[#3F4854]",
                  )}
                >
                  {formatShortDate(entry.completedAt ?? entry.createdAt)}
                </div>
                <div className="mt-[3px] flex items-baseline gap-[7px]">
                  <span className="text-[13px] text-[#3F4854]">
                    {entry.status === "COMPLETED" ? (entry.score ?? "—") : entry.status.toLowerCase()}
                  </span>
                  {entry.scoreChange !== null && entry.scoreChange !== 0 ? (
                    <span
                      className={cn(
                        "text-[11.5px]",
                        entry.scoreChange > 0 ? "text-[#16A34A]" : "text-[#DC2626]",
                      )}
                    >
                      {entry.scoreChange > 0 ? "+" : ""}
                      {entry.scoreChange}
                    </span>
                  ) : null}
                </div>
                {entry.status === "COMPLETED" ? (
                  <div className="mt-[3px] text-[11.5px] text-[#6B7480]">
                    {entry.pagesCrawled} pages
                  </div>
                ) : entry.summary ? (
                  <div className="text-critical mt-[3px] line-clamp-2 text-[11.5px]">
                    {entry.summary}
                  </div>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      {/* Design: "Weekly crawls on Mondays. Change schedule". Scheduled
          re-audits don't exist — this states the real cadence instead. */}
      <div className="border-t border-[#EDEFF3] pt-4 text-[12px] leading-[1.6] text-[#6B7480]">
        Audits run when you ask for one. Rank tracking updates daily on its own.
      </div>
    </aside>
  );
}

function formatLongDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

/** "8m 41s", matching the design's run duration. Null when still running. */
function formatElapsed(startIso: string, endIso: string | null): string | null {
  if (!endIso) return null;

  const seconds = Math.max(0, Math.round((Date.parse(endIso) - Date.parse(startIso)) / 1000));
  const minutes = Math.floor(seconds / 60);

  return minutes > 0 ? `${minutes}m ${seconds % 60}s` : `${seconds}s`;
}
