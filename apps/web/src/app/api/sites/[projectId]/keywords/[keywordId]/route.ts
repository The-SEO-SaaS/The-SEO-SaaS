import { keywords } from "@theseosaas/core";
import type { NextRequest } from "next/server";

import { handler, ok, requireUser } from "@/lib/route-helpers";

type Context = { params: Promise<{ projectId: string; keywordId: string }> };

/** PATCH — toggle tracking. Untracking keeps the ranking history. */
export const PATCH = handler(async (request: NextRequest, context: Context) => {
  const { projectId, keywordId } = await context.params;
  const user = await requireUser();
  const body = await request.json().catch(() => ({}));

  await keywords.setKeywordTracked(user.id, projectId, keywordId, Boolean(body?.isTracked));
  return ok({ ok: true });
});

/** DELETE — hard delete, including history. For terms added by mistake. */
export const DELETE = handler(async (_request: NextRequest, context: Context) => {
  const { projectId, keywordId } = await context.params;
  const user = await requireUser();

  await keywords.removeKeyword(user.id, projectId, keywordId);
  return ok({ ok: true });
});

export const dynamic = "force-dynamic";
