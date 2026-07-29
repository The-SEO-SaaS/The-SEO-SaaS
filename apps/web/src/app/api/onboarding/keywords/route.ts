import { onboarding } from "@theseosaas/core";
import type { NextRequest } from "next/server";

import { handler, ok, requireUser } from "@/lib/route-helpers";

/** POST /api/onboarding/keywords — the complete set of terms to track. */
export const POST = handler(async (request: NextRequest) => {
  const user = await requireUser();
  const body = await request.json().catch(() => ({}));

  return ok(await onboarding.saveKeywordsStep(user.id, body));
});

export const dynamic = "force-dynamic";
