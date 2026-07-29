import { audit } from "@theseosaas/core";

import { handler, ok } from "@/lib/route-helpers";

/**
 * GET /api/audit/[publicId]/progress
 *
 * Polled every ~1.5s by the crawl loader, so it stays deliberately small: a
 * status, a step and a percentage, nothing else. The full report is a separate
 * request made once, when the audit completes.
 */
export const GET = handler(
  async (_request: Request, context: { params: Promise<{ publicId: string }> }) => {
    const { publicId } = await context.params;
    return ok(await audit.getAuditProgress(publicId));
  },
);

export const dynamic = "force-dynamic";
