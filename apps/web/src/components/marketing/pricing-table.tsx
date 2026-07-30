"use client";

import {
  PLANS,
  PLAN_ORDER,
  featuresFor,
  formatPrice,
  yearlySavingsFor,
  type BillingInterval,
} from "@theseosaas/core/plans";
import { Badge } from "@theseosaas/ui/components/badge";
import { Button } from "@theseosaas/ui/components/button";
import { Card, CardContent } from "@theseosaas/ui/components/card";
import { Stagger, StaggerItem } from "@theseosaas/ui/components/motion";
import { cn } from "@theseosaas/ui/lib/utils";
import { Check } from "lucide-react";
import Link from "next/link";
import * as React from "react";

/**
 * Pricing cards.
 *
 * Every number and every bullet comes from `@theseosaas/core/plans`, the same
 * module the onboarding plan step, the settings page and the quota enforcer
 * read. Before that existed this file carried its own hardcoded copy of the
 * price list, and it had already drifted from the enforced limits.
 *
 * Every plan has every feature — plans differ only by limits. The copy leans
 * into that rather than hiding it, because a feature-gated table invites users
 * to hunt for what they're losing, while a limits table asks a simpler
 * question: how much do you plan to publish?
 *
 * There's no signed-in user on a marketing page, so the CTA can't open a Dodo
 * checkout directly — it carries the chosen plan and interval through sign-in
 * so onboarding's plan step can pre-select them.
 */
export function PricingTable({ interval: controlled }: { interval?: BillingInterval } = {}) {
  const [uncontrolled, setInterval] = React.useState<BillingInterval>("MONTHLY");
  const interval = controlled ?? uncontrolled;
  const showToggle = controlled === undefined;

  return (
    <div className="space-y-6">
      {showToggle ? (
        <IntervalToggle value={interval} onChange={setInterval} />
      ) : null}

      <Stagger className="grid gap-4 md:grid-cols-3">
        {PLAN_ORDER.map((planId) => {
          const plan = PLANS[planId];
          const price = interval === "YEARLY" ? plan.yearlyUsd : plan.monthlyUsd;
          const savings = yearlySavingsFor(planId);

          return (
            <StaggerItem key={planId} className="h-full">
              <Card
                variant="panel"
                elevated={plan.highlighted}
                className={cn(
                  "relative h-full",
                  plan.highlighted && "border-ink-900 ring-ink-900/5 ring-2",
                )}
              >
                <CardContent className="flex h-full flex-col gap-5">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-display text-ink-900 text-xl font-semibold">
                        {plan.name}
                      </h3>
                      {plan.highlighted ? <Badge tone="ink">Popular</Badge> : null}
                    </div>
                    <p className="text-ink-400 text-sm">{plan.tagline}</p>
                  </div>

                  <div>
                    <div className="flex items-baseline gap-1">
                      <span className="font-display text-ink-900 text-4xl font-semibold tabular-nums">
                        {formatPrice(price)}
                      </span>
                      <span className="text-ink-300 text-base">
                        {interval === "YEARLY" ? "/year" : "/month"}
                      </span>
                    </div>
                    {interval === "YEARLY" ? (
                      <p className="text-success-strong mt-1 text-sm">
                        Saves {formatPrice(savings)} a year
                      </p>
                    ) : null}
                  </div>

                  <Button
                    size="block"
                    variant={plan.highlighted ? "default" : "outline"}
                    render={
                      <Link
                        href={`/login?redirectTo=${encodeURIComponent("/onboarding")}&plan=${planId}&interval=${interval}`}
                      />
                    }
                  >
                    Start with {plan.name}
                  </Button>

                  <div className="space-y-2.5">
                    <div className="eyebrow text-ink-300">Monthly limits</div>
                    <ul className="space-y-2">
                      {featuresFor(planId).map((feature) => (
                        <li key={feature} className="flex items-start gap-2">
                          <Check
                            className="text-success mt-0.5 size-3.5 shrink-0"
                            strokeWidth={3}
                          />
                          <span className="text-ink-500 text-sm leading-relaxed">
                            {feature}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </StaggerItem>
          );
        })}
      </Stagger>
    </div>
  );
}

export function IntervalToggle({
  value,
  onChange,
  className,
}: {
  value: BillingInterval;
  onChange: (next: BillingInterval) => void;
  className?: string;
}) {
  return (
    <div className={cn("flex justify-center", className)}>
      <div className="border-line bg-surface flex items-center gap-1 rounded-full border p-1 text-sm">
        {(["MONTHLY", "YEARLY"] as const).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => onChange(option)}
            className={cn(
              "rounded-full px-4 py-1.5 font-medium transition-colors",
              value === option ? "bg-ink-900 text-white" : "text-ink-400 hover:text-ink-900",
            )}
          >
            {option === "MONTHLY" ? "Monthly" : "Yearly — 2 months free"}
          </button>
        ))}
      </div>
    </div>
  );
}
