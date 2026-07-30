import { content } from "@theseosaas/core";
import type { NextRequest } from "next/server";

import { handler, ok, requireUser } from "@/lib/route-helpers";

type Context = { params: Promise<{ projectId: string }> };

/** GET /api/sites/[projectId]/content — briefs, posts, quota, open opportunities. */
export const GET = handler(async (_request: NextRequest, context: Context) => {
  const { projectId } = await context.params;
  const user = await requireUser();

  return ok(await content.getContentLibrary(user.id, projectId));
});

/**
 * POST /api/sites/[projectId]/content
 *
 * Two shapes, one route, because they're the two halves of the same flow:
 * `{ opportunityId }` writes a brief (free, inline — it's one small structured
 * call), `{ briefId }` queues the full post (costs an article from the month's
 * allowance, so it goes to the worker).
 */
export const POST = handler(async (request: NextRequest, context: Context) => {
  const { projectId } = await context.params;
  const user = await requireUser();
  const body = (await request.json().catch(() => ({}))) as {
    opportunityId?: unknown;
    briefId?: unknown;
  };

  if (typeof body.briefId === "string") {
    return ok(await content.requestPostFromBrief(user.id, body.briefId));
  }

  if (typeof body.opportunityId === "string") {
    return ok(
      await content.createBriefFromOpportunity(user.id, projectId, body.opportunityId),
    );
  }

  return ok({ ok: false });
});

export const dynamic = "force-dynamic";
