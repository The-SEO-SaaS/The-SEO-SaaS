import { DashboardView } from "./dashboard-view";

export default async function SiteDashboardPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;

  return <DashboardView projectId={projectId} />;
}
