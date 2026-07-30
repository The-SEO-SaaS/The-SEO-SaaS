"use client";

import {
  PLANS,
  PLAN_ORDER,
  featuresFor,
  formatPrice,
  recommendPlan,
  type BillingInterval,
  type PlanId,
} from "@theseosaas/core/plans";
import { Badge } from "@theseosaas/ui/components/badge";
import { Card, CardContent } from "@theseosaas/ui/components/card";
import { Stagger, StaggerItem } from "@theseosaas/ui/components/motion";
import { cn } from "@theseosaas/ui/lib/utils";
import { Check } from "lucide-react";

import { IntervalToggle } from "@/components/marketing/pricing-table";

/**
 * Step 4 — plan.
 *
 * Prices, limits and bullets all come from `@theseosaas/core/plans`, the same
 * module that enforces the quota — so this screen cannot promise a limit the
 * backend won't honour.
 *
 * The recommendation is derived from what the audit actually found rather than
 * always pushing the middle tier. A founder with four competitors and twelve
 * keyword gaps is told why Growth fits *their* numbers, which is far more
 * persuasive — and more honest — than a generic "most popular" badge.
 */
export function PlanStep({
  competitorCount,
  keywordCount,
  selected,
  onSelect,
  interval,
  onIntervalChange,
}: {
  competitorCount: number;
  keywordCount: number;
  selected: PlanId | null;
  onSelect: (plan: PlanId) => void;
  interval: BillingInterval;
  onIntervalChange: (interval: BillingInterval) => void;
}) {
  const recommended = recommendPlan({
    competitors: competitorCount,
    keywordOpportunities: keywordCount,
  });

  return (
    <div className="space-y-5">
      <Card variant="well">
        <CardContent className="text-ink-500 text-sm leading-relaxed">
          Your audit found{" "}
          <span className="text-ink-900 font-medium">
            {competitorCount} {competitorCount === 1 ? "competitor" : "competitors"}
          </span>{" "}
          and you&apos;ve selected{" "}
          <span className="text-ink-900 font-medium">{keywordCount} keywords</span>.{" "}
          {PLANS[recommended].name} covers that with room to grow.
        </CardContent>
      </Card>

      <IntervalToggle value={interval} onChange={onIntervalChange} />

      <Stagger className="grid gap-3 md:grid-cols-3" whenInView={false}>
        {PLAN_ORDER.map((planId) => {
          const plan = PLANS[planId];
          const isSelected = selected === planId;
          const isRecommended = planId === recommended;
          const price = interval === "YEARLY" ? plan.yearlyUsd : plan.monthlyUsd;

          return (
            <StaggerItem key={planId} className="h-full">
              <button
                type="button"
                onClick={() => onSelect(planId)}
                aria-pressed={isSelected}
                className={cn(
                  "bg-surface flex h-full w-full flex-col gap-4 rounded-2xl border p-5 text-left transition-colors",
                  isSelected
                    ? "border-ink-900 ring-ink-900/5 ring-2"
                    : "border-line hover:border-line-strong",
                )}
              >
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-display text-ink-900 text-lg font-semibold">
                      {plan.name}
                    </h3>
                    {isRecommended ? <Badge tone="ink">Recommended</Badge> : null}
                  </div>
                  <p className="text-ink-400 text-sm">{plan.tagline}</p>
                </div>

                <div className="flex items-baseline gap-1">
                  <span className="font-display text-ink-900 text-3xl font-semibold tabular-nums">
                    {formatPrice(price)}
                  </span>
                  <span className="text-ink-300 text-sm">
                    {interval === "YEARLY" ? "/year" : "/month"}
                  </span>
                </div>

                <ul className="flex-1 space-y-1.5">
                  {featuresFor(planId).map((feature) => (
                    <li key={feature} className="flex items-start gap-2">
                      <Check
                        className="text-success mt-0.5 size-3.5 shrink-0"
                        strokeWidth={3}
                      />
                      <span className="text-ink-500 text-sm leading-relaxed">{feature}</span>
                    </li>
                  ))}
                </ul>
              </button>
            </StaggerItem>
          );
        })}
      </Stagger>

      <p className="text-ink-300 text-center text-sm">
        Every plan includes every feature — they differ only by limits. Cancel any time.
      </p>
    </div>
  );
}
