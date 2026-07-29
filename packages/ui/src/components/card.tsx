import { cn } from "@theseosaas/ui/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

/**
 * Card, retuned to the design file.
 *
 * The design uses a real 1px border rather than shadcn's ring, and three
 * distinct sizes that appear consistently:
 *   panel — 16px radius, 26px padding, used for a whole screen section
 *   default — 12px radius, 16px/18px padding, the standard content block
 *   compact — 12px radius, tighter padding, for list rows
 */
const cardVariants = cva(
  "group/card flex flex-col bg-card text-card-foreground border border-line",
  {
    variants: {
      // Padding tightens on small screens — the design's 26px panel inset
      // eats most of a 375px viewport.
      variant: {
        default: "rounded-xl [--card-px:16px] [--card-py:14px] sm:[--card-px:18px] sm:[--card-py:16px]",
        panel: "rounded-2xl [--card-px:18px] [--card-py:18px] sm:[--card-px:26px] sm:[--card-py:26px]",
        compact: "rounded-xl [--card-px:14px] [--card-py:12px] sm:[--card-px:16px] sm:[--card-py:14px]",
        /** Sunken well for nested content. */
        well: "rounded-xl bg-surface-sunken border-line-soft [--card-px:14px] [--card-py:12px] sm:[--card-px:16px] sm:[--card-py:14px]",
        /** Draws attention to an opportunity without shouting. */
        opportunity:
          "rounded-xl bg-opportunity-surface border-opportunity-line [--card-px:16px] [--card-py:14px] sm:[--card-px:18px] sm:[--card-py:16px]",
      },
      elevated: {
        true: "shadow-[0_1px_2px_rgba(11,18,32,0.04)]",
        false: "",
      },
      interactive: {
        true: "transition-colors hover:border-line-strong cursor-pointer",
        false: "",
      },
    },
    defaultVariants: {
      variant: "default",
      elevated: false,
      interactive: false,
    },
  },
);

function Card({
  className,
  variant,
  elevated,
  interactive,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof cardVariants>) {
  return (
    <div
      data-slot="card"
      className={cn(
        cardVariants({ variant, elevated, interactive }),
        "gap-3 py-(--card-py)",
        className,
      )}
      {...props}
    />
  );
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "grid auto-rows-min items-start gap-1 px-(--card-px) has-data-[slot=card-action]:grid-cols-[1fr_auto]",
        className,
      )}
      {...props}
    />
  );
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      className={cn("font-display text-ink-900 text-lg font-semibold tracking-tight", className)}
      {...props}
    />
  );
}

/**
 * The "why it matters" line. Per the UX spec this is not optional decoration —
 * a card showing a finding without one is a bug.
 */
function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn("text-ink-400 text-sm leading-relaxed", className)}
      {...props}
    />
  );
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn("col-start-2 row-span-2 row-start-1 self-start justify-self-end", className)}
      {...props}
    />
  );
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="card-content" className={cn("px-(--card-px)", className)} {...props} />;
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn(
        "border-line mt-1 flex items-center gap-2 border-t px-(--card-px) pt-3",
        className,
      )}
      {...props}
    />
  );
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
  cardVariants,
};
