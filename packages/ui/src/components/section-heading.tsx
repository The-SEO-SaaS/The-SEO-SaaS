import { cn } from "@theseosaas/ui/lib/utils";
import * as React from "react";

/**
 * The eyebrow + title + subtitle block that opens nearly every section.
 *
 * `subtitle` is where the consultant voice lives — it should say why the
 * section matters, not restate the title. A section heading with no subtitle
 * is usually a sign the copy hasn't been written yet.
 */
interface SectionHeadingProps extends React.ComponentProps<"div"> {
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
  eyebrowTone?: "neutral" | "opportunity" | "success" | "caution" | "info";
  size?: "default" | "lg";
}

const EYEBROW_TONE = {
  neutral: "text-ink-300",
  opportunity: "text-opportunity",
  success: "text-success-strong",
  caution: "text-caution",
  info: "text-info",
} as const;

function SectionHeading({
  className,
  eyebrow,
  title,
  subtitle,
  action,
  eyebrowTone = "neutral",
  size = "default",
  ...props
}: SectionHeadingProps) {
  return (
    <div
      data-slot="section-heading"
      className={cn(
        // Stacks below sm so a long title and its action don't fight for width.
        "flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-start sm:gap-4",
        className,
      )}
      {...props}
    >
      <div className="min-w-0 space-y-1.5">
        {eyebrow ? (
          <div className={cn("eyebrow", EYEBROW_TONE[eyebrowTone])}>{eyebrow}</div>
        ) : null}

        <h2
          className={cn(
            "font-display text-ink-900 font-semibold tracking-tight text-balance",
            size === "lg" ? "text-2xl sm:text-3xl" : "text-lg sm:text-xl",
          )}
        >
          {title}
        </h2>

        {subtitle ? <p className="why-line max-w-[62ch]">{subtitle}</p> : null}
      </div>

      {action ? <div className="shrink-0 self-stretch sm:self-auto">{action}</div> : null}
    </div>
  );
}

export { SectionHeading };
