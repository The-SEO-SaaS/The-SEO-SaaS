import type { Metadata } from "next";

import { KeywordsView } from "./keywords-view";

export const metadata: Metadata = {
  title: "Keywords — TheSEOSaaS",
  robots: { index: false, follow: false },
};

export default async function KeywordsPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;

  return <KeywordsView projectId={projectId} />;
}
