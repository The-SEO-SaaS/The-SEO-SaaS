"use client";

import { cn } from "@theseosaas/ui/lib/utils";
import { Check, Search } from "lucide-react";
import * as React from "react";

import type { OnboardingKeyword } from "@/lib/api";

/**
 * Step 3 — keywords.
 *
 * Design spec: filter tabs carrying counts, a search field opposite them, then
 * a flat table — a header row with a select-all box and column labels, and
 * rows of checkbox, term plus intent badge, and a reason line beneath.
 *
 * The design's table also has VOLUME, NOW and DIFFICULTY columns. None of the
 * three exist here: Serpex returns SERP results, not volume or difficulty, and
 * "NOW" is a live position that doesn't exist yet — nothing is tracked until
 * this step is saved. Those columns are omitted rather than filled with
 * plausible numbers, which on a screen whose whole job is choosing what to
 * spend quota on would be actively harmful.
 *
 * Intent labels match the Keywords page exactly, so a term reads the same here
 * as it does after setup.
 */
const INTENT_LABEL = {
  TRANSACTIONAL: "Ready to buy",
  COMMERCIAL: "Comparing",
  INFORMATIONAL: "Learning",
  NAVIGATIONAL: "Brand",
} as const;

const INTENT_STYLE = {
  TRANSACTIONAL: "bg-[#FEEFDC] text-[#B45309]",
  COMMERCIAL: "bg-[#FEEFDC] text-[#B45309]",
  INFORMATIONAL: "bg-[#D8F3E4] text-[#0F766E]",
  NAVIGATIONAL: "bg-[#F1F3F7] text-[#6B7480]",
} as const;

type FilterKey = "all" | "buying" | "brand";

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

  const counts = React.useMemo(
    () => ({
      all: keywords.length,
      buying: keywords.filter(
        (keyword) =>
          keyword.intent === "TRANSACTIONAL" || keyword.intent === "COMMERCIAL",
      ).length,
      brand: keywords.filter((keyword) => keyword.intent === "NAVIGATIONAL").length,
    }),
    [keywords],
  );

  const visible = React.useMemo(() => {
    const needle = query.trim().toLowerCase();

    return keywords.filter((keyword) => {
      if (needle && !keyword.term.toLowerCase().includes(needle)) return false;
      if (filter === "buying") {
        return keyword.intent === "TRANSACTIONAL" || keyword.intent === "COMMERCIAL";
      }
      if (filter === "brand") return keyword.intent === "NAVIGATIONAL";
      return true;
    });
  }, [keywords, filter, query]);

  const atLimit = selected.size >= limit;

  // Select-all acts on what's visible, not the whole list — otherwise it
  // silently selects rows the filter is hiding.
  const visibleSelected = visible.filter((keyword) => selected.has(keyword.term)).length;
  const allVisibleSelected = visible.length > 0 && visibleSelected === visible.length;

  const toggleAllVisible = () => {
    if (allVisibleSelected) {
      visible.forEach((keyword) => {
        if (selected.has(keyword.term)) onToggle(keyword.term);
      });
      return;
    }

    let room = limit - selected.size;
    for (const keyword of visible) {
      if (selected.has(keyword.term)) continue;
      if (room <= 0) break;
      onToggle(keyword.term);
      room -= 1;
    }
  };

  const tabs = [
    { key: "all" as const, label: "Suggested", count: counts.all },
    { key: "buying" as const, label: "Buying intent", count: counts.buying },
    { key: "brand" as const, label: "Branded", count: counts.brand },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-1.5">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setFilter(tab.key)}
              aria-pressed={filter === tab.key}
              className={cn(
                "rounded-full border px-3 py-1.5 text-[12.5px] font-medium transition-colors",
                filter === tab.key
                  ? "border-ink-900 bg-ink-900 text-white"
                  : "border-line text-ink-500 hover:border-line-strong",
              )}
            >
              {tab.label} · {tab.count}
            </button>
          ))}
        </div>

        <div className="bg-surface border-line focus-within:border-ink-900 flex items-center gap-2 rounded-lg border px-3 py-2 transition-colors sm:w-64">
          <Search className="size-3.5 shrink-0 text-[#9AA2AE]" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search or paste your own"
            aria-label="Search keywords"
            className="text-ink-900 min-w-0 flex-1 bg-transparent text-[13px] outline-none placeholder:text-[#9AA2AE]"
          />
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="border-line text-ink-400 rounded-xl border border-dashed px-4 py-8 text-center text-sm">
          {query ? `Nothing matches "${query}".` : "No keywords in this view."}
        </div>
      ) : (
        <div>
          <div className="border-line-strong flex items-center gap-3 border-b pb-2.5">
            <button
              type="button"
              role="checkbox"
              aria-checked={allVisibleSelected}
              aria-label="Select all shown"
              onClick={toggleAllVisible}
              className={cn(
                "inline-flex size-[18px] shrink-0 items-center justify-center rounded-[5px] border transition-colors",
                allVisibleSelected
                  ? "border-ink-900 bg-ink-900 text-white"
                  : "border-line bg-surface hover:border-line-strong",
              )}
            >
              {allVisibleSelected ? <Check className="size-3" strokeWidth={3} /> : null}
            </button>
            <span className="text-[10px] font-semibold tracking-[0.08em] text-[#9AA2AE]">
              KEYWORD
            </span>
          </div>

          <ul className="flex flex-col">
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
                      "border-line-soft flex w-full items-start gap-3 border-b py-3 text-left transition-opacity",
                      !isSelected && "opacity-60",
                      isBlocked && "cursor-not-allowed opacity-40",
                    )}
                  >
                    <span
                      className={cn(
                        "mt-0.5 inline-flex size-[18px] shrink-0 items-center justify-center rounded-[5px] border transition-colors",
                        isSelected
                          ? "border-ink-900 bg-ink-900 text-white"
                          : "border-line bg-surface",
                      )}
                    >
                      {isSelected ? <Check className="size-3" strokeWidth={3} /> : null}
                    </span>

                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="text-ink-900 text-[14px] font-medium">
                          {keyword.term}
                        </span>
                        <span
                          className={cn(
                            "rounded-full px-2 py-[2px] text-[10.5px] font-semibold",
                            INTENT_STYLE[keyword.intent],
                          )}
                        >
                          {INTENT_LABEL[keyword.intent]}
                        </span>
                      </span>

                      {keyword.rationale ? (
                        <span className="mt-1 block text-[12.5px] leading-[1.55] text-[#6B7480]">
                          {keyword.rationale}
                        </span>
                      ) : null}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
