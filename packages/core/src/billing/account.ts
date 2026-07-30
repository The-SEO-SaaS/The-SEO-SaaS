import prisma from "@theseosaas/db";

import { PLANS, type BillingInterval, type PlanId } from "./plan-data.ts";
import { currentPeriod } from "./quota.ts";

/**
 * Everything the settings page needs in one read.
 *
 * Usage is reported against the plan's limits so the page can show "12 of 20
 * articles" without doing quota arithmetic in the browser — the same numbers
 * the enforcer uses, from the same source.
 */

export interface UsageLine {
  metric: "AI_BLOG_POST" | "AI_RECOMMENDATION";
  label: string;
  used: number;
  /** Infinity for unlimited. */
  limit: number;
}

export interface StructuralLine {
  label: string;
  used: number;
  limit: number;
}

export interface AccountSummary {
  user: { id: string; email: string; name: string | null; image: string | null };

  subscription: {
    plan: PlanId;
    planName: string;
    interval: BillingInterval;
    status: string;
    /** True while access should be granted, including the past-due grace window. */
    isActive: boolean;
    currentPeriodEnd: string | null;
    cancelAtPeriodEnd: boolean;
    /** False when there's no Dodo customer yet, so the portal can't open. */
    hasPortal: boolean;
  } | null;

  /** Metered usage in the current calendar month. Empty without a plan. */
  usage: UsageLine[];
  /** Counted resources — sites, keywords. Empty without a plan. */
  structural: StructuralLine[];
  periodEnd: string;
}

const USAGE_LABELS: Record<UsageLine["metric"], string> = {
  AI_BLOG_POST: "AI articles",
  AI_RECOMMENDATION: "AI recommendations",
};

export async function getAccountSummary(userId: string): Promise<AccountSummary> {
  const { start, end } = currentPeriod();

  const [user, subscription, usageRecords, siteCount, keywordCount] = await Promise.all([
    prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { id: true, email: true, name: true, image: true },
    }),
    prisma.subscription.findUnique({
      where: { userId },
      select: {
        plan: true,
        interval: true,
        status: true,
        currentPeriodEnd: true,
        cancelAtPeriodEnd: true,
        dodoCustomerId: true,
      },
    }),
    prisma.usageRecord.findMany({
      where: { userId, periodStart: start },
      select: { metric: true, amount: true },
    }),
    prisma.project.count({ where: { userId } }),
    prisma.keyword.count({ where: { isTracked: true, project: { userId } } }),
  ]);

  if (!subscription) {
    return {
      user,
      subscription: null,
      usage: [],
      structural: [],
      periodEnd: end.toISOString(),
    };
  }

  const plan = subscription.plan as PlanId;
  const limits = PLANS[plan].limits;

  const usedByMetric = new Map(usageRecords.map((record) => [record.metric, record.amount]));

  // PAST_DUE keeps access during the provider's retry window — a hard cut-off
  // on the first failed charge would punish users for an expired card.
  const isActive =
    subscription.status === "ACTIVE" ||
    (subscription.status === "PAST_DUE" &&
      (subscription.currentPeriodEnd?.getTime() ?? 0) > Date.now());

  return {
    user,
    subscription: {
      plan,
      planName: PLANS[plan].name,
      interval: subscription.interval as BillingInterval,
      status: subscription.status,
      isActive,
      currentPeriodEnd: subscription.currentPeriodEnd?.toISOString() ?? null,
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      hasPortal: Boolean(subscription.dodoCustomerId),
    },
    usage: (["AI_BLOG_POST", "AI_RECOMMENDATION"] as const).map((metric) => ({
      metric,
      label: USAGE_LABELS[metric],
      used: usedByMetric.get(metric) ?? 0,
      limit:
        metric === "AI_BLOG_POST"
          ? limits.aiBlogPostsPerMonth
          : limits.aiRecommendationsPerMonth,
    })),
    structural: [
      { label: "Sites", used: siteCount, limit: limits.projects },
      { label: "Tracked keywords", used: keywordCount, limit: limits.trackedKeywords },
    ],
    periodEnd: end.toISOString(),
  };
}
