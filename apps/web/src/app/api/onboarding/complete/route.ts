import { onboarding } from "@theseosaas/core";

import { handler, ok, requireUser } from "@/lib/route-helpers";

/**
 * POST /api/onboarding/complete
 *
 * Requires an active plan, so this throws PAYMENT_REQUIRED until billing
 * completes. Marking a user onboarded without one would drop them onto a
 * dashboard where every action is paywalled.
 *
 * Returns the first tracked crawl so the setup-complete screen can watch it.
 * `reused` distinguishes a fresh run from the audit that carried over out of
 * the free funnel — the screen says different things about each.
 */
export const POST = handler(async () => {
  const user = await requireUser();
  const result = await onboarding.completeOnboarding(user.id);

  return ok(result);
});

export const dynamic = "force-dynamic";
