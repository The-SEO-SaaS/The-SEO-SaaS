import { cn } from "@theseosaas/ui/lib/utils";
import { ArrowUp, Check } from "lucide-react";
import type * as React from "react";

/**
 * The floating proof cards flanking the hero headline.
 *
 * Traced from the design at ~214px wide with 18/20px padding, then stepped down
 * to 188px / 14/16px here. At the traced size the four cards crowded the
 * headline on a 1366px laptop and pushed the whole hero taller than one screen;
 * the smaller card keeps the same proportions and buys back the vertical space
 * the audit input needed. Border, radius, shadow and type scale are otherwise
 * the design's.
 *
 * Absolutely positioned, because that's how the design places them — floating in
 * the hero's whitespace rather than sitting in flow. Hidden below `xl`, where
 * they'd land on top of the headline.
 *
 * `title` takes a node rather than a string so a card can tint parts of its own
 * figure — "68 → 74" reads as a story when the two numbers are coloured and as a
 * fact when they aren't. These are Server Components, so JSX crosses no
 * serialization boundary here.
 */
export function ProofCard({
  className,
  eyebrow,
  title,
  footer,
  delta,
  spark,
  sparkTone = "neutral",
  footerCheck = false,
}: {
  className?: string;
  eyebrow: string;
  title: React.ReactNode;
  footer: string;
  delta?: { label: string; tone: "up" | "neutral" };
  /** SVG path for the inline trend line, when the card has one. */
  spark?: string;
  /** Colours the trend line. `up` is the growth green, matching the delta chip. */
  sparkTone?: "up" | "neutral";
  /** Renders a teal check before the footer, per the "gap closed" card. */
  footerCheck?: boolean;
}) {
  return (
    <div
      aria-hidden
      className={cn(
        "absolute hidden w-[188px] rounded-2xl border border-[#E2E6EC] bg-white px-4 py-[14px] shadow-[0_18px_40px_-24px_rgba(11,18,32,0.30)] xl:block",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10.5px] font-semibold tracking-[0.08em] text-[#6B7480]">
          {eyebrow}
        </span>

        {delta ? (
          delta.tone === "up" ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-[#EAF7EF] px-1.5 py-[1px] text-[11px] font-semibold text-[#15803D]">
              <ArrowUp className="size-[10px]" strokeWidth={2.4} />
              {delta.label}
            </span>
          ) : (
            <span className="rounded-full bg-[#FEF3E7] px-1.5 py-[1px] text-[11px] font-semibold text-[#B45309]">
              {delta.label}
            </span>
          )
        ) : null}
      </div>

      <div className="text-ink-900 mt-2 text-[14px] font-semibold tracking-[-0.015em]">
        {title}
      </div>

      {spark ? (
        // Growth lines read green; a neutral line stays ink so the colour still
        // means something when it does appear.
        <svg
          viewBox="0 0 190 40"
          width="100%"
          height="32"
          preserveAspectRatio="none"
          className="mt-2.5 block"
        >
          <path
            d={spark}
            fill="none"
            stroke={sparkTone === "up" ? "#15803D" : "#0B1220"}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      ) : null}

      {footerCheck ? (
        <div className="mt-2.5 flex items-center gap-2 border-t border-[#EDEFF3] pt-2.5">
          <Check className="size-[12px] shrink-0 text-[#0F766E]" strokeWidth={2.4} />
          <span className="text-[11.5px] text-[#5B6472]">{footer}</span>
        </div>
      ) : (
        <div className="mt-1.5 text-[11px] text-[#6B7480]">{footer}</div>
      )}
    </div>
  );
}
