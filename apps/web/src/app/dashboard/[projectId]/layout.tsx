import { RememberSite } from "@/components/dashboard/remember-site";

/**
 * Shell for one site's screens.
 *
 * Deliberately renders no header: in the design each screen owns its own top
 * bar — Dashboard and Keywords use the breadcrumb, Audits replaces it with the
 * run band — so a layout-level bar would double up on every page but one.
 */
export default async function SiteDashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;

  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <RememberSite siteId={projectId} />
      {children}
    </div>
  );
}
