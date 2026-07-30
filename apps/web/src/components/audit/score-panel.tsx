"use client";

import { CountUp } from "@theseosaas/ui/components/motion";
import { cn } from "@theseosaas/ui/lib/utils";
import { AlertTriangle, CheckCircle2, Info, X } from "lucide-react";

import type { AuditReport } from "@/lib/api";

/**
 * The score card in the report head.
 *
 * Design spec: a band-tinted card, min-width 296px, 14px radius, 22px/24px
 * padding. "SEO SCORE" eyebrow opposite a band chip, the score at 52px / 500 /
 * -0.035em in the band colour, then a three-segment gauge with a needle at the
 * score's position, the band legend, and severity counts as consequences.
 *
 * Previously this was a plain two-column block with a bulleted list — same
 * information, none of the design's structure. The gauge in particular is what
 * makes a bare number mean something at a glance.
 *
 * Tints are band-derived: the design shows the POOR state, so FAIR and GOOD use
 * the palette's caution and success families at the same weights.
 */
const BAND_STYLE = {
  POOR: {
    card: "border-[#F0C9C9] bg-[#FEF6F6]",
    rule: "border-[#F0D6D6]",
    score: "text-[#B91C1C]",
    chip: "text-[#B91C1C] bg-[#FEE7E7] border-[#F6C9C9]",
    label: "NEEDS WORK",
  },
  FAIR: {
    card: "border-caution-line bg-caution-surface",
    rule: "border-caution-line",
    score: "text-[#B45309]",
    chip: "text-[#B45309] bg-[#FEF3C7] border-caution-line",
    label: "FAIR",
  },
  GOOD: {
    card: "border-success-line bg-success-surface",
    rule: "border-success-line",
    score: "text-[#15803D]",
    chip: "text-[#15803D] bg-[#DCFCE7] border-success-line",
    label: "HEALTHY",
  },
} as const;

interface ScorePanelProps {
  score: number;
  band: AuditReport["band"];
  counts: AuditReport["counts"];
  className?: string;
}

export function ScorePanel({ score, band, counts, className }: ScorePanelProps) {
  const resolvedBand = band ?? (score >= 75 ? "GOOD" : score >= 50 ? "FAIR" : "POOR");
  const style = BAND_STYLE[resolvedBand];
  const BandIcon = resolvedBand === "GOOD" ? CheckCircle2 : AlertTriangle;

  return (
    <div
      className={cn(
        "w-full rounded-[14px] border px-6 py-[22px] sm:min-w-[296px]",
        style.card,
        className,
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-[11px] font-semibold tracking-[0.1em] text-[#6B7480]">
          SEO SCORE
        </span>
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-[3px] text-[11px] font-semibold tracking-[0.04em]",
            style.chip,
          )}
        >
          <BandIcon className="size-[11px]" strokeWidth={2} />
          {style.label}
        </span>
      </div>

      <div className="mt-3.5 flex items-baseline gap-2">
        <span
          className={cn(
            "text-[52px] leading-none font-medium tracking-[-0.035em]",
            style.score,
          )}
        >
          <CountUp value={score} />
        </span>
        <span className="text-[14px] text-[#6B7480]">/ 100</span>
      </div>

      {/* Gauge: the three bands at their real widths, with a needle at the score. */}
      <div className="relative mt-[18px]">
        <div className="flex h-1.5 gap-[2px] overflow-hidden rounded-[3px]">
          <div className="w-1/2 bg-[#DC2626]" />
          <div className="w-1/4 bg-[#D97706]" />
          <div className="w-1/4 bg-[#16A34A]" />
        </div>
        <div
          className="bg-ink-900 absolute -top-1 h-3.5 w-[2px] rounded-[1px]"
          style={{ left: `${Math.max(0, Math.min(100, score))}%` }}
        />
      </div>

      <div className="mt-2 flex justify-between text-[10.5px] font-semibold">
        <span className="text-[#B91C1C]">0–49 POOR</span>
        <span className="text-[#B45309]">50–74 FAIR</span>
        <span className="text-[#15803D]">75+ GOOD</span>
      </div>

      <div className={cn("mt-[18px] flex flex-col gap-2 border-t pt-4", style.rule)}>
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

const MARK_TONE = {
  critical: { box: "bg-[#DC2626]", Icon: X },
  caution: { box: "bg-[#D97706]", Icon: AlertTriangle },
  neutral: { box: "bg-[#C6CDD8]", Icon: Info },
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
  tone: keyof typeof MARK_TONE;
}) {
  const { box, Icon } = MARK_TONE[tone];

  return (
    <div className="flex items-center gap-[9px]">
      <span
        className={cn(
          "inline-flex size-3.5 shrink-0 items-center justify-center rounded",
          box,
        )}
      >
        <Icon className="size-2 text-white" strokeWidth={3} />
      </span>
      <span className="text-[12.5px] text-[#28303C]">
        <strong className="font-semibold tabular-nums">
          {count} {label}
        </strong>{" "}
        — {consequence}
      </span>
    </div>
  );
}
