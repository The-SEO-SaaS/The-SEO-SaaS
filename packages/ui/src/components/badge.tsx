import { cn } from "@theseosaas/ui/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

/**
 * Badge, extracted from the design's status chips.
 *
 * The design has two distinct shapes that both appear frequently:
 *   rounded — 5–6px radius, uppercase-ish label, used for inline status tags
 *   pill — 999px radius, used for filters and standalone chips
 *
 * Colour is semantic, never decorative: opportunity = act now, success =
 * healthy, caution = watch, critical = fix now.
 */
const badgeVariants = cva(
  "inline-flex items-center gap-1 whitespace-nowrap font-semibold border",
  {
    variants: {
      tone: {
        neutral: "bg-surface-sunken text-ink-500 border-line",
        opportunity: "bg-opportunity-surface text-opportunity border-opportunity-line",
        success: "bg-success-surface text-success-strong border-success-line",
        caution: "bg-caution-surface text-caution border-caution-line",
        critical: "bg-critical/5 text-critical-strong border-critical/20",
        info: "bg-info-surface text-info border-transparent",
        /** Inverted — used for "Recommended" on the highlighted plan. */
        ink: "bg-ink-900 text-white border-transparent",
      },
      shape: {
        rounded: "rounded-xs px-1.5 py-px text-2xs tracking-[0.04em]",
        pill: "rounded-full px-2 py-0.5 text-xs-plus",
      },
    },
    defaultVariants: {
      tone: "neutral",
      shape: "rounded",
    },
  },
);

function Badge({
  className,
  tone,
  shape,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return (
    <span
      data-slot="badge"
      className={cn(badgeVariants({ tone, shape }), className)}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
