/**
 * Plan definitions.
 *
 * Every plan has every feature — plans differ only by limits. That's a product
 * decision, so entitlements are numeric quotas here, never boolean feature
 * flags. Resist adding a `canDoX: boolean` to this file.
 */

export type PlanId = "STARTER" | "GROWTH" | "SCALE";

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
  priceUsd: number;
  /** Growth is the highlighted/recommended tier on the pricing page. */
  highlighted: boolean;
  limits: PlanLimits;
}

export const PLANS: Record<PlanId, PlanDefinition> = {
  STARTER: {
    id: "STARTER",
    name: "Starter",
    priceUsd: 49.99,
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
    priceUsd: 99.99,
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
    priceUsd: 199.99,
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

/** Queue priority. Paid work jumps ahead of anonymous free audits. */
export function queuePriorityFor(planId: PlanId | null): number {
  if (!planId) return 0;
  return PLANS[planId].limits.priorityProcessing ? 20 : 10;
}

/** Suggests a plan from what the audit actually found, per the onboarding plan. */
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
  return "GROWTH"; // Default recommendation — the highlighted tier.
}
