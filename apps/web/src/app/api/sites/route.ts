import { projects } from "@theseosaas/core";

import { handler, ok, requireUser } from "@/lib/route-helpers";

/**
 * GET /api/sites
 *
 * Backs the dashboard's site switcher: every site this user owns, plus quota
 * for whether they can add another.
 */
export const GET = handler(async () => {
  const user = await requireUser();

  const [sites, addSiteQuota] = await Promise.all([
    projects.listSites(user.id),
    projects.getAddSiteQuota(user.id),
  ]);

  return ok({ sites, addSiteQuota });
});

export const dynamic = "force-dynamic";
