import type { Metadata } from "next";

import { CompetitorsView } from "./competitors-view";

export const metadata: Metadata = {
  title: "Competitors — TheSEOSaaS",
  robots: { index: false, follow: false },
};

export default async function CompetitorsPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;

  return <CompetitorsView projectId={projectId} />;
}
