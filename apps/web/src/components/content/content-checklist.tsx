"use client";

import { cn } from "@theseosaas/ui/lib/utils";
import { Check } from "lucide-react";
import * as React from "react";

/**
 * The blog-post loader's checklist.
 *
 * Content generation is a single long model call — the worker reports no
 * per-step signal the way the audit crawl does (see `AUDIT_STEPS` /
 * `CrawlChecklist`). Rather than a bare spinner and "this takes a minute or
 * two", this advances through the same shape of thing that's actually
 * happening, timed to roughly match how long a post takes to write.
 *
 * It holds on the last step rather than ever reaching 100% on its own — the
 * real flip to GENERATED (via polling in `useContentItem`) is what actually
 * ends this screen. A checklist that finishes before the post exists would be
 * a worse lie than a plain spinner.
 */
const STEPS = [
  { label: "Reading the audit finding" },
  { label: "Researching the target keywords" },
  { label: "Writing the draft" },
  { label: "Polishing and formatting" },
] as const;

/** Roughly spread across the "a minute or two" generation actually takes. */
const STEP_INTERVAL_MS = 14000;

export function useContentProgressSteps(isActive: boolean): number {
  const [index, setIndex] = React.useState(0);

  React.useEffect(() => {
    if (!isActive) return;

    const timer = setInterval(() => {
      setIndex((current) => Math.min(current + 1, STEPS.length - 1));
    }, STEP_INTERVAL_MS);

    return () => clearInterval(timer);
  }, [isActive]);

  return index;
}

/** Never claims completion — caps just under 100 so the real flip still reads as the finish. */
export function progressPercentFor(activeIndex: number): number {
  return Math.min(92, Math.round(((activeIndex + 1) / STEPS.length) * 100));
}

export function ContentChecklist({
  activeIndex,
  className,
}: {
  activeIndex: number;
  className?: string;
}) {
  return (
    <div className={cn("border-t border-[#EDEFF3]", className)}>
      {STEPS.map((step, index) => {
        const isDone = activeIndex > index;
        const isActive = activeIndex === index;

        return (
          <div
            key={step.label}
            className="flex items-center gap-3.5 border-b border-[#F3F5F8] px-0.5 py-[15px]"
          >
            <span
              className={cn(
                "inline-flex size-[18px] shrink-0 items-center justify-center rounded-full border transition-colors",
                isDone && "border-success bg-success",
                isActive && "border-ink-900 bg-surface",
                !isDone && !isActive && "border-line bg-surface",
              )}
            >
              {isDone ? (
                <Check className="size-2.5 text-white" strokeWidth={2.6} />
              ) : isActive ? (
                <span className="bg-ink-900 size-1.5 animate-pulse rounded-full" />
              ) : null}
            </span>

            <span
              className={cn(
                "min-w-0 flex-1 text-[14px]",
                isDone && "text-ink-700 font-normal",
                isActive && "text-ink-900 font-medium",
                !isDone && !isActive && "text-ink-300 font-normal",
              )}
            >
              {step.label}
            </span>

            <span className="shrink-0 text-[12.5px] text-[#6B7480]">
              {isDone ? "done" : isActive ? "in progress" : "queued"}
            </span>
          </div>
        );
      })}
    </div>
  );
}
