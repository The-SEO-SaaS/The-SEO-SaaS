"use client";

import { Button } from "@theseosaas/ui/components/button";
import { Stagger, StaggerItem } from "@theseosaas/ui/components/motion";
import { cn } from "@theseosaas/ui/lib/utils";
import { Check, Plus } from "lucide-react";
import * as React from "react";

import type { OnboardingCompetitor } from "@/lib/api";

/**
 * Step 2 — competitors.
 *
 * Pre-selected from the audit, because they were found by matching who
 * actually ranks above this site rather than by asking the founder to guess.
 * Unticking is the primary interaction; adding is the exception.
 *
 * Design spec per row: a square checkbox, the domain at 14px semibold beside a
 * status badge, a 12.5px reason line beneath, and right-aligned stat columns
 * each with a 10px uppercase label over its value.
 *
 * The design's second stat is "THEIR SCORE" — a competitor's own SEO score. We
 * don't crawl competitor sites (that would multiply the cost of every free
 * audit), so that column is omitted rather than filled with a number we can't
 * stand behind. Shared terms is real and stays.
 */
export function CompetitorsStep({
  competitors,
  extra,
  selected,
  limit,
  onToggle,
  onAdd,
}: {
  competitors: OnboardingCompetitor[];
  extra: string[];
  selected: Set<string>;
  limit: number;
  onToggle: (domain: string) => void;
  onAdd: (domain: string) => void;
}) {
  const [draft, setDraft] = React.useState("");

  const rows: OnboardingCompetitor[] = [
    ...competitors,
    ...extra
      .filter((domain) => !competitors.some((c) => c.domain === domain))
      .map((domain) => ({
        id: domain,
        domain,
        name: null,
        notes: null,
        sharedTerms: 0,
        selected: true,
      })),
  ];

  const atLimit = selected.size >= limit;

  const handleAdd = (event: React.FormEvent) => {
    event.preventDefault();
    if (!draft.trim()) return;
    onAdd(draft);
    setDraft("");
  };

  return (
    <div className="space-y-7">
      {rows.length === 0 ? (
        <div className="border-line text-ink-400 rounded-xl border border-dashed px-4 py-8 text-center text-sm">
          We didn&apos;t find clear competitors during the audit. Add the sites you compete
          with below.
        </div>
      ) : (
        <Stagger className="flex flex-col" whenInView={false}>
          {rows.map((competitor) => {
            const isSelected = selected.has(competitor.domain);
            // Everything discovery finds ranks above us — that's how it finds
            // them. Anything else was typed in by the user.
            const isFromAudit = competitor.sharedTerms > 0;
            const isBlocked = !isSelected && atLimit;

            return (
              <StaggerItem key={competitor.domain}>
                <div
                  className={cn(
                    "border-line-soft flex items-start gap-3 border-b py-3.5",
                    !isSelected && "opacity-55",
                  )}
                >
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={isSelected}
                    aria-label={`Track ${competitor.domain}`}
                    disabled={isBlocked}
                    onClick={() => onToggle(competitor.domain)}
                    className={cn(
                      "mt-0.5 inline-flex size-[18px] shrink-0 items-center justify-center rounded-[5px] border transition-colors",
                      isSelected
                        ? "border-ink-900 bg-ink-900 text-white"
                        : "border-line bg-surface hover:border-line-strong",
                      isBlocked && "cursor-not-allowed opacity-50",
                    )}
                  >
                    {isSelected ? <Check className="size-3" strokeWidth={3} /> : null}
                  </button>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-ink-900 text-[14px] font-semibold tracking-[-0.01em]">
                        {competitor.domain}
                      </span>
                      <span
                        className={cn(
                          "rounded-full px-2 py-[2px] text-[10.5px] font-semibold",
                          isFromAudit
                            ? "bg-[#FEEFDC] text-[#B45309]"
                            : "bg-[#F1F3F7] text-[#6B7480]",
                        )}
                      >
                        {isFromAudit ? "Outranks you" : "Added by you"}
                      </span>
                    </div>

                    <p className="mt-1 text-[12.5px] leading-[1.55] text-[#6B7480]">
                      {competitor.notes ??
                        (isFromAudit
                          ? `Ranks above you on ${competitor.sharedTerms} of the terms we checked.`
                          : "We'll start tracking this one from the next sweep.")}
                    </p>
                  </div>

                  {isFromAudit ? (
                    <div className="shrink-0 text-right">
                      <div className="text-[10px] font-semibold tracking-[0.08em] text-[#9AA2AE]">
                        SHARED TERMS
                      </div>
                      <div className="text-ink-900 mt-1 text-[13px] font-medium tabular-nums">
                        {competitor.sharedTerms} terms
                      </div>
                    </div>
                  ) : null}
                </div>
              </StaggerItem>
            );
          })}
        </Stagger>
      )}

      <form onSubmit={handleAdd} className="space-y-2">
        <label htmlFor="add-competitor" className="text-ink-700 block text-[13px] font-medium">
          Add someone we missed
        </label>

        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="bg-surface border-line focus-within:border-ink-900 focus-within:ring-ring/10 flex min-w-0 flex-1 items-center gap-1.5 rounded-lg border px-3 py-2.5 transition-colors focus-within:ring-2 sm:max-w-[420px]">
            <span className="shrink-0 text-[13.5px] text-[#9AA2AE]">https://</span>
            <input
              id="add-competitor"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="competitor.com"
              className="text-ink-900 min-w-0 flex-1 bg-transparent text-[14px] outline-none placeholder:text-[#9AA2AE]"
              spellCheck={false}
              inputMode="url"
            />
          </div>

          <Button
            type="submit"
            variant="outline"
            disabled={!draft.trim() || atLimit}
            className="shrink-0"
          >
            <Plus />
            Add
          </Button>
        </div>
      </form>
    </div>
  );
}
