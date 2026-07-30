import { competitors } from "@theseosaas/core";
import type { NextRequest } from "next/server";

import { handler, ok, requireUser } from "@/lib/route-helpers";

type Context = { params: Promise<{ projectId: string; competitorId: string }> };

export const DELETE = handler(async (_request: NextRequest, context: Context) => {
  const { projectId, competitorId } = await context.params;
  const user = await requireUser();

  await competitors.removeCompetitor(user.id, projectId, competitorId);
  return ok({ ok: true });
});

export const dynamic = "force-dynamic";
