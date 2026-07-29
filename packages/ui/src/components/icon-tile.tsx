import { cn } from "@theseosaas/ui/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

/**
 * The rounded square that holds an icon. Appears on nearly every screen: the
 * logo mark, section headers, list-row leading icons, empty states.
 *
 * Sizes and radii are lifted from the design: 30px/9px for the logo mark,
 * 40px/12px for section icons, 20–22px/6–7px for inline status marks.
 */
const iconTileVariants = cva(
  "inline-flex shrink-0 items-center justify-center [&_svg]:shrink-0",
  {
    variants: {
      tone: {
        ink: "bg-ink-900 text-white",
        neutral: "bg-surface-sunken text-ink-500",
        opportunity: "bg-opportunity-surface text-opportunity",
        success: "bg-success-surface text-success-strong",
        caution: "bg-caution-surface-alt text-caution",
        critical: "bg-critical/10 text-critical",
        info: "bg-info-surface text-info",
        /** Solid fill for check marks and status dots. */
        "success-solid": "bg-success text-white",
        "critical-solid": "bg-critical text-white",
      },
      size: {
        xs: "size-5 rounded-sm [&_svg]:size-3",
        sm: "size-[22px] rounded-[7px] [&_svg]:size-3.5",
        md: "size-[30px] rounded-[9px] [&_svg]:size-4",
        lg: "size-10 rounded-xl [&_svg]:size-[18px]",
        xl: "size-12 rounded-2xl [&_svg]:size-5",
      },
    },
    defaultVariants: { tone: "neutral", size: "md" },
  },
);

function IconTile({
  className,
  tone,
  size,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof iconTileVariants>) {
  return (
    <div
      data-slot="icon-tile"
      className={cn(iconTileVariants({ tone, size }), className)}
      {...props}
    />
  );
}

export { IconTile, iconTileVariants };
