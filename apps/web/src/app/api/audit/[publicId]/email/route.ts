import { audit } from "@theseosaas/core";
import type { NextRequest } from "next/server";

import { handler, ok } from "@/lib/route-helpers";

/**
 * POST /api/audit/[publicId]/email — the soft lead gate.
 *
 * Capturing the email never unlocks anything: the report is already visible
 * and the user can skip this entirely. It exists so we can send a copy and
 * follow up, not as a toll gate.
 */
export const POST = handler(
  async (request: NextRequest, context: { params: Promise<{ publicId: string }> }) => {
    const { publicId } = await context.params;
    const body = await request.json().catch(() => ({}));

    await audit.captureAuditLead(publicId, { email: body?.email });

    return ok({ ok: true });
  },
);

export const dynamic = "force-dynamic";
