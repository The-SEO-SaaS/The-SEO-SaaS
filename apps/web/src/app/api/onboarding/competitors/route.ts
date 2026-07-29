import { onboarding } from "@theseosaas/core";
import type { NextRequest } from "next/server";

import { handler, ok, requireUser } from "@/lib/route-helpers";

/**
 * POST /api/onboarding/competitors
 *
 * Takes the full selected set, not a delta. Exceeding the plan limit returns
 * QUOTA_EXCEEDED, which the client renders as an upgrade prompt rather than an
 * error — hitting a limit is a sales moment, not a failure.
 */
export const POST = handler(async (request: NextRequest) => {
  const user = await requireUser();
  const body = await request.json().catch(() => ({}));

  return ok(await onboarding.saveCompetitorsStep(user.id, body));
});

export const dynamic = "force-dynamic";
