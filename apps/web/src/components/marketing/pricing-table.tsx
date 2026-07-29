"use client";

import { Badge } from "@theseosaas/ui/components/badge";
import { Button } from "@theseosaas/ui/components/button";
import { Card, CardContent } from "@theseosaas/ui/components/card";
import { cn } from "@theseosaas/ui/lib/utils";
import { Check } from "lucide-react";
import Link from "next/link";

/**
 * Pricing.
 *
 * Every plan has every feature — plans differ only by limits. The copy leans
 * into that rather than hiding it, because a feature-gated table invites users
 * to hunt for what they're losing, while a limits table asks a simpler
 * question: how much do you plan to publish?
 *
 * Mirrors packages/core/src/billing/plans.ts. If these ever disagree, that file
 * is authoritative — it's what actually enforces the quota.
 */

interface PlanCard {
  id: string;
  name: string;
  price: string;
  for: string;
  highlighted: boolean;
  limits: string[];
}

const PLANS: PlanCard[] = [
  {
    id: "STARTER",
    name: "Starter",
    price: "$49.99",
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
    price: "$99.99",
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
    price: "$199.99",
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
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {PLANS.map((plan) => (
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
                {plan.price}
              </span>
              <span className="text-ink-300 text-base">/month</span>
            </div>

            <Button
              size="block"
              variant={plan.highlighted ? "default" : "outline"}
              render={<Link href="/login" />}
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
      ))}
    </div>
  );
}
