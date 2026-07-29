import { cn } from "@theseosaas/ui/lib/utils";
import * as React from "react";

/**
 * A number with its meaning attached.
 *
 * Deliberately requires `caption`: the UX spec forbids presenting a bare
 * metric, so this component makes the explanation structural rather than
 * something a developer might forget. If there is genuinely nothing to say
 * about a number, it probably shouldn't be on screen.
 */
interface StatProps extends React.ComponentProps<"div"> {
  label: React.ReactNode;
  value: React.ReactNode;
  /** The "so what". Required by design. */
  caption: React.ReactNode;
  trend?: { direction: "up" | "down" | "flat"; label: string };
  size?: "default" | "lg";
}

const TREND_TONE = {
  up: "text-success-strong",
  down: "text-critical",
  flat: "text-ink-300",
} as const;

const TREND_GLYPH = { up: "↑", down: "↓", flat: "→" } as const;

function Stat({
  className,
  label,
  value,
  caption,
  trend,
  size = "default",
  ...props
}: StatProps) {
  return (
    <div data-slot="stat" className={cn("space-y-1.5", className)}>
      <div className="text-ink-400 text-xs-plus font-medium">{label}</div>

      <div className="flex items-baseline gap-2">
        <span
          className={cn(
            "font-display text-ink-900 leading-none font-semibold tabular-nums",
            size === "lg" ? "text-5xl" : "text-3xl",
          )}
        >
          {value}
        </span>

        {trend ? (
          <span className={cn("text-xs-plus font-medium", TREND_TONE[trend.direction])}>
            {TREND_GLYPH[trend.direction]} {trend.label}
          </span>
        ) : null}
      </div>

      <p className="text-ink-400 text-sm leading-relaxed">{caption}</p>
    </div>
  );
}

export { Stat };
