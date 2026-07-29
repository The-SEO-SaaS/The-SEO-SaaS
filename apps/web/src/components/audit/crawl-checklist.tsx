"use client";

import { cn } from "@theseosaas/ui/lib/utils";
import { Check, Loader2 } from "lucide-react";

import { AUDIT_STEPS, type AuditStep } from "@/lib/api";

/**
 * The crawl loader.
 *
 * This screen does real work beyond passing time: it teaches a founder what
 * good SEO actually consists of, which is why each step is named in plain
 * language and revealed in sequence rather than hidden behind a spinner.
 */
interface CrawlChecklistProps {
  currentStep: AuditStep | null;
  /** 0–100 from the job row. */
  progress: number;
  className?: string;
}

export function CrawlChecklist({ currentStep, progress, className }: CrawlChecklistProps) {
  const activeIndex = currentStep
    ? AUDIT_STEPS.findIndex((step) => step.key === currentStep)
    : -1;

  return (
    <div className={cn("space-y-1", className)}>
      {AUDIT_STEPS.map((step, index) => {
        const isDone = activeIndex > index || progress >= 100;
        const isActive = activeIndex === index && progress < 100;
        const isPending = !isDone && !isActive;

        return (
          <div
            key={step.key}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors",
              isActive && "bg-surface-sunken",
            )}
          >
            <span
              className={cn(
                "inline-flex size-5 shrink-0 items-center justify-center rounded-sm transition-colors",
                isDone && "bg-success text-white",
                isActive && "bg-ink-900 text-white",
                isPending && "bg-surface-sunken text-ink-300",
              )}
            >
              {isDone ? (
                <Check className="size-3" strokeWidth={3} />
              ) : isActive ? (
                <Loader2 className="size-3 animate-spin" />
              ) : null}
            </span>

            <span
              className={cn(
                "text-base transition-colors",
                isDone && "text-ink-700",
                isActive && "text-ink-900 font-medium",
                isPending && "text-ink-300",
              )}
            >
              {step.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
