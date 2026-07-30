import { content } from "@theseosaas/core";
import type { NextRequest } from "next/server";

import { handler, ok, requireUser } from "@/lib/route-helpers";

type Context = { params: Promise<{ contentId: string }> };

/**
 * GET /api/content/[contentId] — one brief or post, including the markdown body.
 *
 * Not nested under the project: ownership is proven through the content row's
 * own project relation, so carrying a projectId in the path would add a
 * parameter the handler has to distrust anyway.
 */
export const GET = handler(async (_request: NextRequest, context: Context) => {
  const { contentId } = await context.params;
  const user = await requireUser();

  return ok(await content.getContentItem(user.id, contentId));
});

/** PATCH /api/content/[contentId] — the user's own publish/archive bookkeeping. */
export const PATCH = handler(async (request: NextRequest, context: Context) => {
  const { contentId } = await context.params;
  const user = await requireUser();
  const body = (await request.json().catch(() => ({}))) as { status?: unknown };

  if (body.status !== "PUBLISHED" && body.status !== "ARCHIVED" && body.status !== "GENERATED") {
    return ok({ ok: false });
  }

  await content.setContentStatus(user.id, contentId, body.status);

  return ok({ ok: true });
});

export const dynamic = "force-dynamic";
