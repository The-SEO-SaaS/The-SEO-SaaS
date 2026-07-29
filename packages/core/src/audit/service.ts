import prisma from "@theseosaas/db";
import { z } from "zod";

import { AppError } from "../errors.js";
import { enqueue, JOB_TYPES } from "../queue/index.js";
import { consumeRateLimit } from "../ratelimit.js";
import { normalizeDomain } from "../util/domain.js";
import { randomId } from "../util/crypto.js";
import { emailSchema } from "../auth/magic-link.js";

/**
 * Audit use-cases called by route handlers.
 *
 * Everything here is framework-agnostic: plain inputs, plain outputs, no
 * request or response objects.
 */

export const startAuditSchema = z.object({
  domain: z.string().min(1, "Enter your website URL."),
});

/**
 * Abuse limits. A free audit costs real money, so this is the difference
 * between a lead magnet and someone else's free API.
 */
const RATE_LIMIT_PER_IP = { limit: 5, windowMs: 1000 * 60 * 60 };
const RATE_LIMIT_PER_DOMAIN = { limit: 3, windowMs: 1000 * 60 * 60 * 24 };

/** How long a completed audit is reused instead of re-run. */
const REUSE_WINDOW_MS = 1000 * 60 * 60 * 24;

export interface StartAuditResult {
  id: string;
  publicId: string;
  status: string;
  reused: boolean;
}

export async function startAudit(
  input: { domain: string },
  meta: { ipAddress?: string | null } = {},
): Promise<StartAuditResult> {
  const parsed = startAuditSchema.parse(input);
  const domain = normalizeDomain(parsed.domain);

  if (meta.ipAddress) {
    await consumeRateLimit(
      `audit:ip:${meta.ipAddress}`,
      RATE_LIMIT_PER_IP,
      "You've run several audits recently. Try again in a little while.",
    );
  }

  // Serve a recent completed audit rather than paying to regenerate it. This
  // also makes a shared Reddit link cheap when several people click it.
  const recent = await prisma.audit.findFirst({
    where: {
      domain,
      status: "COMPLETED",
      completedAt: { gt: new Date(Date.now() - REUSE_WINDOW_MS) },
    },
    orderBy: { completedAt: "desc" },
    select: { id: true, publicId: true, status: true },
  });

  if (recent) {
    return { ...recent, reused: true };
  }

  // An audit already running for this domain — return it instead of starting
  // a duplicate. Guards the double-submit case.
  const inFlight = await prisma.audit.findFirst({
    where: { domain, status: { in: ["QUEUED", "RUNNING"] } },
    orderBy: { createdAt: "desc" },
    select: { id: true, publicId: true, status: true },
  });

  if (inFlight) {
    return { ...inFlight, reused: true };
  }

  await consumeRateLimit(
    `audit:domain:${domain}`,
    RATE_LIMIT_PER_DOMAIN,
    "This site has been audited a few times today. Try again tomorrow.",
  );

  const audit = await prisma.audit.create({
    data: { domain, publicId: randomId(12), status: "QUEUED" },
    select: { id: true, publicId: true, status: true },
  });

  const job = await enqueue(
    JOB_TYPES.AUDIT_RUN,
    { auditId: audit.id, domain },
    // Anonymous audits sit at priority 0 so paid work always jumps ahead.
    { priority: 0, maxAttempts: 2 },
  );

  await prisma.audit.update({
    where: { id: audit.id },
    data: { jobId: job.id },
  });

  return { ...audit, reused: false };
}

export async function getAuditProgress(publicId: string) {
  const audit = await prisma.audit.findUnique({
    where: { publicId },
    select: {
      id: true,
      publicId: true,
      status: true,
      currentStep: true,
      progress: true,
      summary: true,
    },
  });

  if (!audit) throw AppError.notFound("We couldn't find that audit.");

  return {
    id: audit.id,
    publicId: audit.publicId,
    status: audit.status,
    currentStep: audit.currentStep,
    progress: audit.progress,
    // On failure the summary field carries the reason.
    error: audit.status === "FAILED" ? audit.summary : null,
  };
}

interface RawCompetitor {
  domain: string;
  name: string | null;
  appearances: number;
  bestPosition: number;
  sampleTitle: string;
  bestPage: { url: string; title: string } | null;
}

interface RawKeyword {
  term: string;
  intent: "TRANSACTIONAL" | "COMMERCIAL" | "INFORMATIONAL" | "NAVIGATIONAL";
  rationale: string;
}

/**
 * The full report.
 *
 * Public by design — a shared /audit/[publicId] link must render for someone
 * with no account, since that is the entire distribution strategy. `viewerId`
 * only decides whether we show the claim CTA.
 */
export async function getAuditReport(publicId: string, viewerId?: string | null) {
  const audit = await prisma.audit.findUnique({
    where: { publicId },
    select: {
      id: true,
      publicId: true,
      domain: true,
      status: true,
      score: true,
      technicalHealth: true,
      summary: true,
      rawData: true,
      userId: true,
      createdAt: true,
      completedAt: true,
      issues: {
        orderBy: { rank: "asc" },
        select: {
          id: true,
          severity: true,
          title: true,
          whyItMatters: true,
          howToFix: true,
          affectedUrls: true,
        },
      },
      opportunities: {
        orderBy: { rank: "asc" },
        select: {
          id: true,
          type: true,
          title: true,
          rationale: true,
          keywords: true,
        },
      },
    },
  });

  if (!audit) throw AppError.notFound("We couldn't find that audit.");

  const raw = (audit.rawData ?? {}) as {
    competitors?: RawCompetitor[];
    keywords?: RawKeyword[];
    keywordHeadline?: string | null;
  };

  return {
    id: audit.id,
    publicId: audit.publicId,
    domain: audit.domain,
    status: audit.status,
    score: audit.score,
    technicalHealth: audit.technicalHealth,
    summary: audit.summary,

    // The spec caps the report at the top issues — a full dump paralyses.
    issues: audit.issues.slice(0, 5),

    competitors: (raw.competitors ?? []).map((competitor) => ({
      id: competitor.domain,
      domain: competitor.domain,
      name: competitor.name,
      notes: null,
      bestPage: competitor.bestPage
        ? { ...competitor.bestPage, whyItMatters: null }
        : null,
    })),

    opportunities: audit.opportunities,
    keywordGaps: raw.keywords ?? [],
    keywordHeadline: raw.keywordHeadline ?? null,

    isOwner: Boolean(viewerId && audit.userId === viewerId),
    createdAt: audit.createdAt.toISOString(),
    completedAt: audit.completedAt?.toISOString() ?? null,
  };
}

export const captureLeadSchema = z.object({ email: emailSchema });

/**
 * The soft email gate. Idempotent, and never blocks report access — the user
 * is always free to skip.
 */
export async function captureAuditLead(
  publicId: string,
  input: { email: string },
): Promise<void> {
  const { email } = captureLeadSchema.parse(input);

  const { count } = await prisma.audit.updateMany({
    where: { publicId },
    data: { leadEmail: email },
  });

  if (count === 0) throw AppError.notFound("We couldn't find that audit.");
}
