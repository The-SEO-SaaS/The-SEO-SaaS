import { env } from "@theseosaas/env/server";

/**
 * Plan definitions.
 *
 * Every plan has every feature — plans differ only by limits. That's a product
 * decision, so entitlements are numeric quotas here, never boolean feature
 * flags. Resist adding a `canDoX: boolean` to this file.
 *
 * Six Dodo products: three plans × monthly/yearly. Product IDs come from env
 * rather than being hard-coded, because they differ between Dodo's test and
 * live modes and hard-coding them would make a test key silently charge against
 * live products (or fail).
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
 * This is a default, not a stated requirement: the brief specified a yearly
 * product per plan but not its price. Change the multiplier here and in the
 * Dodo dashboard together, since Dodo is the source of truth for what actually
 * gets charged and this file only drives what we display.
 */
const YEARLY_MONTHS = 10;

function yearly(monthly: number): number {
  return Math.round(monthly * YEARLY_MONTHS * 100) / 100;
}

export const PLANS: Record<PlanId, PlanDefinition> = {
  STARTER: {
    id: "STARTER",
    name: "Starter",
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

// --- Dodo product mapping --------------------------------------------------

/**
 * Maps a plan + interval to its Dodo product ID.
 *
 * Read lazily from env rather than built at module load, so importing this file
 * in a context without billing configured (a test, the worker) doesn't throw.
 */
export function productIdFor(planId: PlanId, interval: BillingInterval): string {
  const key = `${planId}_${interval}` as const;

  const map: Record<string, string | undefined> = {
    STARTER_MONTHLY: env.DODO_PRODUCT_STARTER_MONTHLY,
    STARTER_YEARLY: env.DODO_PRODUCT_STARTER_YEARLY,
    GROWTH_MONTHLY: env.DODO_PRODUCT_GROWTH_MONTHLY,
    GROWTH_YEARLY: env.DODO_PRODUCT_GROWTH_YEARLY,
    SCALE_MONTHLY: env.DODO_PRODUCT_SCALE_MONTHLY,
    SCALE_YEARLY: env.DODO_PRODUCT_SCALE_YEARLY,
  };

  const productId = map[key];
  if (!productId) {
    throw new Error(
      `No Dodo product configured for ${key}. Set DODO_PRODUCT_${key} in apps/web/.env`,
    );
  }

  return productId;
}

/**
 * Reverse lookup: which plan and interval does a Dodo product represent?
 *
 * Needed because webhooks identify the subscription by product_id, and an
 * upgrade or interval switch is only detectable by resolving that back to our
 * own plan model.
 */
export function planFromProductId(
  productId: string,
): { plan: PlanId; interval: BillingInterval } | null {
  for (const plan of PLAN_ORDER) {
    for (const interval of ["MONTHLY", "YEARLY"] as const) {
      try {
        if (productIdFor(plan, interval) === productId) return { plan, interval };
      } catch {
        // Product not configured — skip rather than fail the whole lookup.
      }
    }
  }
  return null;
}

/** Queue priority. Paid work jumps ahead of anonymous free audits. */
export function queuePriorityFor(planId: PlanId | null): number {
  if (!planId) return 0;
  return PLANS[planId].limits.priorityProcessing ? 20 : 10;
}

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
  if (
    signals.competitors > PLANS.STARTER.limits.competitorsPerProject ||
    signals.keywordOpportunities > PLANS.STARTER.limits.trackedKeywords
  ) {
    return "GROWTH";
  }
  return "GROWTH";
}
