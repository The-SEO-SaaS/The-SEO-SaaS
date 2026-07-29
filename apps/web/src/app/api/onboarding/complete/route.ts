import { onboarding } from "@theseosaas/core";

import { handler, ok, requireUser } from "@/lib/route-helpers";

/**
 * POST /api/onboarding/complete
 *
 * Requires an active plan, so this throws PAYMENT_REQUIRED until billing
 * completes. Marking a user onboarded without one would drop them onto a
 * dashboard where every action is paywalled.
 */
export const POST = handler(async () => {
  const user = await requireUser();
  await onboarding.completeOnboarding(user.id);

  return ok({ ok: true });
});

export const dynamic = "force-dynamic";
