import { billing } from "@theseosaas/core";

import { handler, ok, requireUser } from "@/lib/route-helpers";

/** GET /api/account — profile, subscription, and usage against plan limits. */
export const GET = handler(async () => {
  const user = await requireUser();
  return ok(await billing.getAccountSummary(user.id));
});

export const dynamic = "force-dynamic";
