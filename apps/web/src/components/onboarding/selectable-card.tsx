"use client";

import { cn } from "@theseosaas/ui/lib/utils";
import { Check } from "lucide-react";
import * as React from "react";

/**
 * Multi-select option card, used across the onboarding steps for brand voice,
 * competitors and keywords.
 *
 * Multi-select rather than single-choice on purpose: the onboarding research
 * is clear that forcing one answer makes a product feel narrower than it is,
 * and our steps pre-fill from real audit findings where several options are
 * genuinely true at once.
 */
interface SelectableCardProps extends Omit<React.ComponentProps<"button">, "onSelect"> {
  selected: boolean;
  onSelect: () => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  /** Shown on the right — a domain, rank, or volume hint. */
  meta?: React.ReactNode;
  icon?: React.ReactNode;
}

export function SelectableCard({
  selected,
  onSelect,
  title,
  description,
  meta,
  icon,
  className,
  ...props
}: SelectableCardProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        "flex w-full items-start gap-3 rounded-xl border px-4 py-3.5 text-left transition-colors",
        selected
          ? "border-ink-900 bg-surface ring-ink-900/5 ring-2"
          : "border-line bg-surface hover:border-line-strong",
        className,
      )}
      {...props}
    >
      {icon ? <span className="mt-0.5 shrink-0">{icon}</span> : null}

      <span className="min-w-0 flex-1 space-y-1">
        <span className="text-ink-900 block text-base font-medium">{title}</span>
        {description ? (
          <span className="text-ink-400 block text-sm leading-relaxed">{description}</span>
        ) : null}
      </span>

      {meta ? <span className="text-ink-300 text-xs-plus shrink-0 pt-0.5">{meta}</span> : null}

      <span
        className={cn(
          "mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-sm border transition-colors",
          selected ? "bg-ink-900 border-ink-900 text-white" : "border-line-strong bg-surface",
        )}
      >
        {selected ? <Check className="size-3" strokeWidth={3} /> : null}
      </span>
    </button>
  );
}
