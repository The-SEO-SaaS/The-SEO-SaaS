"use client";

import { CountUp } from "@theseosaas/ui/components/motion";
import { cn } from "@theseosaas/ui/lib/utils";

import type { AuditReport } from "@/lib/api";

/**
 * The score block at the top of the report.
 *
 * Follows the design: a large number with its band, the 0–49 / 50–74 / 75+
 * scale for context, and severity counts written as consequences ("costing
 * traffic today") rather than bare labels.
 */

const BAND_LABEL = {
  POOR: "Needs work",
  FAIR: "Fair",
  GOOD: "Good",
} as const;

const BAND_TONE = {
  POOR: "text-critical",
  FAIR: "text-caution",
  GOOD: "text-success-strong",
} as const;

interface ScorePanelProps {
  score: number;
  band: AuditReport["band"];
  counts: AuditReport["counts"];
  className?: string;
}

export function ScorePanel({ score, band, counts, className }: ScorePanelProps) {
  const resolvedBand = band ?? (score >= 75 ? "GOOD" : score >= 50 ? "FAIR" : "POOR");

  return (
    <div className={cn("grid gap-6 sm:grid-cols-[auto_1fr] sm:gap-8", className)}>
      <div className="space-y-3">
        <div className="eyebrow text-ink-300">SEO score</div>

        <div className="flex items-baseline gap-1.5">
          <span className="font-display text-ink-900 text-4xl leading-none font-semibold sm:text-5xl">
            {/* Counts up — the score lands as an arrival rather than a number
                that was simply always sitting there. */}
            <CountUp value={score} />
          </span>
          <span className="text-ink-300 text-base sm:text-lg">/ 100</span>
        </div>

        <div className={cn("text-sm font-semibold uppercase", BAND_TONE[resolvedBand])}>
          {BAND_LABEL[resolvedBand]}
        </div>

        {/* The scale gives the number meaning without a paragraph of copy. */}
        <div className="text-ink-300 space-y-0.5 text-2xs">
          <div className={cn(resolvedBand === "POOR" && "text-critical font-semibold")}>
            0–49 poor
          </div>
          <div className={cn(resolvedBand === "FAIR" && "text-caution font-semibold")}>
            50–74 fair
          </div>
          <div className={cn(resolvedBand === "GOOD" && "text-success-strong font-semibold")}>
            75+ good
          </div>
        </div>
      </div>

      <div className="space-y-3 self-center">
        <SeverityRow
          count={counts.critical}
          label="critical"
          consequence="costing traffic today"
          tone="critical"
        />
        <SeverityRow
          count={counts.warning}
          label="worth fixing"
          consequence="this month"
          tone="caution"
        />
        <SeverityRow
          count={counts.notice}
          label="notices"
          consequence="safe to leave"
          tone="neutral"
        />
      </div>
    </div>
  );
}

const DOT_TONE = {
  critical: "bg-critical",
  caution: "bg-caution",
  neutral: "bg-ink-300",
} as const;

function SeverityRow({
  count,
  label,
  consequence,
  tone,
}: {
  count: number;
  label: string;
  consequence: string;
  tone: keyof typeof DOT_TONE;
}) {
  return (
    <div className="flex items-baseline gap-2.5">
      <span className={cn("size-1.5 shrink-0 rounded-full", DOT_TONE[tone])} />
      <span className="text-ink-900 text-md font-medium tabular-nums">
        {count} {label}
      </span>
      <span className="text-ink-300 text-sm">— {consequence}</span>
    </div>
  );
}
