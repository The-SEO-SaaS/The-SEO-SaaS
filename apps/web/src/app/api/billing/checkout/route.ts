import { billing } from "@theseosaas/core";
import type { NextRequest } from "next/server";

import { handler, ok, requireUser } from "@/lib/route-helpers";

/**
 * POST /api/billing/checkout
 *
 * Creates a Dodo Checkout Session for the signed-in user and returns the
 * hosted URL. The client does a full-page redirect to it — Dodo, not us,
 * collects the card.
 */
export const POST = handler(async (request: NextRequest) => {
  const user = await requireUser();
  const body = await request.json().catch(() => ({}));

  const { checkoutUrl } = await billing.createCheckout({
    userId: user.id,
    email: user.email,
    name: user.name,
    plan: body?.plan,
    interval: body?.interval ?? "MONTHLY",
    returnPath: body?.returnPath,
    cancelPath: body?.cancelPath,
  });

  return ok({ checkoutUrl });
});

export const dynamic = "force-dynamic";
