"use client";

import { cn } from "@theseosaas/ui/lib/utils";

/**
 * Tiny rank trend line.
 *
 * Positions are inverted before plotting: rank 1 is the best result, so
 * drawing the raw number would make improvement look like decline. Flipping
 * the sign means "line goes up" always reads as "getting better", which is the
 * only interpretation a glance supports.
 */
export function RankSparkline({
  positions,
  width = 80,
  height = 22,
  className,
}: {
  positions: number[];
  width?: number;
  height?: number;
  className?: string;
}) {
  if (positions.length < 2) {
    return <span className={cn("text-ink-300 text-xs", className)}>—</span>;
  }

  const values = positions.map((position) => -position);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const points = values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * width;
      const y = height - ((value - min) / range) * (height - 4) - 2;
      return `${x},${y}`;
    })
    .join(" ");

  // Improving overall = last position numerically lower than first.
  const improving = positions[positions.length - 1]! <= positions[0]!;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      className={cn("block overflow-visible", className)}
      aria-hidden
    >
      <polyline
        points={points}
        fill="none"
        stroke={improving ? "var(--color-success)" : "var(--color-critical)"}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

/** Position + delta, sharing one convention for "lower is better". */
export function PositionCell({
  position,
  change,
  isPending,
}: {
  position: number | null;
  change: number | null;
  isPending: boolean;
}) {
  if (isPending) {
    return <span className="text-ink-300 text-sm">Checking…</span>;
  }

  if (position === null) {
    return (
      <span className="text-ink-300 text-sm" title="Not found in the top 50 results">
        Not ranking
      </span>
    );
  }

  return (
    <span className="flex items-baseline gap-1.5">
      <span className="text-ink-900 text-base font-medium tabular-nums">{position}</span>
      {change !== null && change !== 0 ? (
        <span
          className={cn(
            "text-xs-plus tabular-nums",
            change < 0 ? "text-success-strong" : "text-critical",
          )}
        >
          {change < 0 ? "↑" : "↓"}
          {Math.abs(change)}
        </span>
      ) : null}
    </span>
  );
}
