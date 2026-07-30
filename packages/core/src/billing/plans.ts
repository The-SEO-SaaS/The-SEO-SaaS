import { env } from "@theseosaas/env/server";

import { PLAN_ORDER, type BillingInterval, type PlanId } from "./plan-data.ts";

/**
 * The env-dependent half of plans: mapping a plan + interval to its Dodo
 * product ID.
 *
 * Everything inert — prices, limits, feature copy — lives in `plan-data.ts`,
 * which imports nothing and is therefore safe inside client components. This
 * file needs `env`, so importing it from the browser would drag the server
 * runtime along. Keep the split.
 *
 * Product IDs come from env rather than being hard-coded because they differ
 * between Dodo's test and live modes; hard-coding them would let a test key
 * silently charge against live products (or just fail).
 */

// Re-exported so server-side callers can keep importing plans from one place,
// and so `billing.PLANS` still resolves.
export * from "./plan-data.ts";

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
