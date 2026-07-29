import type { Metadata } from "next";

import { AuditFlow } from "./audit-flow";

/**
 * /audit/[publicId] — the shareable report.
 *
 * A server component wrapper purely for metadata: these links get posted to
 * Reddit and Slack, so the preview card matters. The interactive flow (poll →
 * email gate → report) is the client component below.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ publicId: string }>;
}): Promise<Metadata> {
  const { publicId } = await params;

  return {
    title: "SEO audit report — TheSEOSaaS",
    description:
      "A free SEO audit: what's costing this site search traffic, and the pages that would close the gap.",
    openGraph: {
      title: "SEO audit report — TheSEOSaaS",
      description:
        "A free SEO audit: what's costing this site search traffic, and the pages that would close the gap.",
      url: `/audit/${publicId}`,
      type: "article",
    },
  };
}

export default async function AuditPage({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
  const { publicId } = await params;
  return <AuditFlow publicId={publicId} />;
}
