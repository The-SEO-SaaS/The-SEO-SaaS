import { cn } from "@theseosaas/ui/lib/utils";
import { ArrowUp, Check } from "lucide-react";

/**
 * The floating proof cards flanking the hero headline.
 *
 * Design spec, traced exactly: ~212–214px wide, 1px #E2E6EC border, 16px
 * radius, white fill, 18px/20px padding, shadow 0 18px 40px -24px
 * rgba(11,18,32,0.30). Eyebrow 11px/600/0.08em/#6B7480, title 15px/600/-0.015em,
 * footer 11.5px/#6B7480.
 *
 * Absolutely positioned, because that is how the design places them — floating
 * over the hero's whitespace rather than sitting in flow. They are hidden below
 * `xl`: the design has no mobile view, and at narrow widths they would land on
 * top of the headline.
 */
export function ProofCard({
  className,
  eyebrow,
  title,
  footer,
  delta,
  spark,
  footerCheck = false,
}: {
  className?: string;
  eyebrow: string;
  title: string;
  footer: string;
  delta?: { label: string; tone: "up" | "neutral" };
  /** SVG path for the inline trend line, when the card has one. */
  spark?: string;
  /** Renders a teal check before the footer, per the "gap closed" card. */
  footerCheck?: boolean;
}) {
  return (
    <div
      aria-hidden
      className={cn(
        "absolute hidden w-[214px] rounded-2xl border border-[#E2E6EC] bg-white px-5 py-[18px] shadow-[0_18px_40px_-24px_rgba(11,18,32,0.30)] xl:block",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2.5">
        <span className="text-[11px] font-semibold tracking-[0.08em] text-[#6B7480]">
          {eyebrow}
        </span>

        {delta ? (
          delta.tone === "up" ? (
            <span className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-[#15803D]">
              <ArrowUp className="size-[11px]" strokeWidth={2.2} />
              {delta.label}
            </span>
          ) : (
            <span className="text-[11.5px] font-medium text-[#EA580C]">{delta.label}</span>
          )
        ) : null}
      </div>

      <div className="text-ink-900 mt-2.5 text-[15px] font-semibold tracking-[-0.015em]">
        {title}
      </div>

      {spark ? (
        <svg
          viewBox="0 0 190 40"
          width="100%"
          height="40"
          preserveAspectRatio="none"
          className="mt-3 block"
        >
          <path
            d={spark}
            fill="none"
            stroke="#0B1220"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      ) : null}

      {footerCheck ? (
        <div className="mt-3 flex items-center gap-2 border-t border-[#EDEFF3] pt-3">
          <Check className="size-[13px] shrink-0 text-[#0F766E]" strokeWidth={2.3} />
          <span className="text-[12px] text-[#5B6472]">{footer}</span>
        </div>
      ) : (
        <div className="mt-2 text-[11.5px] text-[#6B7480]">{footer}</div>
      )}
    </div>
  );
}
