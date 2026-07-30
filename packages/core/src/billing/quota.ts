import prisma from "@theseosaas/db";

import { AppError } from "../errors.ts";
import { PLANS, type PlanId, type PlanLimits } from "./plans.ts";

/**
 * Quota enforcement.
 *
 * Consumption is an atomic increment *before* the work runs, then a refund if
 * the work fails. Checking-then-incrementing would let two concurrent requests
 * both pass the check and blow the limit.
 */

export type QuotaMetric = "AUDIT" | "AI_BLOG_POST" | "AI_RECOMMENDATION";

const METRIC_TO_LIMIT: Record<QuotaMetric, keyof PlanLimits | null> = {
  AUDIT: null, // Unmetered for subscribers; anonymous audits use the rate limiter.
  AI_BLOG_POST: "aiBlogPostsPerMonth",
  AI_RECOMMENDATION: "aiRecommendationsPerMonth",
};

export interface Entitlements {
  plan: PlanId;
  limits: PlanLimits;
  isActive: boolean;
}

export async function getEntitlements(userId: string): Promise<Entitlements | null> {
  const subscription = await prisma.subscription.findUnique({
    where: { userId },
    select: { plan: true, status: true, currentPeriodEnd: true },
  });

  if (!subscription) return null;

  // PAST_DUE keeps access during the retry window; a hard cut-off on the first
  // failed charge would punish users for an expired card.
  const isActive =
    subscription.status === "ACTIVE" ||
    (subscription.status === "PAST_DUE" &&
      (subscription.currentPeriodEnd?.getTime() ?? 0) > Date.now());

  return { plan: subscription.plan, limits: PLANS[subscription.plan].limits, isActive };
}

export function currentPeriod(): { start: Date; end: Date } {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  return { start, end };
}

export interface QuotaStatus {
  used: number;
  limit: number;
  remaining: number;
  periodEnd: Date;
}

export async function getQuotaStatus(
  userId: string,
  metric: QuotaMetric,
): Promise<QuotaStatus> {
  const entitlements = await getEntitlements(userId);
  if (!entitlements) {
    throw AppError.paymentRequired("Choose a plan to start generating content.");
  }

  const limitKey = METRIC_TO_LIMIT[metric];
  const limit = limitKey
    ? (entitlements.limits[limitKey] as number)
    : Number.POSITIVE_INFINITY;

  const { start, end } = currentPeriod();

  const record = await prisma.usageRecord.findUnique({
    where: { userId_metric_periodStart: { userId, metric, periodStart: start } },
    select: { amount: true },
  });

  const used = record?.amount ?? 0;
  return { used, limit, remaining: Math.max(0, limit - used), periodEnd: end };
}

/**
 * Reserves quota. Throws before any expensive work starts.
 * Pair every successful call with `refundQuota` on failure.
 */
export async function consumeQuota(
  userId: string,
  metric: QuotaMetric,
  amount = 1,
): Promise<void> {
  const entitlements = await getEntitlements(userId);

  if (!entitlements) {
    throw AppError.paymentRequired("Choose a plan to start generating content.");
  }
  if (!entitlements.isActive) {
    throw AppError.paymentRequired(
      "Your subscription is inactive. Update your billing details to keep going.",
    );
  }

  const limitKey = METRIC_TO_LIMIT[metric];
  const limit = limitKey
    ? (entitlements.limits[limitKey] as number)
    : Number.POSITIVE_INFINITY;

  if (limit === Number.POSITIVE_INFINITY) return;

  const { start, end } = currentPeriod();

  const record = await prisma.usageRecord.upsert({
    where: { userId_metric_periodStart: { userId, metric, periodStart: start } },
    create: { userId, metric, periodStart: start, periodEnd: end, amount },
    update: { amount: { increment: amount } },
    select: { amount: true },
  });

  if (record.amount > limit) {
    // Roll back the over-consumption so the counter stays truthful.
    await prisma.usageRecord.update({
      where: { userId_metric_periodStart: { userId, metric, periodStart: start } },
      data: { amount: { decrement: amount } },
    });

    throw AppError.quotaExceeded(
      `You've used all ${limit} of this month's allowance on the ${PLANS[entitlements.plan].name} plan.`,
      { details: { metric, limit, plan: entitlements.plan, resetsAt: end.toISOString() } },
    );
  }
}

/** Returns quota after failed work, so a provider outage doesn't cost the user. */
export async function refundQuota(
  userId: string,
  metric: QuotaMetric,
  amount = 1,
): Promise<void> {
  const { start } = currentPeriod();

  await prisma.usageRecord
    .update({
      where: { userId_metric_periodStart: { userId, metric, periodStart: start } },
      data: { amount: { decrement: amount } },
    })
    .catch(() => {});
}

/** Structural limits (projects, competitors, keywords) are counted, not metered. */
export async function assertWithinStructuralLimit(
  userId: string,
  resource: "projects" | "trackedKeywords" | "competitorsPerProject",
  options: { projectId?: string } = {},
): Promise<void> {
  const entitlements = await getEntitlements(userId);
  if (!entitlements) {
    throw AppError.paymentRequired("Choose a plan to continue.");
  }

  const limit = entitlements.limits[resource] as number;

  const count =
    resource === "projects"
      ? await prisma.project.count({ where: { userId } })
      : resource === "trackedKeywords"
        ? await prisma.keyword.count({
            where: { isTracked: true, project: { userId } },
          })
        : await prisma.competitor.count({ where: { projectId: options.projectId } });

  if (count >= limit) {
    throw AppError.quotaExceeded(
      `You've reached the ${limit} ${resource} limit on the ${PLANS[entitlements.plan].name} plan.`,
      { details: { resource, limit, plan: entitlements.plan } },
    );
  }
}
