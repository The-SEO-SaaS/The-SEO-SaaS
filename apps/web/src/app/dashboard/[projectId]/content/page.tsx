import { ContentView } from "./content-view";

export default async function ContentPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;

  return <ContentView projectId={projectId} />;
}
