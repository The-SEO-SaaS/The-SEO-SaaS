"use client";

import {
  CountUp,
  motion,
  usePrefersReducedMotion,
} from "@theseosaas/ui/components/motion";
import { cn } from "@theseosaas/ui/lib/utils";
import { Check, X } from "lucide-react";

/**
 * The category figures strip beneath the report head.
 *
 * Design spec: a 4-column grid with `gap:1px` over an #EDEFF3 background, so
 * the gaps read as hairline rules, and a 1px bottom border. Each cell is white
 * with 22px/28px padding: label 12.5px #6B7480 opposite a status chip
 * (10.5px / 600 / 0.04em, pill, with a check or cross), the score at 24px / 500
 * / -0.02em, a 4px bar capped at 150px, and an 11.5px note.
 *
 * The design shows four categories — Technical, On-page, Content, Speed. We
 * only compute two of them: the score is a weighted split of technical and
 * content health. On-page and Speed would need a Lighthouse/CWV pass that
 * doesn't exist yet, so they're omitted rather than filled with a plausible
 * number. Same grid, same cell design, two columns.
 */
export interface Category {
  label: string;
  score: number;
  note: string;
}

function bandOf(score: number): "good" | "fair" | "poor" {
  if (score >= 75) return "good";
  if (score >= 50) return "fair";
  return "poor";
}

const BAND = {
  good: {
    chip: "text-[#15803D] bg-[#DCFCE7] border-success-line",
    score: "text-[#15803D]",
    bar: "bg-[#16A34A]",
    label: "GOOD",
  },
  fair: {
    chip: "text-[#B45309] bg-[#FEF3C7] border-caution-line",
    score: "text-[#B45309]",
    bar: "bg-[#D97706]",
    label: "FAIR",
  },
  poor: {
    chip: "text-[#B91C1C] bg-[#FEE7E7] border-[#F6C9C9]",
    score: "text-[#B91C1C]",
    bar: "bg-[#DC2626]",
    label: "POOR",
  },
} as const;

export function CategoryStrip({
  categories,
  className,
}: {
  categories: Category[];
  className?: string;
}) {
  const reduced = usePrefersReducedMotion();

  if (categories.length === 0) return null;

  return (
    <div
      className={cn(
        "grid gap-px border-b border-[#EDEFF3] bg-[#EDEFF3] sm:grid-cols-2",
        className,
      )}
    >
      {categories.map((category, index) => {
        const band = BAND[bandOf(category.score)];
        const isGood = bandOf(category.score) === "good";

        return (
          <div key={category.label} className="bg-surface px-5 py-[22px] sm:px-7">
            <div className="flex items-center justify-between gap-2.5">
              <span className="text-[12.5px] text-[#6B7480]">{category.label}</span>
              <span
                className={cn(
                  "inline-flex items-center gap-[5px] rounded-full border px-2 py-[2px] text-[10.5px] font-semibold tracking-[0.04em] whitespace-nowrap",
                  band.chip,
                )}
              >
                {isGood ? (
                  <Check className="size-[9px]" strokeWidth={3} />
                ) : (
                  <X className="size-[9px]" strokeWidth={3} />
                )}
                {band.label}
              </span>
            </div>

            <div className="mt-[9px] flex items-baseline gap-1.5">
              <span
                className={cn("text-[24px] font-medium tracking-[-0.02em]", band.score)}
              >
                <CountUp value={category.score} />
              </span>
              <span className="text-[12px] text-[#6B7480]">/ 100</span>
            </div>

            {/*
              The bar fills as the number counts, staggered a beat per cell so
              the strip reads left to right rather than as two things twitching
              at once. Same decelerating curve as the score gauge above it.
            */}
            <div className="mt-3 h-1 w-full max-w-[150px] overflow-hidden rounded-sm bg-[#F1F3F7]">
              <motion.div
                className={cn("h-full", band.bar)}
                initial={reduced ? false : { width: 0 }}
                animate={{ width: `${category.score}%` }}
                transition={{
                  duration: reduced ? 0 : 0.9,
                  delay: reduced ? 0 : 0.08 * index,
                  ease: [0.16, 1, 0.3, 1],
                }}
              />
            </div>

            <p className="mt-2.5 text-[11.5px] leading-[1.5] text-[#6B7480]">
              {category.note}
            </p>
          </div>
        );
      })}
    </div>
  );
}
