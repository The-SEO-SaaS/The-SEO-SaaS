import { auth } from "@theseosaas/core";

import { handler, ok, requireUser } from "@/lib/route-helpers";

/**
 * POST /api/audit/[publicId]/claim
 *
 * The hinge between the anonymous funnel and the account: adopts a completed
 * audit, creating the project and moving its opportunities across so the new
 * user's first dashboard is populated rather than empty.
 *
 * The publicId lookup lives in core rather than here. This route used to reach
 * for prisma directly, which made apps/web depend on @theseosaas/db without
 * declaring it — pnpm therefore never linked it, and a production build
 * couldn't resolve the import at all.
 */
export const POST = handler(
  async (_request: Request, context: { params: Promise<{ publicId: string }> }) => {
    const { publicId } = await context.params;
    const user = await requireUser();

    return ok(await auth.claimAuditByPublicId(publicId, user.id));
  },
);

export const dynamic = "force-dynamic";
