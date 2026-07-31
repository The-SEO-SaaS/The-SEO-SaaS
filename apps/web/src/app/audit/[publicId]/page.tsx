import { audit } from "@theseosaas/core";
import type { Metadata } from "next";

import { pageMetadata } from "@/lib/seo";

import { AuditFlow } from "./audit-flow";

/**
 * /audit/[publicId] — the shareable report.
 *
 * A server component wrapper purely for metadata: these links get posted to
 * Reddit, Slack and X, so the preview card is doing real acquisition work. The
 * interactive flow (poll → email gate → report) is the client component below.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ publicId: string }>;
}): Promise<Metadata> {
  const { publicId } = await params;

  /**
   * Read the report so the card can name the site and its score.
   *
   * "SEO audit report" told a reader nothing about whether to click.
   * "brewhaus.co scored 76/100" is the entire reason someone shares one of
   * these links — the number is the story.
   *
   * Never allowed to fail the page: a report still running, expired, or simply
   * mistyped should render its own state rather than a 500 thrown from the
   * metadata pass.
   */
  const report = await audit.getAuditReport(publicId).catch(() => null);

  const title = report?.score
    ? `${report.domain} scored ${report.score}/100`
    : report
      ? `SEO audit for ${report.domain}`
      : "SEO audit report";

  const description = report?.summary
    ? report.summary.slice(0, 200)
    : "A free SEO audit: what's costing this site search traffic, which competitors are taking it, and the pages that would win it back.";

  return pageMetadata({
    title,
    description,
    path: `/audit/${publicId}`,
    type: "article",
    /**
     * Reports stay out of search on purpose.
     *
     * Every one of these is about somebody else's domain. Thousands of thin,
     * near-identical pages naming other people's sites is a doorway-page
     * pattern Google penalises, and it publishes an analysis those owners never
     * agreed to. `follow` stays on, so links out of a report still count.
     */
    noIndex: true,
  });
}

export default async function AuditPage({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
  const { publicId } = await params;
  return <AuditFlow publicId={publicId} />;
}
