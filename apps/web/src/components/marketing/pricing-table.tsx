"use client";

import { Badge } from "@theseosaas/ui/components/badge";
import { Button } from "@theseosaas/ui/components/button";
import { Card, CardContent } from "@theseosaas/ui/components/card";
import { cn } from "@theseosaas/ui/lib/utils";
import { Check } from "lucide-react";
import Link from "next/link";
import * as React from "react";

/**
 * Pricing.
 *
 * Every plan has every feature — plans differ only by limits. The copy leans
 * into that rather than hiding it, because a feature-gated table invites users
 * to hunt for what they're losing, while a limits table asks a simpler
 * question: how much do you plan to publish?
 *
 * Mirrors packages/core/src/billing/plans.ts. If these ever disagree, that file
 * is authoritative — it's what actually enforces the quota and creates the
 * Dodo checkout. Yearly is ten months' worth (two months free).
 *
 * There's no signed-in user on a marketing page, so "Start with X" can't open
 * a Dodo checkout directly — it goes to sign-in first, carrying the chosen
 * plan and interval along so onboarding's plan step can pre-select them.
 * The actual checkout happens from there, once there's a user to bill.
 */

interface PlanCard {
  id: string;
  name: string;
  monthlyPrice: number;
  yearlyPrice: number;
  for: string;
  highlighted: boolean;
  limits: string[];
}

const PLANS: PlanCard[] = [
  {
    id: "STARTER",
    name: "Starter",
    monthlyPrice: 49.99,
    yearlyPrice: 499.9,
    for: "One site, getting started",
    highlighted: false,
    limits: [
      "1 project",
      "3 competitors tracked",
      "100 tracked keywords",
      "5 AI articles a month",
      "10 AI recommendations a month",
    ],
  },
  {
    id: "GROWTH",
    name: "Growth",
    monthlyPrice: 99.99,
    yearlyPrice: 999.9,
    for: "Publishing consistently",
    highlighted: true,
    limits: [
      "3 projects",
      "10 competitors tracked",
      "500 tracked keywords",
      "20 AI articles a month",
      "Unlimited recommendations",
    ],
  },
  {
    id: "SCALE",
    name: "Scale",
    monthlyPrice: 199.99,
    yearlyPrice: 1999.9,
    for: "Multiple sites, serious volume",
    highlighted: false,
    limits: [
      "10 projects",
      "25 competitors tracked",
      "2,000 tracked keywords",
      "50 AI articles a month",
      "Priority processing",
    ],
  },
];

export function PricingTable() {
  const [interval, setPricingInterval] = React.useState<"MONTHLY" | "YEARLY">("MONTHLY");

  return (
    <div className="space-y-6">
      <div className="flex justify-center">
        <div className="border-line bg-surface flex items-center gap-1 rounded-full border p-1 text-sm">
          {(["MONTHLY", "YEARLY"] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setPricingInterval(option)}
              className={cn(
                "rounded-full px-4 py-1.5 font-medium transition-colors",
                interval === option ? "bg-ink-900 text-white" : "text-ink-400 hover:text-ink-900",
              )}
            >
              {option === "MONTHLY" ? "Monthly" : "Yearly — 2 months free"}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {PLANS.map((plan) => {
          const price = interval === "YEARLY" ? plan.yearlyPrice : plan.monthlyPrice;

          return (
            <Card
              key={plan.id}
              variant="panel"
              elevated={plan.highlighted}
              className={cn(
                "relative",
                plan.highlighted && "border-ink-900 ring-ink-900/5 ring-2",
              )}
            >
              <CardContent className="space-y-5">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-display text-ink-900 text-xl font-semibold">
                      {plan.name}
                    </h3>
                    {plan.highlighted ? <Badge tone="ink">Popular</Badge> : null}
                  </div>
                  <p className="text-ink-400 text-sm">{plan.for}</p>
                </div>

                <div className="flex items-baseline gap-1">
                  <span className="font-display text-ink-900 text-4xl font-semibold tabular-nums">
                    ${price.toFixed(2)}
                  </span>
                  <span className="text-ink-300 text-base">
                    {interval === "YEARLY" ? "/year" : "/month"}
                  </span>
                </div>

                <Button
                  size="block"
                  variant={plan.highlighted ? "default" : "outline"}
                  render={
                    <Link
                      href={`/login?redirectTo=${encodeURIComponent("/onboarding")}&plan=${plan.id}&interval=${interval}`}
                    />
                  }
                >
                  Start with {plan.name}
                </Button>

                <div className="space-y-2.5">
                  <div className="eyebrow text-ink-300">Monthly limits</div>
                  <ul className="space-y-2">
                    {plan.limits.map((limit) => (
                      <li key={limit} className="flex items-start gap-2">
                        <Check className="text-success mt-0.5 size-3.5 shrink-0" strokeWidth={3} />
                        <span className="text-ink-500 text-sm leading-relaxed">{limit}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
