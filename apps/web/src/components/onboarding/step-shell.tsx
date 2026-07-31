"use client";

import { BrandGlyph } from "@theseosaas/ui/components/brand-mark";
import { Button } from "@theseosaas/ui/components/button";
import { IconTile } from "@theseosaas/ui/components/icon-tile";
import { FadeIn } from "@theseosaas/ui/components/motion";
import { cn } from "@theseosaas/ui/lib/utils";
import { ArrowRight, Check } from "lucide-react";
import * as React from "react";

import type { OnboardingStepKey } from "@/lib/api";

/**
 * Onboarding chrome, matched to the design.
 *
 * Spec: a two-column screen. The left column is a fixed rail — logo, a "SETUP"
 * label opposite "Step N of M", a thin progress bar, then the step list where
 * each entry carries a title *and* a subtitle, and a contextual help card
 * pinned to the bottom. The right column is the step itself: eyebrow, title,
 * subtitle, content, and a footer with a muted note left and Back/Continue
 * right.
 *
 * The previous version was a top bar over a hint rail with the buttons in a
 * bordered footer — same information, none of the design's structure, and it
 * dropped the per-step help card entirely.
 *
 * The design has five steps; this build ships four. Its step 2, "Brand
 * context", needs somewhere to store tone and audience before it can do
 * anything, so it is deliberately absent rather than faked — see
 * ONBOARDING_STEPS below.
 *
 * Below `lg` the rail moves above the content as a compact progress strip: a
 * 248px column plus a form does not fit a phone, and the design has no mobile
 * view to copy.
 */
export const ONBOARDING_STEPS: {
  key: OnboardingStepKey;
  label: string;
  hint: string;
}[] = [
  { key: "site", label: "Your site", hint: "Domain, type, platform" },
  { key: "competitors", label: "Competitors", hint: "Who we watch weekly" },
  { key: "keywords", label: "Keywords", hint: "What we track" },
  { key: "plan", label: "Plan", hint: "Monthly article quota" },
];

interface StepShellProps {
  step: OnboardingStepKey;
  /** Uppercase label above the title, e.g. "COMPETITORS". */
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
  /** Muted note beside the buttons, e.g. "We check their pages weekly". */
  footerNote?: React.ReactNode;
  /** The rail's bottom card. Title plus body, per the design. */
  help?: { title: React.ReactNode; body: React.ReactNode };
}

export function StepShell({
  step,
  eyebrow,
  title,
  subtitle,
  children,
  onBack,
  onContinue,
  continueLabel = "Continue",
  continueDisabled,
  isSubmitting,
  error,
  footerNote,
  help,
}: StepShellProps) {
  const activeIndex = ONBOARDING_STEPS.findIndex((entry) => entry.key === step);
  const total = ONBOARDING_STEPS.length;
  const progress = ((activeIndex + 1) / total) * 100;

  return (
    /*
      The design floats the whole flow as a white card on a tinted canvas
      rather than running it edge to edge — that's the difference between the
      screenshots and what was shipping. The tint is subtle (#F4F5F7 against
      #FFFFFF) and does real work: it separates the rail from the page, gives
      the card a visible edge on a large monitor, and stops a 2560px display
      showing an unbroken white field with a 248px column stranded at one side.

      Padding only from `sm` up. On a phone the card would be a white rectangle
      inset in a grey one, which wastes the horizontal space the form needs.
    */
    <div className="min-h-svh bg-[#F4F5F7] sm:p-4 lg:p-6">
      <div className="mx-auto flex min-h-svh max-w-[1180px] flex-col overflow-hidden bg-white sm:min-h-[calc(100svh-2rem)] sm:rounded-2xl sm:border sm:border-[#E7EAEF] sm:shadow-[0_1px_2px_rgba(11,18,32,0.04)] lg:min-h-[calc(100svh-3rem)] lg:flex-row">
      {/* Rail */}
      <aside className="flex shrink-0 flex-col border-b border-[#EDEFF3] bg-surface px-5 pt-5 pb-4 lg:w-[248px] lg:border-r lg:border-b-0 lg:px-6 lg:pt-7 lg:pb-6">
        <div className="flex items-center gap-2.5">
          <IconTile tone="ink" size="brand">
            <BrandGlyph />
          </IconTile>
          <span className="font-display text-ink-900 text-[15px] font-semibold tracking-[-0.02em]">
            TheSEOSaaS
          </span>
        </div>

        <div className="mt-6 flex items-baseline justify-between gap-3 lg:mt-8">
          <span className="text-[10.5px] font-semibold tracking-[0.1em] text-[#6B7480]">
            SETUP
          </span>
          <span className="text-[11.5px] text-[#6B7480]">
            Step {activeIndex + 1} of {total}
          </span>
        </div>

        <div className="mt-2.5 h-[3px] w-full overflow-hidden rounded-full bg-[#F1F3F7]">
          <div
            className="bg-ink-900 h-full rounded-full transition-[width] duration-400 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Full list on desktop; the strip above carries mobile. */}
        <ol className="mt-5 hidden flex-col gap-0.5 lg:flex">
          {ONBOARDING_STEPS.map((entry, index) => {
            const isDone = index < activeIndex;
            const isActive = index === activeIndex;

            return (
              <li
                key={entry.key}
                className={cn(
                  "flex items-start gap-2.5 rounded-lg px-2 py-2 transition-colors",
                  isActive && "bg-[#F8F9FA] shadow-[inset_0_0_0_1px_#EDEFF3]",
                )}
              >
                <StepMarker index={index} isDone={isDone} isActive={isActive} />
                <div className="min-w-0 pt-px">
                  <div
                    className={cn(
                      "text-[13.5px] leading-tight",
                      isActive
                        ? "text-ink-900 font-semibold"
                        : isDone
                          ? "text-ink-700 font-medium"
                          : "font-normal text-[#9AA2AE]",
                    )}
                  >
                    {entry.label}
                  </div>
                  <div className="mt-0.5 text-[11.5px] leading-tight text-[#9AA2AE]">
                    {entry.hint}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>

        <div className="flex-1" />

        {help ? (
          <div className="mt-6 hidden rounded-xl border border-[#E2E6EC] bg-[#FAFBFC] px-4 py-3.5 lg:block">
            <div className="text-ink-900 text-[12.5px] font-medium">{help.title}</div>
            <p className="mt-1 text-[11.5px] leading-[1.55] text-[#6B7480]">{help.body}</p>
          </div>
        ) : null}
      </aside>

      {/* Step */}
      <main className="flex min-w-0 flex-1 flex-col px-5 py-7 sm:px-10 sm:py-9">
        <FadeIn key={step} className="min-w-0 flex-1">
          {eyebrow ? (
            <div className="text-[11px] font-semibold tracking-[0.12em] text-[#6B7480]">
              {eyebrow}
            </div>
          ) : null}

          <h1 className="font-display text-ink-900 mt-2.5 text-[24px] font-semibold tracking-[-0.028em] text-balance sm:text-[27px]">
            {title}
          </h1>

          {subtitle ? (
            <p className="mt-2.5 max-w-[62ch] text-[14px] leading-[1.6] text-[#5B6472]">
              {subtitle}
            </p>
          ) : null}

          <div className="mt-7">{children}</div>

          {error ? (
            <div className="border-critical/20 bg-critical/5 text-critical-strong mt-5 rounded-lg border px-3.5 py-2.5 text-sm">
              {error}
            </div>
          ) : null}
        </FadeIn>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
          {footerNote ? (
            <p className="text-[12.5px] text-[#6B7480]">{footerNote}</p>
          ) : (
            <span />
          )}

          <div className="flex items-center gap-2.5">
            {onBack ? (
              <Button variant="outline" size="sm" onClick={onBack} disabled={isSubmitting}>
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
                {!isSubmitting ? <ArrowRight /> : null}
              </Button>
            ) : null}
          </div>
        </div>
      </main>
      </div>
    </div>
  );
}

/**
 * Green check when done, filled ink square with the number when current, an
 * outlined circle when still ahead — the design's three states exactly.
 */
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
        "inline-flex size-[22px] shrink-0 items-center justify-center text-[11px] font-semibold",
        isDone && "bg-success rounded-md text-white",
        isActive && "bg-ink-900 rounded-md text-white",
        !isDone && !isActive && "rounded-full border border-[#DFE3EA] text-[#9AA2AE]",
      )}
    >
      {isDone ? <Check className="size-3" strokeWidth={3} /> : index + 1}
    </span>
  );
}
