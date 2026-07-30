import { audit } from "@theseosaas/core";
import type { NextRequest } from "next/server";

import { handler, ok, requireUser } from "@/lib/route-helpers";

type Context = { params: Promise<{ projectId: string }> };

/** GET — audit history for this site, with score deltas. */
export const GET = handler(async (_request: NextRequest, context: Context) => {
  const { projectId } = await context.params;
  const user = await requireUser();

  return ok(await audit.getAuditHistory(user.id, projectId));
});

/** POST — queue a fresh audit. Returns the already-running one if there is one. */
export const POST = handler(async (_request: NextRequest, context: Context) => {
  const { projectId } = await context.params;
  const user = await requireUser();

  return ok(await audit.rerunAudit(user.id, projectId), { status: 202 });
});

export const dynamic = "force-dynamic";
