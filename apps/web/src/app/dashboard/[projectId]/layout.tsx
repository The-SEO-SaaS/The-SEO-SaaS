import { billing } from "@theseosaas/core";
import { redirect } from "next/navigation";

import { RememberSite } from "@/components/dashboard/remember-site";
import { SubscribeGate } from "@/components/dashboard/subscribe-gate";
import { getSession } from "@/lib/route-helpers";

/**
 * Shell for one site's screens.
 *
 * Deliberately renders no header: in the design each screen owns its own top
 * bar — Dashboard and Keywords use the breadcrumb, Audits replaces it with the
 * run band — so a layout-level bar would double up on every page but one.
 *
 * Also the app's paywall boundary. `/dashboard` (the site picker) and
 * `/dashboard/settings` (billing) sit outside this segment on purpose — the
 * former has nothing to show without a project, which onboarding already
 * refuses to create without an active plan, and the latter is where
 * "subscribe" has to happen, so it can't be behind the same gate it leads to.
 * Every actual project screen — overview, keywords, competitors, content,
 * audits — lives under this `[projectId]` segment, so checking once here
 * covers all of them without repeating the check per page.
 *
 * Server-side and ahead of `children`: an expired subscription should never
 * cause a paywalled page to still fetch and render keywords or competitor
 * data nobody is allowed to see, even briefly.
 */
export default async function SiteDashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;

  const session = await getSession();
  if (!session) {
    redirect(`/login?redirectTo=${encodeURIComponent(`/dashboard/${projectId}`)}`);
  }

  const entitlements = await billing.getEntitlements(session.user.id);
  if (!entitlements || !entitlements.isActive) {
    return (
      <SubscribeGate
        reason={entitlements ? "Your subscription isn't active" : "You haven't subscribed yet"}
      />
    );
  }

  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <RememberSite siteId={projectId} />
      {children}
    </div>
  );
}
