import { billing } from "@theseosaas/core";

import { handler, ok, requireUser } from "@/lib/route-helpers";

/**
 * POST /api/billing/portal
 *
 * Hosted Dodo customer portal — card changes, invoices, self-serve
 * cancellation. Throws BAD_REQUEST (via billing.createPortalLink) if the user
 * has never checked out, so there's no dodoCustomerId to open a portal for.
 */
export const POST = handler(async () => {
  const user = await requireUser();
  const url = await billing.createPortalLink(user.id);
  return ok({ url });
});

export const dynamic = "force-dynamic";
