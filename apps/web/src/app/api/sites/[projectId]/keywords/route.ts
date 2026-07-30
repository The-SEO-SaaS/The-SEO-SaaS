import { keywords } from "@theseosaas/core";
import type { NextRequest } from "next/server";

import { handler, ok, requireUser } from "@/lib/route-helpers";

type Context = { params: Promise<{ projectId: string }> };

/** GET /api/sites/[projectId]/keywords — table rows, gaps, summary, quota. */
export const GET = handler(async (_request: NextRequest, context: Context) => {
  const { projectId } = await context.params;
  const user = await requireUser();

  return ok(await keywords.listKeywords(user.id, projectId));
});

/**
 * POST /api/sites/[projectId]/keywords
 *
 * Two shapes, one route: `{ terms: [...] }` adds keywords the user typed,
 * `{ gapTerms: [...] }` adopts audit-suggested terms and keeps their
 * rationale. Splitting these into separate endpoints would duplicate the same
 * quota check twice.
 */
export const POST = handler(async (request: NextRequest, context: Context) => {
  const { projectId } = await context.params;
  const user = await requireUser();
  const body = await request.json().catch(() => ({}));

  if (Array.isArray(body?.gapTerms)) {
    return ok(await keywords.trackGapTerms(user.id, projectId, body.gapTerms));
  }

  return ok(await keywords.addKeywords(user.id, projectId, body));
});

export const dynamic = "force-dynamic";
