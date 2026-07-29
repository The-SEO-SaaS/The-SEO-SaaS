"use client";

import { Button } from "@theseosaas/ui/components/button";
import { cn } from "@theseosaas/ui/lib/utils";
import { ArrowLeft, Check } from "lucide-react";
import * as React from "react";

/**
 * Chrome shared by every onboarding step.
 *
 * The design has five steps plus a done screen: site → voice → competitors →
 * keywords → plan. Progress is always visible because a flow that shows its
 * length feels shorter than one that doesn't, and each step carries its own
 * "why" line so the user knows what a question buys them.
 */
export const ONBOARDING_STEPS = [
  { key: "site", label: "Site" },
  { key: "voice", label: "Voice" },
  { key: "competitors", label: "Competitors" },
  { key: "keywords", label: "Keywords" },
  { key: "plan", label: "Plan" },
] as const;

export type OnboardingStepKey = (typeof ONBOARDING_STEPS)[number]["key"];

interface StepShellProps {
  step: OnboardingStepKey;
  title: React.ReactNode;
  /** Why this step exists, in the user's terms. */
  subtitle?: React.ReactNode;
  children: React.ReactNode;
  onBack?: () => void;
  onContinue?: () => void;
  continueLabel?: string;
  continueDisabled?: boolean;
  isSubmitting?: boolean;
  /** Steps that pre-fill from the audit can be skipped without cost. */
  onSkip?: () => void;
  className?: string;
}

export function StepShell({
  step,
  title,
  subtitle,
  children,
  onBack,
  onContinue,
  continueLabel = "Continue",
  continueDisabled,
  isSubmitting,
  onSkip,
  className,
}: StepShellProps) {
  const activeIndex = ONBOARDING_STEPS.findIndex((s) => s.key === step);

  return (
    <div className={cn("mx-auto w-full max-w-xl space-y-8", className)}>
      <StepIndicator activeIndex={activeIndex} />

      <div className="space-y-2">
        <h1 className="font-display text-ink-900 text-3xl font-semibold tracking-tight">
          {title}
        </h1>
        {subtitle ? (
          <p className="text-ink-400 text-lg leading-relaxed">{subtitle}</p>
        ) : null}
      </div>

      <div>{children}</div>

      <div className="flex items-center justify-between gap-3">
        {onBack ? (
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft />
            Back
          </Button>
        ) : (
          <span />
        )}

        <div className="flex items-center gap-2">
          {onSkip ? (
            <Button variant="ghost" size="sm" onClick={onSkip}>
              Skip for now
            </Button>
          ) : null}

          {onContinue ? (
            <Button onClick={onContinue} disabled={continueDisabled || isSubmitting}>
              {isSubmitting ? "Saving…" : continueLabel}
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function StepIndicator({ activeIndex }: { activeIndex: number }) {
  return (
    <div className="flex items-center gap-2">
      {ONBOARDING_STEPS.map((step, index) => {
        const isDone = index < activeIndex;
        const isActive = index === activeIndex;

        return (
          <React.Fragment key={step.key}>
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "inline-flex size-[26px] shrink-0 items-center justify-center rounded-full text-xs font-medium transition-colors",
                  isDone && "bg-success text-white",
                  isActive && "bg-ink-900 text-white",
                  !isDone && !isActive && "bg-surface-sunken text-ink-300",
                )}
              >
                {isDone ? <Check className="size-3" strokeWidth={3} /> : index + 1}
              </span>

              <span
                className={cn(
                  "text-xs-plus hidden font-medium sm:inline",
                  isActive ? "text-ink-900" : "text-ink-300",
                )}
              >
                {step.label}
              </span>
            </div>

            {index < ONBOARDING_STEPS.length - 1 ? (
              <span
                className={cn(
                  "h-px flex-1 transition-colors",
                  isDone ? "bg-success" : "bg-line",
                )}
              />
            ) : null}
          </React.Fragment>
        );
      })}
    </div>
  );
}
