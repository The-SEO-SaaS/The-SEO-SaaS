"use client";

import { ProgressBar, toneForScore } from "@theseosaas/ui/components/progress-bar";
import { cn } from "@theseosaas/ui/lib/utils";

/**
 * The SEO score, presented as a verdict rather than a number.
 *
 * The spec is explicit that "SEO Score: 74" is the wrong output and
 * "You're in a strong position to grow" is the right one — so the headline
 * here is the sentence, and the number is supporting evidence beside it.
 */
interface ScoreVerdictProps {
  score: number;
  technicalHealth: number | null;
  /** AI-written consultant verdict. Falls back to a banded default. */
  summary: string | null;
  className?: string;
}

/** Used only when the model didn't return a summary. */
function fallbackVerdict(score: number): string {
  if (score >= 80) {
    return "You're in a strong position. The fastest gains now come from publishing more content around high-intent keywords.";
  }
  if (score >= 60) {
    return "Your foundations are solid. A handful of fixes and a steady publishing cadence would move you ahead of most competitors in your space.";
  }
  if (score >= 40) {
    return "There's real ground to make up, and most of it is fixable. The technical issues below are worth clearing before you invest in content.";
  }
  return "Search isn't working for you yet. That's fixable — start with the critical issues below, then build out the pages your buyers are searching for.";
}

export function ScoreVerdict({
  score,
  technicalHealth,
  summary,
  className,
}: ScoreVerdictProps) {
  const tone = toneForScore(score);

  return (
    <div className={cn("space-y-5", className)}>
      {/* The number already appears in ScorePanel above, so this block leads
          with the verdict sentence — repeating the score would bury it. */}
      <p className="text-ink-700 max-w-[52ch] text-base leading-relaxed text-pretty sm:text-lg">
        {summary ?? fallbackVerdict(score)}
      </p>

      <div className="space-y-3">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-ink-400 text-sm">Overall</span>
            <span className="text-ink-700 text-sm font-medium tabular-nums">{score}/100</span>
          </div>
          <ProgressBar value={score} tone={tone} />
        </div>

        {technicalHealth !== null ? (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-ink-400 text-sm">Technical health</span>
              <span className="text-ink-700 text-sm font-medium tabular-nums">
                {technicalHealth}/100
              </span>
            </div>
            <ProgressBar value={technicalHealth} tone={toneForScore(technicalHealth)} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
