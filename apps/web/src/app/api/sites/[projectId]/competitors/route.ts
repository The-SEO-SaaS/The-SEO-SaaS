import { competitors } from "@theseosaas/core";
import type { NextRequest } from "next/server";

import { handler, ok, requireUser } from "@/lib/route-helpers";

type Context = { params: Promise<{ projectId: string }> };

/** GET /api/sites/[projectId]/competitors — standings, head-to-head matrix, quota. */
export const GET = handler(async (_request: NextRequest, context: Context) => {
  const { projectId } = await context.params;
  const user = await requireUser();

  return ok(await competitors.listCompetitors(user.id, projectId));
});

export const POST = handler(async (request: NextRequest, context: Context) => {
  const { projectId } = await context.params;
  const user = await requireUser();
  const body = await request.json().catch(() => ({}));

  return ok(await competitors.addCompetitor(user.id, projectId, body));
});

export const dynamic = "force-dynamic";
