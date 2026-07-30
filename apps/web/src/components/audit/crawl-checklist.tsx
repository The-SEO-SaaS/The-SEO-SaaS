"use client";

import { cn } from "@theseosaas/ui/lib/utils";
import { Check } from "lucide-react";

import { AUDIT_STEPS, type AuditStep } from "@/lib/api";

/**
 * The crawl loader's checklist.
 *
 * Design spec per row: flex, gap 14px, 15px/2px padding, 1px #F3F5F8 bottom
 * rule. An 18px round marker (white check on green when done, a 6px ink dot
 * when running, empty when queued), a flex-1 label at 14px whose weight and
 * colour vary by state, and a right-aligned 12.5px #6B7480 detail column.
 *
 * That detail column was missing entirely before — the design uses it to say
 * what each step actually found ("413 URLs found", "248 of 412", "queued"),
 * which is most of what makes this screen feel like work happening rather than
 * a spinner with labels.
 *
 * The design mocks five steps; the pipeline really has seven. Labels come from
 * `AUDIT_STEPS` so the screen can't claim a step the backend doesn't run.
 */
interface CrawlChecklistProps {
  currentStep: AuditStep | null;
  /** 0–100 from the job row. */
  progress: number;
  /** Per-step detail text, keyed by step. Absent steps show the default. */
  details?: Partial<Record<AuditStep, string>>;
  className?: string;
}

export function CrawlChecklist({
  currentStep,
  progress,
  details,
  className,
}: CrawlChecklistProps) {
  const activeIndex = currentStep
    ? AUDIT_STEPS.findIndex((step) => step.key === currentStep)
    : -1;

  return (
    <div className={cn("border-t border-[#EDEFF3]", className)}>
      {AUDIT_STEPS.map((step, index) => {
        const isDone = activeIndex > index || progress >= 100;
        const isActive = activeIndex === index && progress < 100;

        return (
          <div
            key={step.key}
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
                <span className="bg-ink-900 size-1.5 rounded-full" />
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
              {details?.[step.key] ?? (isDone ? "done" : isActive ? "running" : "queued")}
            </span>
          </div>
        );
      })}
    </div>
  );
}
