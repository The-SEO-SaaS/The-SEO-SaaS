import { audit } from "@theseosaas/core";
import type { NextRequest } from "next/server";

import { clientIp, handler, ok } from "@/lib/route-helpers";

/**
 * POST /api/audit — start a free audit.
 *
 * No authentication. This is the top of the funnel and the whole point is that
 * a founder can get value before creating an account.
 *
 * Returns immediately with a publicId; the work runs on the worker and the
 * client polls /progress. Rate limiting lives in the service, since a free
 * audit costs real provider spend.
 */
export const POST = handler(async (request: NextRequest) => {
  const body = await request.json().catch(() => ({}));

  const result = await audit.startAudit(
    { domain: body?.domain },
    { ipAddress: await clientIp() },
  );

  return ok(
    {
      id: result.id,
      publicId: result.publicId,
      status: result.status,
      currentStep: null,
      progress: 0,
      error: null,
    },
    // 202: accepted, not yet complete.
    { status: result.reused ? 200 : 202 },
  );
});

/** Audits are long-running and stateful; nothing here is cacheable. */
export const dynamic = "force-dynamic";
