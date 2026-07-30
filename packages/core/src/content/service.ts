import prisma from "@theseosaas/db";

import { consumeQuota, getQuotaStatus } from "../billing/quota.ts";
import { queuePriorityFor, type PlanId } from "../billing/plans.ts";
import { AppError } from "../errors.ts";
import { enqueue, JOB_TYPES } from "../queue/index.ts";
import { generateBrief, briefSchema, type GeneratedBrief } from "./generate.ts";

/**
 * The Content library — what the product actually *builds*.
 *
 * The flow the design's screen is arranged around: an audit surfaces an
 * opportunity → a brief is written from it (free, every plan) → the user
 * approves the angle → the full post is queued (costs one article from the
 * month's allowance). Every row keeps its `opportunityId`, so nothing in the
 * library is ever a bare title with no answer to "why is this here?".
 */

export interface BriefSummary {
  id: string;
  title: string;
  /** "From keyword gap: cold brew subscription" — the design's source line. */
  source: string;
  angle: string;
  sections: { heading: string; covers: string }[];
  keywords: string[];
  wordTarget: number;
  /** True once a post has been generated from this brief. */
  hasPost: boolean;
  createdAt: string;
}

export interface PostSummary {
  id: string;
  title: string;
  source: string;
  status: "DRAFT" | "GENERATING" | "GENERATED" | "PUBLISHED" | "ARCHIVED" | "FAILED";
  keywords: string[];
  wordCount: number | null;
  lastError: string | null;
  createdAt: string;
}

export interface ContentLibrary {
  site: { id: string; domain: string };
  briefs: BriefSummary[];
  posts: PostSummary[];
  /** Opportunities with no brief yet — what "New brief" draws from. */
  availableOpportunities: { id: string; title: string; rationale: string; keywords: string[] }[];
  quota: { used: number; limit: number; remaining: number; periodEnd: string };
}

export interface ContentDetail {
  id: string;
  projectId: string;
  title: string;
  status: PostSummary["status"];
  body: string | null;
  keywords: string[];
  source: string;
  metaDescription: string | null;
  wordCount: number | null;
  lastError: string | null;
  createdAt: string;
  updatedAt: string;
}

async function assertOwnedProject(userId: string, projectId: string) {
  const project = await prisma.project.findFirst({
    where: { id: projectId, userId },
    select: { id: true, domain: true },
  });
  if (!project) throw AppError.notFound("We couldn't find that site.");
  return project;
}

/** "From keyword gap: X" / "From audit finding: Y" — never a bare title. */
function sourceLine(keywords: string[], rationale: string | null): string {
  if (keywords.length > 0) return `From keyword gap: ${keywords[0]}`;
  if (rationale) return rationale;
  return "From your latest audit";
}

export async function getContentLibrary(
  userId: string,
  projectId: string,
): Promise<ContentLibrary> {
  const project = await assertOwnedProject(userId, projectId);

  const [rows, opportunities, quota] = await Promise.all([
    prisma.content.findMany({
      where: { projectId, type: { in: ["BLOG_BRIEF", "BLOG_POST"] } },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        type: true,
        status: true,
        title: true,
        brief: true,
        keywords: true,
        rationale: true,
        wordCount: true,
        lastError: true,
        opportunityId: true,
        createdAt: true,
      },
    }),
    prisma.opportunity.findMany({
      where: { projectId, status: "SUGGESTED", type: "BLOG_POST" },
      orderBy: { rank: "asc" },
      select: { id: true, title: true, rationale: true, keywords: true },
    }),
    getQuotaStatus(userId, "AI_BLOG_POST"),
  ]);

  const postsByOpportunity = new Set(
    rows.filter((row) => row.type === "BLOG_POST" && row.opportunityId).map((row) => row.opportunityId!),
  );

  const briefs: BriefSummary[] = rows
    .filter((row) => row.type === "BLOG_BRIEF")
    .map((row) => {
      const parsed = briefSchema.safeParse(row.brief);

      return {
        id: row.id,
        title: row.title,
        source: sourceLine(row.keywords, row.rationale),
        angle: parsed.success ? parsed.data.angle : "",
        sections: parsed.success ? parsed.data.sections : [],
        keywords: row.keywords,
        wordTarget: parsed.success ? parsed.data.wordTarget : 0,
        hasPost: row.opportunityId ? postsByOpportunity.has(row.opportunityId) : false,
        createdAt: row.createdAt.toISOString(),
      };
    });

  const posts: PostSummary[] = rows
    .filter((row) => row.type === "BLOG_POST")
    .map((row) => ({
      id: row.id,
      title: row.title,
      source: sourceLine(row.keywords, row.rationale),
      status: row.status,
      keywords: row.keywords,
      wordCount: row.wordCount,
      lastError: row.lastError,
      createdAt: row.createdAt.toISOString(),
    }));

  // An opportunity that already has a brief isn't "available" — offering it
  // again would just produce a duplicate outline.
  const briefedOpportunities = new Set(
    rows.filter((row) => row.type === "BLOG_BRIEF" && row.opportunityId).map((row) => row.opportunityId!),
  );

  return {
    site: project,
    briefs,
    posts,
    availableOpportunities: opportunities.filter((item) => !briefedOpportunities.has(item.id)),
    quota: {
      used: quota.used,
      limit: quota.limit === Number.POSITIVE_INFINITY ? -1 : quota.limit,
      remaining: quota.remaining,
      periodEnd: quota.periodEnd.toISOString(),
    },
  };
}

export async function getContentItem(
  userId: string,
  contentId: string,
): Promise<ContentDetail> {
  const content = await prisma.content.findFirst({
    where: { id: contentId, project: { userId } },
    select: {
      id: true,
      projectId: true,
      title: true,
      status: true,
      body: true,
      brief: true,
      keywords: true,
      rationale: true,
      wordCount: true,
      lastError: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!content) throw AppError.notFound("We couldn't find that piece of content.");

  const parsed = briefSchema.safeParse(content.brief);

  return {
    id: content.id,
    projectId: content.projectId,
    title: content.title,
    status: content.status,
    body: content.body,
    keywords: content.keywords,
    source: sourceLine(content.keywords, content.rationale),
    metaDescription: parsed.success ? parsed.data.metaDescription : null,
    wordCount: content.wordCount,
    lastError: content.lastError,
    createdAt: content.createdAt.toISOString(),
    updatedAt: content.updatedAt.toISOString(),
  };
}

/**
 * Writes a brief from an audit opportunity.
 *
 * Free on every plan and runs inline: it's one small structured call, and
 * making the user wait on a queue to see an outline would break the review
 * loop the two-stage flow exists for.
 */
export async function createBriefFromOpportunity(
  userId: string,
  projectId: string,
  opportunityId: string,
): Promise<BriefSummary> {
  const project = await assertOwnedProject(userId, projectId);

  const opportunity = await prisma.opportunity.findFirst({
    where: { id: opportunityId, projectId },
    select: { id: true, title: true, rationale: true, keywords: true },
  });

  if (!opportunity) throw AppError.notFound("We couldn't find that opportunity.");

  const existing = await prisma.content.findFirst({
    where: { projectId, opportunityId, type: "BLOG_BRIEF" },
    select: { id: true },
  });

  if (existing) {
    throw AppError.conflict("There's already a brief for this opportunity.");
  }

  const targetKeyword = opportunity.keywords[0] ?? opportunity.title;

  const [ranking, competitors] = await Promise.all([
    prisma.keyword.findFirst({
      where: { projectId, term: targetKeyword },
      select: {
        rankings: { orderBy: { checkedAt: "desc" }, take: 1, select: { position: true } },
      },
    }),
    prisma.competitor.findMany({ where: { projectId }, select: { domain: true } }),
  ]);

  const positioningAudit = await prisma.audit.findFirst({
    where: { projectId, status: "COMPLETED" },
    orderBy: { completedAt: "desc" },
    select: { rawData: true },
  });

  const raw = (positioningAudit?.rawData ?? {}) as {
    positioning?: { summary?: string } | string;
  };
  const positioning =
    typeof raw.positioning === "string" ? raw.positioning : (raw.positioning?.summary ?? null);

  const generated = await generateBrief({
    domain: project.domain,
    positioning,
    targetKeyword,
    supportingKeywords: opportunity.keywords.slice(1),
    rationale: opportunity.rationale,
    currentPosition: ranking?.rankings[0]?.position ?? null,
    competitorsRanking: competitors.map((competitor) => competitor.domain),
  });

  const row = await prisma.content.create({
    data: {
      projectId,
      opportunityId: opportunity.id,
      type: "BLOG_BRIEF",
      status: "GENERATED",
      title: generated.brief.title,
      brief: generated.brief,
      keywords: opportunity.keywords.length > 0 ? opportunity.keywords : [targetKeyword],
      rationale: opportunity.rationale,
      model: generated.model,
      aiInputTokens: generated.usage.inputTokens,
      aiOutputTokens: generated.usage.outputTokens,
      costUsd: generated.usage.costUsd,
    },
    select: { id: true, createdAt: true, keywords: true },
  });

  return {
    id: row.id,
    title: generated.brief.title,
    source: sourceLine(row.keywords, opportunity.rationale),
    angle: generated.brief.angle,
    sections: generated.brief.sections,
    keywords: row.keywords,
    wordTarget: generated.brief.wordTarget,
    hasPost: false,
    createdAt: row.createdAt.toISOString(),
  };
}

/**
 * Queues the full article for an approved brief.
 *
 * Quota is consumed here, before the job exists, so a user can't queue twenty
 * posts on a five-post plan while the first is still running. The worker
 * refunds it if generation produces nothing.
 */
export async function requestPostFromBrief(
  userId: string,
  briefId: string,
): Promise<{ contentId: string }> {
  const brief = await prisma.content.findFirst({
    where: { id: briefId, type: "BLOG_BRIEF", project: { userId } },
    select: {
      id: true,
      projectId: true,
      opportunityId: true,
      title: true,
      brief: true,
      keywords: true,
      rationale: true,
    },
  });

  if (!brief) throw AppError.notFound("We couldn't find that brief.");

  const parsed = briefSchema.safeParse(brief.brief);
  if (!parsed.success) {
    throw AppError.badRequest("This brief is incomplete. Regenerate it before writing the post.");
  }

  const inFlight = await prisma.content.findFirst({
    where: {
      projectId: brief.projectId,
      opportunityId: brief.opportunityId,
      type: "BLOG_POST",
      status: { in: ["GENERATING", "GENERATED", "PUBLISHED"] },
    },
    select: { id: true },
  });

  // Not an error — hand back the post that already exists or is being written.
  if (inFlight) return { contentId: inFlight.id };

  await consumeQuota(userId, "AI_BLOG_POST");

  const subscription = await prisma.subscription.findUnique({
    where: { userId },
    select: { plan: true },
  });

  const post = await prisma.content.create({
    data: {
      projectId: brief.projectId,
      opportunityId: brief.opportunityId,
      type: "BLOG_POST",
      status: "GENERATING",
      title: parsed.data.title,
      brief: parsed.data,
      keywords: brief.keywords,
      rationale: brief.rationale,
    },
    select: { id: true },
  });

  const job = await enqueue(
    JOB_TYPES.CONTENT_GENERATE,
    { contentId: post.id },
    {
      priority: queuePriorityFor((subscription?.plan as PlanId | undefined) ?? null),
      maxAttempts: 2,
    },
  );

  await prisma.content.update({ where: { id: post.id }, data: { jobId: job.id } });

  return { contentId: post.id };
}

/** Marks a generated post as published — the user's own record-keeping. */
export async function setContentStatus(
  userId: string,
  contentId: string,
  status: "PUBLISHED" | "ARCHIVED" | "GENERATED",
): Promise<void> {
  const content = await prisma.content.findFirst({
    where: { id: contentId, project: { userId } },
    select: { id: true },
  });

  if (!content) throw AppError.notFound("We couldn't find that piece of content.");

  await prisma.content.update({
    where: { id: content.id },
    data: { status, publishedAt: status === "PUBLISHED" ? new Date() : null },
  });
}

export type { GeneratedBrief };
