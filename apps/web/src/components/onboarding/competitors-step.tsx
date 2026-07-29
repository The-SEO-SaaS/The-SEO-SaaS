"use client";

import { Badge } from "@theseosaas/ui/components/badge";
import { Button } from "@theseosaas/ui/components/button";
import { Stagger, StaggerItem } from "@theseosaas/ui/components/motion";
import { Plus } from "lucide-react";
import * as React from "react";

import { SelectableCard } from "@/components/onboarding/selectable-card";
import type { OnboardingCompetitor } from "@/lib/api";

/**
 * Step 2 — competitors.
 *
 * Pre-selected from the audit, because they were found by matching who
 * actually ranks above this site rather than by asking the founder to guess.
 * Unticking is the primary interaction; adding is the exception.
 *
 * The design shows a competitor SEO score here. We don't crawl competitor
 * sites — that would multiply the cost of every free audit — so shared ranking
 * terms stands in, which is the signal we genuinely have.
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
    <div className="space-y-6">
      {rows.length === 0 ? (
        <div className="border-line text-ink-400 rounded-xl border border-dashed px-4 py-8 text-center text-sm">
          We didn&apos;t find clear competitors during the audit. Add the sites you compete
          with below.
        </div>
      ) : (
        <Stagger className="space-y-2.5" whenInView={false}>
          {rows.map((competitor) => {
            const isSelected = selected.has(competitor.domain);

            return (
              <StaggerItem key={competitor.domain}>
                <SelectableCard
                  selected={isSelected}
                  // Blocked only when adding another would exceed the limit —
                  // unticking must always stay available, or a user at the cap
                  // can't change their mind.
                  disabled={!isSelected && atLimit}
                  onSelect={() => onToggle(competitor.domain)}
                  title={competitor.domain}
                  description={
                    competitor.notes ??
                    (competitor.sharedTerms > 0
                      ? `Ranks above you for ${competitor.sharedTerms} of the terms we checked.`
                      : "Added by you.")
                  }
                  meta={
                    competitor.sharedTerms > 0 ? (
                      <Badge tone="opportunity" shape="pill">
                        {competitor.sharedTerms} shared
                      </Badge>
                    ) : null
                  }
                />
              </StaggerItem>
            );
          })}
        </Stagger>
      )}

      <form onSubmit={handleAdd} className="space-y-2">
        <label htmlFor="add-competitor" className="text-ink-700 block text-base font-medium">
          Add someone we missed
        </label>

        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="bg-surface border-line focus-within:border-ink-900 focus-within:ring-ring/10 flex min-w-0 flex-1 items-center gap-1.5 rounded-lg border px-3 py-2.5 transition-colors focus-within:ring-2">
            <span className="text-ink-300 shrink-0 text-base">https://</span>
            <input
              id="add-competitor"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="competitor.com"
              className="text-ink-900 placeholder:text-ink-300 min-w-0 flex-1 bg-transparent text-base outline-none"
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

        <p className="text-ink-300 text-sm">
          We check their new pages weekly and log what changed.
        </p>
      </form>
    </div>
  );
}
