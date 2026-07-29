import { auth } from "@theseosaas/core";

import { getSession, handler, ok } from "@/lib/route-helpers";

/**
 * GET /api/auth/session — who am I?
 *
 * Returns `{ user: null }` rather than 401 when signed out. Being logged out is
 * a normal state for this endpoint, not an error, and a 401 would make the
 * axios client treat every anonymous page load as a failure.
 */
export const GET = handler(async () => {
  const session = await getSession();

  if (!session) return ok({ user: null });

  const user = await auth.getUserById(session.user.id);
  if (!user) return ok({ user: null });

  return ok({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      image: user.image,
      plan: user.subscription?.plan ?? null,
      subscriptionStatus: user.subscription?.status ?? null,
    },
  });
});

export const dynamic = "force-dynamic";
