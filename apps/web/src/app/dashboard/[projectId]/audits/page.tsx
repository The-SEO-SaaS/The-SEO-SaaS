import type { Metadata } from "next";

import { AuditsView } from "./audits-view";

export const metadata: Metadata = {
  title: "Audits — TheSEOSaaS",
  robots: { index: false, follow: false },
};

export default async function AuditsPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;

  return <AuditsView projectId={projectId} />;
}
