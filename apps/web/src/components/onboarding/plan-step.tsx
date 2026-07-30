"use client";

import { Badge } from "@theseosaas/ui/components/badge";
import { Card, CardContent } from "@theseosaas/ui/components/card";
import { Stagger, StaggerItem } from "@theseosaas/ui/components/motion";
import { cn } from "@theseosaas/ui/lib/utils";
import { Check } from "lucide-react";

type PlanId = "STARTER" | "GROWTH" | "SCALE";
type BillingInterval = "MONTHLY" | "YEARLY";

/**
 * Step 4 — plan.
 *
 * Mirrors packages/core/src/billing/plans.ts, which stays authoritative since
 * it enforces the quota and is what actually creates the Dodo checkout. Yearly
 * price is ten months' worth (two months free) — if that multiplier ever
 * changes, change it in both places.
 *
 * The recommendation is derived from what the audit actually found rather than
 * always pushing the middle tier. A founder with four competitors and twelve
 * keyword gaps is told why Growth fits *their* numbers, which is far more
 * persuasive — and more honest — than a generic "most popular" badge.
 */
const PLANS: {
  id: PlanId;
  name: string;
  monthlyPrice: number;
  yearlyPrice: number;
  for: string;
  limits: { competitors: number; keywords: number; articles: number };
  bullets: string[];
}[] = [
  {
    id: "STARTER",
    name: "Starter",
    monthlyPrice: 49.99,
    yearlyPrice: 499.9,
    for: "One site, getting started",
    limits: { competitors: 3, keywords: 100, articles: 5 },
    bullets: [
      "1 project",
      "3 competitors tracked",
      "100 tracked keywords",
      "5 AI articles a month",
    ],
  },
  {
    id: "GROWTH",
    name: "Growth",
    monthlyPrice: 99.99,
    yearlyPrice: 999.9,
    for: "Publishing consistently",
    limits: { competitors: 10, keywords: 500, articles: 20 },
    bullets: [
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
    limits: { competitors: 25, keywords: 2000, articles: 50 },
    bullets: [
      "10 projects",
      "25 competitors tracked",
      "2,000 tracked keywords",
      "50 AI articles a month",
      "Priority processing",
    ],
  },
];

/** Smallest plan that actually fits what the audit found. */
function recommendFor(competitors: number, keywords: number): PlanId {
  const fits = PLANS.find(
    (plan) => plan.limits.competitors >= competitors && plan.limits.keywords >= keywords,
  );
  return fits?.id ?? "SCALE";
}

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
  const recommended = recommendFor(competitorCount, keywordCount);

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
          {PLANS.find((plan) => plan.id === recommended)?.name} covers that with room to
          grow.
        </CardContent>
      </Card>

      <div className="flex items-center justify-center gap-1 rounded-full border border-line bg-surface p-1 text-sm">
        {(["MONTHLY", "YEARLY"] as const).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => onIntervalChange(option)}
            className={cn(
              "rounded-full px-4 py-1.5 font-medium transition-colors",
              interval === option
                ? "bg-ink-900 text-white"
                : "text-ink-400 hover:text-ink-900",
            )}
          >
            {option === "MONTHLY" ? "Monthly" : "Yearly — 2 months free"}
          </button>
        ))}
      </div>

      <Stagger className="grid gap-3 md:grid-cols-3" whenInView={false}>
        {PLANS.map((plan) => {
          const isSelected = selected === plan.id;
          const isRecommended = plan.id === recommended;
          const price = interval === "YEARLY" ? plan.yearlyPrice : plan.monthlyPrice;

          return (
            <StaggerItem key={plan.id} className="h-full">
              <button
                type="button"
                onClick={() => onSelect(plan.id)}
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
                  <p className="text-ink-400 text-sm">{plan.for}</p>
                </div>

                <div className="flex items-baseline gap-1">
                  <span className="font-display text-ink-900 text-3xl font-semibold tabular-nums">
                    ${price.toFixed(2)}
                  </span>
                  <span className="text-ink-300 text-sm">
                    {interval === "YEARLY" ? "/year" : "/month"}
                  </span>
                </div>

                <ul className="flex-1 space-y-1.5">
                  {plan.bullets.map((bullet) => (
                    <li key={bullet} className="flex items-start gap-2">
                      <Check
                        className="text-success mt-0.5 size-3.5 shrink-0"
                        strokeWidth={3}
                      />
                      <span className="text-ink-500 text-sm leading-relaxed">{bullet}</span>
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
