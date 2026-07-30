import { onboarding } from "@theseosaas/core";
import type { NextRequest } from "next/server";

import { handler, ok, requireUser } from "@/lib/route-helpers";

/**
 * GET /api/onboarding — the whole flow's state in one request.
 *
 * Returned as a single payload rather than per-step endpoints because every
 * step is pre-filled from the same claimed audit. Fetching it once means
 * stepping back and forth is instant, with no spinner between screens.
 *
 * An optional `?projectId=` reuses this same endpoint for the "add another
 * site" wizard — reviewing that project's audit instead of the account's
 * first one. Omitted, it's the original one-time account setup.
 */
export const GET = handler(async (request: NextRequest) => {
  const user = await requireUser();
  const projectId = request.nextUrl.searchParams.get("projectId") ?? undefined;

  return ok(await onboarding.getOnboardingState(user.id, projectId));
});

export const dynamic = "force-dynamic";
