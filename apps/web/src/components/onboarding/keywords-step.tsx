"use client";

import { Badge } from "@theseosaas/ui/components/badge";
import { cn } from "@theseosaas/ui/lib/utils";
import { Check, Search } from "lucide-react";
import * as React from "react";

import type { OnboardingKeyword } from "@/lib/api";

/**
 * Step 3 — keywords.
 *
 * The design shows a table with volume and difficulty columns. We deliberately
 * don't have those: the spec cut traffic estimates on cost grounds, and
 * numbers derived from SERP data alone are guesswork presented as fact. Intent
 * and the reason a term matters are what we can state honestly, and they're
 * what actually drives the decision.
 *
 * Buying-intent terms arrive pre-ticked. Informational ones don't — a founder
 * with limited quota should spend it where the buyers are.
 */

const FILTERS = [
  { key: "all", label: "All" },
  { key: "buying", label: "Buying intent" },
  { key: "selected", label: "Selected" },
] as const;

type FilterKey = (typeof FILTERS)[number]["key"];

const INTENT_TONE = {
  TRANSACTIONAL: "opportunity",
  COMMERCIAL: "caution",
  INFORMATIONAL: "neutral",
  NAVIGATIONAL: "neutral",
} as const;

export function KeywordsStep({
  keywords,
  selected,
  limit,
  onToggle,
}: {
  keywords: OnboardingKeyword[];
  selected: Set<string>;
  limit: number;
  onToggle: (term: string) => void;
}) {
  const [filter, setFilter] = React.useState<FilterKey>("all");
  const [query, setQuery] = React.useState("");

  const visible = React.useMemo(() => {
    const needle = query.trim().toLowerCase();

    return keywords.filter((keyword) => {
      if (needle && !keyword.term.toLowerCase().includes(needle)) return false;
      if (filter === "buying") {
        return keyword.intent === "TRANSACTIONAL" || keyword.intent === "COMMERCIAL";
      }
      if (filter === "selected") return selected.has(keyword.term);
      return true;
    });
  }, [keywords, filter, query, selected]);

  const atLimit = selected.size >= limit;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((option) => (
            <button
              key={option.key}
              type="button"
              onClick={() => setFilter(option.key)}
              aria-pressed={filter === option.key}
              className={cn(
                "rounded-full border px-3 py-1.5 text-sm-plus font-medium transition-colors",
                filter === option.key
                  ? "border-ink-900 bg-ink-900 text-white"
                  : "border-line text-ink-500 hover:border-line-strong",
              )}
            >
              {option.label}
            </button>
          ))}
        </div>

        <div className="bg-surface border-line focus-within:border-ink-900 flex items-center gap-2 rounded-lg border px-3 py-2 transition-colors sm:w-56">
          <Search className="text-ink-300 size-3.5 shrink-0" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search keywords"
            aria-label="Search keywords"
            className="text-ink-900 placeholder:text-ink-300 min-w-0 flex-1 bg-transparent text-sm-plus outline-none"
          />
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="border-line text-ink-400 rounded-xl border border-dashed px-4 py-8 text-center text-sm">
          {query ? `Nothing matches "${query}".` : "No keywords in this view."}
        </div>
      ) : (
        <ul className="border-line divide-line divide-y overflow-hidden rounded-xl border">
          {visible.map((keyword) => {
            const isSelected = selected.has(keyword.term);
            const isBlocked = !isSelected && atLimit;

            return (
              <li key={keyword.term}>
                <button
                  type="button"
                  onClick={() => onToggle(keyword.term)}
                  disabled={isBlocked}
                  aria-pressed={isSelected}
                  className={cn(
                    "flex w-full items-start gap-3 px-3.5 py-3 text-left transition-colors sm:px-4",
                    isSelected ? "bg-surface" : "bg-surface hover:bg-surface-sunken",
                    isBlocked && "cursor-not-allowed opacity-50",
                  )}
                >
                  <span
                    className={cn(
                      "mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-sm border transition-colors",
                      isSelected
                        ? "bg-ink-900 border-ink-900 text-white"
                        : "border-line-strong bg-surface",
                    )}
                  >
                    {isSelected ? <Check className="size-3" strokeWidth={3} /> : null}
                  </span>

                  <span className="min-w-0 flex-1 space-y-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="text-ink-900 text-base font-medium">
                        {keyword.term}
                      </span>
                      <Badge tone={INTENT_TONE[keyword.intent]}>
                        {keyword.intent.toLowerCase()}
                      </Badge>
                    </span>

                    {keyword.rationale ? (
                      <span className="text-ink-400 block text-sm leading-relaxed">
                        {keyword.rationale}
                      </span>
                    ) : null}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
