"use client";

import { Button } from "@theseosaas/ui/components/button";
import { IconTile } from "@theseosaas/ui/components/icon-tile";
import { FadeIn } from "@theseosaas/ui/components/motion";
import { cn } from "@theseosaas/ui/lib/utils";
import { ArrowLeft, Check, Search } from "lucide-react";
import * as React from "react";

import type { OnboardingStepKey } from "@/lib/api";

/**
 * Chrome shared by every onboarding step.
 *
 * Four steps plus completion: site → competitors → keywords → plan. The design
 * also has a "voice" step feeding content-generation prompts; deferred to v0.2
 * since it only pays off once blog generation is tuned enough for voice to
 * change the output, and every step before the plan screen costs conversion.
 *
 * The design's layout is a fixed two-column desktop rail. Below `lg` that
 * becomes a horizontal progress strip — a vertical rail would push the actual
 * form below the fold on a phone.
 */
export const ONBOARDING_STEPS: {
  key: OnboardingStepKey;
  label: string;
  hint: string;
}[] = [
  { key: "site", label: "Your site", hint: "Confirm what we crawled" },
  { key: "competitors", label: "Competitors", hint: "Who takes your terms" },
  { key: "keywords", label: "Keywords", hint: "What we watch weekly" },
  { key: "plan", label: "Plan", hint: "Pick your limits" },
];

interface StepShellProps {
  step: OnboardingStepKey;
  eyebrow?: string;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
  onBack?: () => void;
  onContinue?: () => void;
  continueLabel?: string;
  continueDisabled?: boolean;
  isSubmitting?: boolean;
  error?: string | null;
  /** Shown above the buttons — usually a quota line like "3 of 3 used". */
  meta?: React.ReactNode;
}

export function StepShell({
  step,
  eyebrow = "Setup",
  title,
  subtitle,
  children,
  onBack,
  onContinue,
  continueLabel = "Continue",
  continueDisabled,
  isSubmitting,
  error,
  meta,
}: StepShellProps) {
  const activeIndex = ONBOARDING_STEPS.findIndex((s) => s.key === step);

  return (
    <div className="min-h-svh">
      <header className="border-line border-b">
        <div className="mx-auto flex max-w-5xl items-center gap-2.5 px-4 py-3.5 sm:px-6">
          <IconTile tone="ink" size="md">
            <Search />
          </IconTile>
          <span className="font-display text-ink-900 text-md font-semibold tracking-tight">
            TheSEOSaaS
          </span>
        </div>
      </header>

      <div className="mx-auto grid max-w-5xl gap-8 px-4 py-8 sm:px-6 sm:py-10 lg:grid-cols-[220px_1fr] lg:gap-12">
        <StepRail activeIndex={activeIndex} />

        <main className="min-w-0 space-y-7">
          <FadeIn key={step} className="space-y-2">
            <div className="eyebrow text-ink-300">
              {eyebrow} · Step {activeIndex + 1} of {ONBOARDING_STEPS.length}
            </div>
            <h1 className="font-display text-ink-900 text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
              {title}
            </h1>
            {subtitle ? (
              <p className="text-ink-400 max-w-[62ch] text-base leading-relaxed text-pretty">
                {subtitle}
              </p>
            ) : null}
          </FadeIn>

          <FadeIn key={`${step}-body`} delay={0.06}>
            {children}
          </FadeIn>

          {error ? (
            <div className="border-critical/20 bg-critical/5 text-critical-strong rounded-lg border px-3.5 py-2.5 text-sm">
              {error}
            </div>
          ) : null}

          <div className="border-line flex flex-col gap-3 border-t pt-5 sm:flex-row sm:items-center sm:justify-between">
            {meta ? <div className="text-ink-300 text-sm">{meta}</div> : <span />}

            <div className="flex items-center gap-2">
              {onBack ? (
                <Button variant="ghost" size="sm" onClick={onBack} disabled={isSubmitting}>
                  <ArrowLeft />
                  Back
                </Button>
              ) : null}

              {onContinue ? (
                <Button
                  onClick={onContinue}
                  disabled={continueDisabled || isSubmitting}
                  className="flex-1 sm:flex-none"
                >
                  {isSubmitting ? "Saving…" : continueLabel}
                </Button>
              ) : null}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

function StepRail({ activeIndex }: { activeIndex: number }) {
  return (
    <>
      {/* Desktop: vertical rail with hints, per the design. */}
      <nav className="hidden lg:block">
        <ol className="space-y-1">
          {ONBOARDING_STEPS.map((item, index) => {
            const isDone = index < activeIndex;
            const isActive = index === activeIndex;

            return (
              <li
                key={item.key}
                className={cn(
                  "flex items-start gap-3 rounded-lg px-2.5 py-2.5 transition-colors",
                  isActive && "bg-surface-sunken",
                )}
              >
                <StepMarker index={index} isDone={isDone} isActive={isActive} />
                <div className="min-w-0">
                  <div
                    className={cn(
                      "text-base font-medium",
                      isActive ? "text-ink-900" : isDone ? "text-ink-500" : "text-ink-300",
                    )}
                  >
                    {item.label}
                  </div>
                  <div className="text-ink-300 text-xs-plus">{item.hint}</div>
                </div>
              </li>
            );
          })}
        </ol>

        <p className="text-ink-300 mt-5 px-2.5 text-xs leading-relaxed">
          Takes about two minutes. Everything here can be changed later in Settings.
        </p>
      </nav>

      {/* Mobile: horizontal strip. A vertical rail would push the form below
          the fold before the user has seen a single field. */}
      <nav className="flex items-center gap-2 lg:hidden">
        {ONBOARDING_STEPS.map((item, index) => {
          const isDone = index < activeIndex;
          const isActive = index === activeIndex;

          return (
            <React.Fragment key={item.key}>
              <StepMarker index={index} isDone={isDone} isActive={isActive} />
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
      </nav>
    </>
  );
}

function StepMarker({
  index,
  isDone,
  isActive,
}: {
  index: number;
  isDone: boolean;
  isActive: boolean;
}) {
  return (
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
  );
}
