/**
 * The single source of truth for plans: prices, limits, and the copy that
 * describes them.
 *
 * This file has ZERO imports on purpose. Everything else about billing needs
 * `env` (Dodo product IDs) or `prisma` (subscriptions), which would drag the
 * server runtime into any client component that just wants to render a price.
 * Keeping the data inert means the marketing pricing page, the pricing table,
 * the onboarding plan step and the settings page can all read the same numbers
 * — which is the whole point. Before this existed, three components each had
 * their own hardcoded copy of the price list, and they had already drifted.
 *
 * Importable as `@theseosaas/core/plans`.
 *
 * Prices here are what we *display*. Dodo is what actually charges. Change one
 * and you must change the other.
 */

export type PlanId = "STARTER" | "GROWTH" | "SCALE";
export type BillingInterval = "MONTHLY" | "YEARLY";

export interface PlanLimits {
  projects: number;
  competitorsPerProject: number;
  trackedKeywords: number;
  aiBlogPostsPerMonth: number;
  /** Infinity means unlimited. */
  aiRecommendationsPerMonth: number;
  priorityProcessing: boolean;
}

export interface PlanDefinition {
  id: PlanId;
  name: string;
  /** Who the plan is for — one short line, shown under the name. */
  tagline: string;
  /** Monthly price when billed monthly. */
  monthlyUsd: number;
  /** Total charged once per year. */
  yearlyUsd: number;
  /** Growth is the highlighted tier on the pricing page. */
  highlighted: boolean;
  limits: PlanLimits;
}

/**
 * Yearly is priced at ten months — two months free.
 *
 * A default, not a stated requirement: the brief specified a yearly product
 * per plan but not its price. Change this and the Dodo dashboard together.
 */
export const YEARLY_MONTHS = 10;

function yearly(monthly: number): number {
  return Math.round(monthly * YEARLY_MONTHS * 100) / 100;
}

export const PLANS: Record<PlanId, PlanDefinition> = {
  STARTER: {
    id: "STARTER",
    name: "Starter",
    tagline: "One site, getting started",
    monthlyUsd: 49.99,
    yearlyUsd: yearly(49.99),
    highlighted: false,
    limits: {
      projects: 1,
      competitorsPerProject: 3,
      trackedKeywords: 100,
      aiBlogPostsPerMonth: 5,
      aiRecommendationsPerMonth: 10,
      priorityProcessing: false,
    },
  },
  GROWTH: {
    id: "GROWTH",
    name: "Growth",
    tagline: "Publishing consistently",
    monthlyUsd: 99.99,
    yearlyUsd: yearly(99.99),
    highlighted: true,
    limits: {
      projects: 3,
      competitorsPerProject: 10,
      trackedKeywords: 500,
      aiBlogPostsPerMonth: 20,
      aiRecommendationsPerMonth: Number.POSITIVE_INFINITY,
      priorityProcessing: false,
    },
  },
  SCALE: {
    id: "SCALE",
    name: "Scale",
    tagline: "Multiple sites, serious volume",
    monthlyUsd: 199.99,
    yearlyUsd: yearly(199.99),
    highlighted: false,
    limits: {
      projects: 10,
      competitorsPerProject: 25,
      trackedKeywords: 2000,
      aiBlogPostsPerMonth: 50,
      aiRecommendationsPerMonth: Number.POSITIVE_INFINITY,
      priorityProcessing: true,
    },
  },
};

export const PLAN_ORDER: PlanId[] = ["STARTER", "GROWTH", "SCALE"];

export function getPlan(planId: PlanId): PlanDefinition {
  return PLANS[planId];
}

// --- Pricing helpers ---------------------------------------------------------

export function priceFor(planId: PlanId, interval: BillingInterval): number {
  return interval === "YEARLY" ? PLANS[planId].yearlyUsd : PLANS[planId].monthlyUsd;
}

/** Effective monthly cost when billed yearly — what the UI compares against. */
export function effectiveMonthlyFor(planId: PlanId, interval: BillingInterval): number {
  if (interval === "MONTHLY") return PLANS[planId].monthlyUsd;
  return Math.round((PLANS[planId].yearlyUsd / 12) * 100) / 100;
}

export function yearlySavingsFor(planId: PlanId): number {
  const plan = PLANS[planId];
  return Math.round((plan.monthlyUsd * 12 - plan.yearlyUsd) * 100) / 100;
}

/** `$49.99`, `$499.90` — one formatter so pages can't disagree on decimals. */
export function formatPrice(usd: number): string {
  return `$${usd.toFixed(2)}`;
}

// --- Feature copy ------------------------------------------------------------

export function formatLimit(value: number): string {
  if (value === Number.POSITIVE_INFINITY) return "Unlimited";
  return value.toLocaleString("en-US");
}

/**
 * The bullet list shown on a plan card.
 *
 * Generated from `limits` rather than written out per plan, so a limit can
 * never say 500 in the numbers and 100 in the copy. Every plan has every
 * feature — plans differ only by these numbers, which is exactly why the copy
 * leans on quantities instead of ticks and crosses.
 */
export function featuresFor(planId: PlanId): string[] {
  const { limits } = PLANS[planId];

  const features = [
    `${formatLimit(limits.projects)} ${limits.projects === 1 ? "site" : "sites"}`,
    `${formatLimit(limits.competitorsPerProject)} competitors per site`,
    `${formatLimit(limits.trackedKeywords)} tracked keywords`,
    `${formatLimit(limits.aiBlogPostsPerMonth)} AI articles a month`,
    `${formatLimit(limits.aiRecommendationsPerMonth)} AI recommendations a month`,
    "Daily rank tracking",
    "Full technical audits",
  ];

  if (limits.priorityProcessing) features.push("Priority processing");

  return features;
}

/** What every plan includes, stated once so the table doesn't repeat it. */
export const INCLUDED_IN_EVERY_PLAN: string[] = [
  "Every feature — plans differ only by limits",
  "Unlimited site audits",
  "Competitor discovery and head-to-head tracking",
  "Keyword gap analysis",
  "Cancel any time",
];

// --- Recommendation ----------------------------------------------------------

/** Suggests a plan from what the audit actually found. */
export function recommendPlan(signals: {
  competitors: number;
  keywordOpportunities: number;
}): PlanId {
  if (
    signals.competitors > PLANS.GROWTH.limits.competitorsPerProject ||
    signals.keywordOpportunities > PLANS.GROWTH.limits.trackedKeywords
  ) {
    return "SCALE";
  }
  return "GROWTH";
}

/** Queue priority. Paid work jumps ahead of anonymous free audits. */
export function queuePriorityFor(planId: PlanId | null): number {
  if (!planId) return 0;
  return PLANS[planId].limits.priorityProcessing ? 20 : 10;
}
