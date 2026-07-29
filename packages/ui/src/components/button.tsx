import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { cn } from "@theseosaas/ui/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";

/**
 * Button, retuned to the design file.
 *
 * Measurements come from the design rather than shadcn defaults: the primary
 * button is ink #0B1220 at 13.5px/500 with 11px×20px padding and a 10px
 * radius. Sizes are padding-based rather than fixed-height so a button
 * containing an icon grows correctly instead of clipping.
 */
const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg border border-transparent font-medium transition-colors outline-none select-none focus-visible:ring-2 focus-visible:ring-ring/20 focus-visible:border-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        /** Primary action. Ink fill — the strongest single thing on screen. */
        default: "bg-ink-900 text-white hover:bg-ink-800",
        /** Secondary. Bordered with an ink-700 label. */
        outline: "border-line bg-surface text-ink-700 hover:bg-surface-sunken",
        /** Tertiary. Filled but quiet. */
        secondary: "bg-surface-sunken text-ink-700 hover:bg-surface-tint",
        ghost: "text-ink-700 hover:bg-surface-sunken",
        /**
         * The "act now" button, reserved for opportunity actions such as
         * "Generate 3 articles". Use sparingly: if everything is urgent,
         * nothing is.
         */
        opportunity: "bg-opportunity text-white hover:bg-opportunity/90",
        destructive: "bg-critical text-white hover:bg-critical-strong",
        link: "text-ink-900 underline-offset-4 hover:underline",
      },
      size: {
        /** 13.5px, 11px×20px, radius 10px — the design's default. */
        default: "text-base px-5 py-[11px]",
        sm: "text-sm-plus px-3.5 py-2",
        xs: "text-xs-plus gap-1.5 rounded-md px-2.5 py-1.5 [&_svg:not([class*='size-'])]:size-3",
        lg: "text-lg px-6 py-3.5",
        /** Full-width CTA — hero and paywall buttons. */
        block: "text-base w-full px-5 py-[13px]",
        icon: "size-9 p-0",
        "icon-sm": "size-8 rounded-md p-0",
        "icon-xs": "size-6 rounded-md p-0 [&_svg:not([class*='size-'])]:size-3",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
