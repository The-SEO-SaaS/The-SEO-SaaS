import { auth } from "@theseosaas/core";
import prisma from "@theseosaas/db";

import { handler, ok, requireUser } from "@/lib/route-helpers";

/**
 * POST /api/audit/[publicId]/claim
 *
 * The hinge between the anonymous funnel and the account: adopts a completed
 * audit, creating the project and moving its opportunities across so the new
 * user's first dashboard is populated rather than empty.
 *
 * The route resolves publicId to an internal id before calling core, which
 * takes the internal id — the public slug is a transport detail that shouldn't
 * leak into the service layer.
 */
export const POST = handler(
  async (_request: Request, context: { params: Promise<{ publicId: string }> }) => {
    const { publicId } = await context.params;
    const user = await requireUser();

    const audit = await prisma.audit.findUnique({
      where: { publicId },
      select: { id: true },
    });

    if (!audit) {
      const { AppError } = await import("@theseosaas/core");
      throw AppError.notFound("We couldn't find that audit.");
    }

    return ok(await auth.claimAudit(audit.id, user.id));
  },
);

export const dynamic = "force-dynamic";
