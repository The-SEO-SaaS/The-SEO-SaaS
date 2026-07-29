import { audit } from "@theseosaas/core";

import { getSession, handler, ok } from "@/lib/route-helpers";

/**
 * GET /api/audit/[publicId] — the full report.
 *
 * Intentionally public. A shared audit link has to render for someone with no
 * account, because founders passing these around in Reddit threads is the
 * distribution model. The session is read only to decide whether to show the
 * "claim this audit" CTA, never to gate access.
 */
export const GET = handler(
  async (_request: Request, context: { params: Promise<{ publicId: string }> }) => {
    const { publicId } = await context.params;
    const session = await getSession();

    return ok(await audit.getAuditReport(publicId, session?.user.id));
  },
);

export const dynamic = "force-dynamic";
