import { onboarding } from "@theseosaas/core";

import { handler, ok, requireUser } from "@/lib/route-helpers";

/**
 * GET /api/onboarding — the whole flow's state in one request.
 *
 * Returned as a single payload rather than per-step endpoints because every
 * step is pre-filled from the same claimed audit. Fetching it once means
 * stepping back and forth is instant, with no spinner between screens.
 */
export const GET = handler(async () => {
  const user = await requireUser();
  return ok(await onboarding.getOnboardingState(user.id));
});

export const dynamic = "force-dynamic";
