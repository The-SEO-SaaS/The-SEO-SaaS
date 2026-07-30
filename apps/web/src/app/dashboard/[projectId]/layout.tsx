import { DashboardTopBar } from "@/components/dashboard/dashboard-topbar";

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
      <DashboardTopBar currentSiteId={projectId} />
      {children}
    </div>
  );
}
