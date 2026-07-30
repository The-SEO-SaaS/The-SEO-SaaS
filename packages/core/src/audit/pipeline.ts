import prisma, { type Prisma } from "@theseosaas/db";
import { env } from "@theseosaas/env/server";

import { toAppError } from "../errors.ts";
import { sendAuditReadyEmail } from "../mail/index.ts";
import { settle } from "../util/async.ts";
import {
  extractPositioning,
  findKeywordGaps,
  generateOpportunities,
  totalUsage,
} from "./analysis.ts";
import { discoverCompetitors, findBestBlogPosts } from "./competitors.ts";
import { crawlSite } from "./crawl.ts";
import { calculateScore } from "./score.ts";
import { runTechnicalChecks } from "./technical.ts";

/**
 * The audit pipeline — the seven steps the crawl loader shows.
 *
 * Failure policy is deliberately uneven. The crawl is fatal: with no page
 * there is no audit. Everything after it is best-effort, because a report
 * missing its competitor section is still worth reading, while a hard failure
 * at step 5 wastes the provider spend already incurred on steps 1–4 and shows
 * the user nothing.
 */

export type ProgressReporter = (
  step: AuditStepKey,
  progress: number,
) => Promise<void> | void;

export type AuditStepKey =
  | "CRAWLING_WEBSITE"
  | "CHECKING_TECHNICAL_SEO"
  | "FINDING_COMPETITORS"
  | "ANALYZING_KEYWORDS"
  | "REVIEWING_TOP_PAGES"
  | "CALCULATING_SCORE"
  | "FINDING_OPPORTUNITIES";

/**
 * Progress percentages are weighted by real duration, not step count — the
 * crawl and the two model calls dominate. Even 1/7ths would stall visibly at
 * whichever step is slowest, which reads as a hang.
 */
const STEP_PROGRESS: Record<AuditStepKey, number> = {
  CRAWLING_WEBSITE: 12,
  CHECKING_TECHNICAL_SEO: 20,
  FINDING_COMPETITORS: 40,
  ANALYZING_KEYWORDS: 58,
  REVIEWING_TOP_PAGES: 72,
  CALCULATING_SCORE: 80,
  FINDING_OPPORTUNITIES: 96,
};

export interface RunAuditInput {
  auditId: string;
  domain: string;
  onProgress?: ProgressReporter;
  signal?: AbortSignal;
}

export async function runAuditPipeline({
  auditId,
  domain,
  onProgress,
  signal,
}: RunAuditInput): Promise<void> {
  const report = async (step: AuditStepKey) => {
    await prisma.audit
      .update({
        where: { id: auditId },
        data: { currentStep: step, progress: STEP_PROGRESS[step] },
      })
      .catch(() => {});
    await onProgress?.(step, STEP_PROGRESS[step]);
  };

  await prisma.audit.update({
    where: { id: auditId },
    data: { status: "RUNNING", startedAt: new Date(), progress: 0 },
  });

  try {
    // --- 1. Crawl (fatal on failure) -------------------------------------
    await report("CRAWLING_WEBSITE");
    const crawl = await crawlSite(domain, { signal });

    // --- 2. Technical checks (deterministic, no provider cost) ------------
    await report("CHECKING_TECHNICAL_SEO");
    const technical = runTechnicalChecks(crawl);
    const issues = technical.issues;

    // Positioning drives every later step's query quality, so it runs here
    // rather than being folded into a later call.
    const positioningResult = await settle(extractPositioning(crawl, signal));
    const positioning = positioningResult?.positioning ?? {
      productDescription: crawl.homepage.title ?? domain,
      category: "software",
      targetAudience: "businesses",
      // Fallback seeds are weak but keep the audit moving if the model fails.
      seedQueries: [crawl.homepage.title ?? domain, `${domain} alternative`],
      industryHint: "software",
    };

    // --- 3. Competitors ---------------------------------------------------
    await report("FINDING_COMPETITORS");
    const discovery = await settle(
      discoverCompetitors(positioning.seedQueries, crawl.domain, signal),
    );
    const competitors = discovery?.competitors ?? [];

    // --- 4. Keyword gaps --------------------------------------------------
    await report("ANALYZING_KEYWORDS");
    const gapsResult = await settle(findKeywordGaps(positioning, competitors, signal));
    const keywords = gapsResult?.gaps.keywords ?? [];

    // --- 5. Competitors' best content -------------------------------------
    await report("REVIEWING_TOP_PAGES");
    const pagesResult = await settle(
      findBestBlogPosts(competitors, positioning.industryHint, signal),
    );
    const competitorPages = pagesResult?.pages ?? [];

    // --- 6. Score ----------------------------------------------------------
    await report("CALCULATING_SCORE");
    const score = calculateScore(crawl, issues);

    // --- 7. Opportunities --------------------------------------------------
    await report("FINDING_OPPORTUNITIES");
    const opportunitiesResult = await settle(
      generateOpportunities(
        {
          positioning,
          competitors,
          competitorPages,
          keywords,
          score: score.overall,
          topIssues: issues.slice(0, 5).map((issue) => issue.title),
        },
        signal,
      ),
    );
    const opportunities = opportunitiesResult?.opportunities ?? null;

    // --- Cost accounting ---------------------------------------------------
    const usage = totalUsage(
      positioningResult?.usage ?? { inputTokens: 0, outputTokens: 0, costUsd: 0 },
      gapsResult?.usage ?? { inputTokens: 0, outputTokens: 0, costUsd: 0 },
      opportunitiesResult?.usage ?? { inputTokens: 0, outputTokens: 0, costUsd: 0 },
    );
    const searchCredits = (discovery?.creditsUsed ?? 0) + (pagesResult?.creditsUsed ?? 0);

    // --- Persist -----------------------------------------------------------
    // One transaction so a partially-written report can never be served.
    await prisma.$transaction(async (tx) => {
      await tx.audit.update({
        where: { id: auditId },
        data: {
          status: "COMPLETED",
          progress: 100,
          currentStep: null,
          score: score.overall,
          technicalHealth: score.technicalHealth,
          summary: opportunities?.verdict ?? null,
          issueCount: issues.length,
          pagesCrawled: crawl.crawledCount,
          completedAt: new Date(),
          searchCredits,
          aiInputTokens: usage.inputTokens,
          aiOutputTokens: usage.outputTokens,
          costUsd: usage.costUsd,
          rawData: {
            positioning,
            keywordHeadline: gapsResult?.gaps.headline ?? null,
            contentHealth: score.contentHealth,
            band: score.band,
            counts: technical.counts,
            healthy: technical.healthy,
            crawl: {
              finalUrl: crawl.finalUrl,
              title: crawl.homepage.title,
              metaDescription: crawl.homepage.metaDescription,
              pagesCrawled: crawl.crawledCount,
              pagesDiscovered: crawl.discoveredUrlCount,
              avgResponseTimeMs: crawl.avgResponseTimeMs,
            },
          } as Prisma.InputJsonValue,
        },
      });

      if (issues.length > 0) {
        await tx.auditIssue.createMany({
          data: issues.map((issue) => ({
            auditId,
            severity: issue.severity,
            title: issue.title,
            whyItMatters: issue.whyItMatters,
            howToFix: issue.howToFix,
            affectedUrls: issue.affectedUrls,
            rank: issue.rank,
          })),
        });
      }

      // Competitors and their best page are stored against the audit via the
      // project once claimed; until then they live in rawData plus these rows.
      if (opportunities) {
        const rows = [
          ...opportunities.blogPosts.map((item, index) => ({
            auditId,
            type: "BLOG_POST" as const,
            title: item.title,
            rationale: item.rationale,
            keywords: item.keywords,
            rank: index,
          })),
          ...opportunities.featurePages.map((item, index) => ({
            auditId,
            type: item.type,
            title: item.title,
            rationale: item.rationale,
            keywords: item.keywords,
            rank: 10 + index,
          })),
          ...opportunities.landingPages.map((item, index) => ({
            auditId,
            type: item.type,
            title: item.title,
            rationale: item.rationale,
            keywords: item.keywords,
            rank: 20 + index,
          })),
        ];

        await tx.opportunity.createMany({ data: rows });
      }
    });

    // Competitor rows are written outside the transaction: they're additive
    // detail, and a failure here shouldn't roll back a complete report.
    await persistCompetitors(auditId, competitors, competitorPages, keywords);

    // Same reasoning, more so: a bounced email must never fail a run that
    // produced a perfectly good report.
    await notifyIfRequested(auditId).catch(() => {});
  } catch (error) {
    const appError = toAppError(error);

    await prisma.audit
      .update({
        where: { id: auditId },
        data: {
          status: "FAILED",
          currentStep: null,
          summary: appError.message,
          completedAt: new Date(),
        },
      })
      .catch(() => {});

    throw appError;
  }
}

/**
 * Sends the one-off "your crawl finished" email, if someone asked for it on
 * the setup screen.
 *
 * `notifiedAt` is set in the same update that reads the address, and the write
 * is conditioned on it still being null — so a job retried after a partial
 * failure can't send the mail twice.
 */
async function notifyIfRequested(auditId: string): Promise<void> {
  const audit = await prisma.audit.findUnique({
    where: { id: auditId },
    select: {
      publicId: true,
      domain: true,
      score: true,
      summary: true,
      notifyEmail: true,
      notifiedAt: true,
    },
  });

  if (!audit?.notifyEmail || audit.notifiedAt) return;

  const claimed = await prisma.audit.updateMany({
    where: { id: auditId, notifiedAt: null },
    data: { notifiedAt: new Date() },
  });

  if (claimed.count === 0) return;

  const appUrl = env.APP_URL.replace(/\/$/, "");

  await sendAuditReadyEmail({
    to: audit.notifyEmail,
    url: `${appUrl}/audit/${audit.publicId}`,
    domain: audit.domain,
    score: audit.score ?? 0,
    headline: audit.summary ?? "Your crawl finished and the findings are ready.",
  });
}

/**
 * Competitors and keywords are project-scoped in the schema, but an anonymous
 * audit has no project yet. They're stashed on the audit's rawData so the
 * report can render them, and materialised into real rows at claim time.
 */
async function persistCompetitors(
  auditId: string,
  competitors: Awaited<ReturnType<typeof discoverCompetitors>>["competitors"],
  pages: Awaited<ReturnType<typeof findBestBlogPosts>>["pages"],
  keywords: Awaited<ReturnType<typeof findKeywordGaps>>["gaps"]["keywords"],
): Promise<void> {
  const audit = await prisma.audit.findUnique({
    where: { id: auditId },
    select: { rawData: true },
  });

  const existing = (audit?.rawData ?? {}) as Record<string, unknown>;

  await prisma.audit
    .update({
      where: { id: auditId },
      data: {
        rawData: {
          ...existing,
          competitors: competitors.map((competitor) => ({
            ...competitor,
            bestPage: pages.find((page) => page.domain === competitor.domain) ?? null,
          })),
          keywords,
        } as Prisma.InputJsonValue,
      },
    })
    .catch(() => {});
}
