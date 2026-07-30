import { projects } from "@theseosaas/core";

import { handler, ok, requireUser } from "@/lib/route-helpers";

/**
 * GET /api/sites/[projectId]
 *
 * The dashboard payload for one site. `getSiteDashboard` throws NOT_FOUND if
 * the site isn't this user's, so ownership is enforced inside the core
 * function rather than duplicated here.
 */
export const GET = handler(
  async (_request: Request, context: { params: Promise<{ projectId: string }> }) => {
    const { projectId } = await context.params;
    const user = await requireUser();

    return ok(await projects.getSiteDashboard(user.id, projectId));
  },
);

export const dynamic = "force-dynamic";
