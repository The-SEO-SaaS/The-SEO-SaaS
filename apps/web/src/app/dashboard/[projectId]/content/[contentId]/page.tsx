import { ContentDetailView } from "./content-detail-view";

export default async function ContentItemPage({
  params,
}: {
  params: Promise<{ projectId: string; contentId: string }>;
}) {
  const { projectId, contentId } = await params;

  return <ContentDetailView projectId={projectId} contentId={contentId} />;
}
