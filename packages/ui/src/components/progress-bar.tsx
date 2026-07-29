import { cn } from "@theseosaas/ui/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

/**
 * Thin track-and-fill bar. Used for the SEO score, technical health, the audit
 * crawl progress, and plan usage meters.
 *
 * Tone is meaningful: the same bar reads as healthy, caution, or critical
 * depending on the value, so `toneForScore` exists to keep that mapping in one
 * place rather than re-deciding thresholds at each call site.
 */
const fillVariants = cva("h-full rounded-full transition-[width] duration-500 ease-out", {
  variants: {
    tone: {
      ink: "bg-ink-900",
      success: "bg-success",
      opportunity: "bg-opportunity",
      caution: "bg-caution",
      critical: "bg-critical",
    },
  },
  defaultVariants: { tone: "ink" },
});

export function toneForScore(score: number): "success" | "caution" | "critical" {
  if (score >= 70) return "success";
  if (score >= 40) return "caution";
  return "critical";
}

interface ProgressBarProps
  extends Omit<React.ComponentProps<"div">, "children">,
    VariantProps<typeof fillVariants> {
  /** 0–100. Clamped, so a bad value can't overflow the track. */
  value: number;
  thickness?: "thin" | "default" | "thick";
}

const THICKNESS = {
  thin: "h-1",
  default: "h-1.5",
  thick: "h-2",
} as const;

function ProgressBar({
  className,
  value,
  tone,
  thickness = "default",
  ...props
}: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, value));

  return (
    <div
      data-slot="progress-bar"
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn(
        "bg-surface-sunken w-full overflow-hidden rounded-full",
        THICKNESS[thickness],
        className,
      )}
      {...props}
    >
      <div className={cn(fillVariants({ tone }))} style={{ width: `${clamped}%` }} />
    </div>
  );
}

export { ProgressBar };
