import { Input as InputPrimitive } from "@base-ui/react/input";
import { cn } from "@theseosaas/ui/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";

/**
 * Input, retuned to the design file: white fill, 1px #E2E6EC border, 10px
 * radius, 11px×13px padding, 13.5px text.
 *
 * The `hero` size is the landing page's URL field — noticeably larger, since
 * it is the single most important input in the product.
 */
const inputVariants = cva(
  "w-full min-w-0 bg-surface border border-line text-ink-900 transition-colors outline-none placeholder:text-ink-300 focus-visible:border-ink-900 focus-visible:ring-2 focus-visible:ring-ring/10 disabled:cursor-not-allowed disabled:bg-surface-sunken disabled:opacity-60 aria-invalid:border-critical aria-invalid:ring-2 aria-invalid:ring-critical/10",
  {
    variants: {
      size: {
        default: "rounded-lg px-[13px] py-[11px] text-base",
        sm: "rounded-md px-2.5 py-1.5 text-sm-plus",
        hero: "rounded-xl px-4 py-3.5 text-lg",
      },
    },
    defaultVariants: { size: "default" },
  },
);

function Input({
  className,
  type,
  size,
  ...props
}: Omit<React.ComponentProps<"input">, "size"> & VariantProps<typeof inputVariants>) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(inputVariants({ size }), className)}
      {...props}
    />
  );
}

export { Input, inputVariants };
