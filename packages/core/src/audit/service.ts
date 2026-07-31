import prisma from "@theseosaas/db";
import { env } from "@theseosaas/env/server";
import { z } from "zod";

import { AppError } from "../errors.ts";
import { sendAuditReadyEmail } from "../mail/index.ts";
import { enqueue, JOB_TYPES } from "../queue/index.ts";
import { consumeRateLimit } from "../ratelimit.ts";
import { normalizeDomain } from "../util/domain.ts";
import { randomId } from "../util/crypto.ts";
import { emailSchema } from "../auth/magic-link.ts";

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

/**
 * After this long, an audit still marked QUEUED or RUNNING is presumed dead.
 *
 * Twenty minutes: comfortably past the slowest real run (the UI promises six to
 * eight, a 50-page site with slow model calls has taken twelve), and short
 * enough that a user who hit a crashed worker can simply try again rather than
 * being told their own domain is already busy.
 */
const ABANDONED_AFTER_MS = 1000 * 60 * 20;

export interface StartAuditResult {
  id: string;
  publicId: string;
  /** Normalised here, and returned so the crawl screen can render it at once. */
  domain: string;
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
    return { ...recent, domain, reused: true };
  }

  /**
   * An audit already running for this domain — return it instead of starting a
   * duplicate. Guards the double-submit case.
   *
   * The `createdAt` bound is the important part. Without it, any audit that
   * ever got stuck in RUNNING — a worker killed mid-job, a job that exhausted
   * its retries, a process that lost the database — poisoned that domain
   * permanently. Every subsequent submit found the dead row, returned it as
   * "already in flight", and enqueued nothing. The worker sat idle with an
   * empty queue while the crawl screen polled a corpse forever, which is
   * exactly the "stuck at Checking technical SEO" symptom: the pipeline was
   * fine, nothing was ever asked to run it again.
   *
   * ABANDONED_AFTER_MS is generously past the slowest real audit, so a genuine
   * double-submit still de-duplicates.
   */
  const inFlight = await prisma.audit.findFirst({
    where: {
      domain,
      status: { in: ["QUEUED", "RUNNING"] },
      createdAt: { gt: new Date(Date.now() - ABANDONED_AFTER_MS) },
    },
    orderBy: { createdAt: "desc" },
    select: { id: true, publicId: true, status: true },
  });

  if (inFlight) {
    return { ...inFlight, domain, reused: true };
  }

  // Anything older is not coming back. Retire it so it stops being found, and
  // so the report page shows an honest failure rather than a spinner, then fall
  // through and start a fresh run.
  await prisma.audit
    .updateMany({
      where: {
        domain,
        status: { in: ["QUEUED", "RUNNING"] },
        createdAt: { lte: new Date(Date.now() - ABANDONED_AFTER_MS) },
      },
      data: {
        status: "FAILED",
        currentStep: null,
        summary: "This run was interrupted and never finished. Starting a new one.",
        completedAt: new Date(),
      },
    })
    .catch(() => {});

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

  return { ...audit, domain, reused: false };
}

export async function getAuditProgress(publicId: string) {
  const audit = await prisma.audit.findUnique({
    where: { publicId },
    select: {
      id: true,
      publicId: true,
      // The crawl screen shows the domain it's working on, so it has to come
      // back with progress rather than waiting on the (not-yet-ready) report.
      domain: true,
      status: true,
      currentStep: true,
      progress: true,
      summary: true,
      createdAt: true,
    },
  });

  if (!audit) throw AppError.notFound("We couldn't find that audit.");

  /**
   * Retire a run that was never going to finish.
   *
   * The crawl screen polls until it sees COMPLETED or FAILED, so an audit
   * abandoned by a dead worker left it spinning indefinitely — no error, no
   * retry, just a progress bar frozen mid-step. Deciding that here rather than
   * only in `startAudit` matters because the person watching this screen isn't
   * the person who will next submit the domain; they need an answer now.
   *
   * Written back, not just reported, so the row stops being resurrected on the
   * next poll and so `startAudit` sees a terminal state.
   */
  const abandoned =
    (audit.status === "QUEUED" || audit.status === "RUNNING") &&
    audit.createdAt.getTime() < Date.now() - ABANDONED_AFTER_MS;

  if (abandoned) {
    const summary =
      "This run was interrupted before it finished. Run the audit again — it usually works on a second attempt.";

    await prisma.audit
      .updateMany({
        // Re-checking status guards the race where a worker picked the job back
        // up between the read above and this write.
        where: { id: audit.id, status: { in: ["QUEUED", "RUNNING"] } },
        data: { status: "FAILED", currentStep: null, summary, completedAt: new Date() },
      })
      .catch(() => {});

    return {
      id: audit.id,
      publicId: audit.publicId,
      domain: audit.domain,
      status: "FAILED" as const,
      currentStep: null,
      progress: audit.progress,
      error: summary,
    };
  }

  return {
    id: audit.id,
    publicId: audit.publicId,
    domain: audit.domain,
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
 * Free-tier limits on the public report.
 *
 * The split is breadth over volume: an anonymous visitor sees every *kind* of
 * finding — score, top issues, competitors, a sample of opportunities — but not
 * the full list. That keeps the shared link genuinely useful, which is what
 * makes it worth passing around, while leaving something to sell.
 */
const FREE_ISSUE_LIMIT = 5;
const FREE_COMPETITOR_LIMIT = 3;
const FREE_OPPORTUNITY_LIMIT = 3;
const FREE_KEYWORD_LIMIT = 10;

/**
 * The report.
 *
 * Public by design — a shared /audit/[publicId] link must render for someone
 * with no account, since that is the entire distribution strategy. `viewerId`
 * decides whether the full list is returned or the free slice plus counts of
 * what's held back.
 *
 * Withheld rows are never sent and then hidden client-side: that would leak the
 * paid content to anyone opening devtools.
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
      issueCount: true,
      pagesCrawled: true,
      createdAt: true,
      completedAt: true,
      issues: {
        orderBy: { rank: "asc" },
        select: {
          id: true,
          severity: true,
          category: true,
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
    /** Second half of the score split; the strip in the report head shows both. */
    contentHealth?: number;
    band?: "POOR" | "FAIR" | "GOOD";
    counts?: { critical: number; warning: number; notice: number };
    healthy?: string[];
    categories?: Record<"TECHNICAL" | "ON_PAGE" | "CONTENT" | "SPEED", number>;
    crawl?: {
      pagesCrawled?: number;
      pagesDiscovered?: number;
      finalUrl?: string;
      title?: string | null;
      metaDescription?: string | null;
      avgResponseTimeMs?: number;
      isHttps?: boolean;
      hasRobotsTxt?: boolean;
      hasSitemap?: boolean;
      blocksIndexing?: boolean;
      homepageWordCount?: number;
      hasStructuredData?: boolean;
      hasOpenGraph?: boolean;
    };
  };

  const isOwner = Boolean(viewerId && audit.userId === viewerId);

  const allCompetitors = raw.competitors ?? [];
  const allKeywords = raw.keywords ?? [];

  // Owners see everything; anonymous viewers get the free slice.
  const issues = isOwner ? audit.issues : audit.issues.slice(0, FREE_ISSUE_LIMIT);
  const competitors = isOwner
    ? allCompetitors
    : allCompetitors.slice(0, FREE_COMPETITOR_LIMIT);
  const opportunities = isOwner
    ? audit.opportunities
    : audit.opportunities.slice(0, FREE_OPPORTUNITY_LIMIT);
  const keywordGaps = isOwner ? allKeywords : allKeywords.slice(0, FREE_KEYWORD_LIMIT);

  return {
    id: audit.id,
    publicId: audit.publicId,
    domain: audit.domain,
    status: audit.status,
    score: audit.score,
    technicalHealth: audit.technicalHealth,
    contentHealth: raw.contentHealth ?? null,
    band: raw.band ?? null,
    summary: audit.summary,

    pagesCrawled: audit.pagesCrawled || raw.crawl?.pagesCrawled || 0,
    pagesDiscovered: raw.crawl?.pagesDiscovered ?? 0,

    /**
     * What the crawler actually found, as facts rather than as issues.
     *
     * These were being computed, used to derive issues, then discarded. A
     * reader can't tell "we checked and you have a sitemap" from "we didn't
     * check" when the only evidence is the absence of a finding — and the
     * response time is the one hard number behind the Speed category, which
     * otherwise shows a score with nothing underneath it.
     *
     * Null on audits run before this was stored, so the UI can omit the strip
     * rather than render a row of confident falses.
     */
    crawl: raw.crawl
      ? {
          finalUrl: raw.crawl.finalUrl ?? null,
          title: raw.crawl.title ?? null,
          metaDescription: raw.crawl.metaDescription ?? null,
          avgResponseTimeMs: raw.crawl.avgResponseTimeMs ?? null,
          isHttps: raw.crawl.isHttps ?? null,
          hasRobotsTxt: raw.crawl.hasRobotsTxt ?? null,
          hasSitemap: raw.crawl.hasSitemap ?? null,
          blocksIndexing: raw.crawl.blocksIndexing ?? null,
          homepageWordCount: raw.crawl.homepageWordCount ?? null,
          hasStructuredData: raw.crawl.hasStructuredData ?? null,
          hasOpenGraph: raw.crawl.hasOpenGraph ?? null,
        }
      : null,
    counts: raw.counts ?? { critical: 0, warning: 0, notice: 0 },
    healthy: raw.healthy ?? [],
    /** Null for audits run before category scoring existed. */
    categories: raw.categories ?? null,

    issues,
    competitors: competitors.map((competitor) => ({
      id: competitor.domain,
      domain: competitor.domain,
      name: competitor.name,
      notes: null,
      bestPage: competitor.bestPage
        ? { ...competitor.bestPage, whyItMatters: null }
        : null,
    })),
    opportunities,
    keywordGaps,
    keywordHeadline: raw.keywordHeadline ?? null,

    /**
     * What's held back. The report states these honestly rather than hiding
     * that more exists — "38 more findings" is the actual sales argument.
     */
    locked: {
      isLocked: !isOwner,
      issues: Math.max(0, audit.issueCount - issues.length),
      opportunities: Math.max(0, audit.opportunities.length - opportunities.length),
      keywords: Math.max(0, allKeywords.length - keywordGaps.length),
    },

    isOwner,
    createdAt: audit.createdAt.toISOString(),
    completedAt: audit.completedAt?.toISOString() ?? null,
  };
}

export const captureLeadSchema = z.object({ email: emailSchema });

/**
 * The soft email gate. Idempotent, and never blocks report access — the user
 * is always free to skip.
 *
 * One endpoint serves two moments, which is why it has to handle both:
 *
 *   - **During the crawl.** The card on the progress screen says "leave an
 *     email and you can close the tab". The address is recorded as
 *     `notifyEmail` and the pipeline mails the link the moment the run
 *     finishes (`notifyIfRequested`).
 *   - **After the crawl.** The gate before the report. The audit is already
 *     COMPLETED, so there's no later moment to hook into — the mail goes out
 *     here, immediately.
 *
 * Both wrote `leadEmail` and stopped, which meant the app collected addresses
 * and promised a link it never sent. `notifyEmail` was only ever populated by
 * the signed-in onboarding path, so the entire anonymous funnel — the one the
 * marketing page drives every visitor into — silently dropped its email.
 *
 * `leadEmail` is still written in both cases: it's the marketing capture, and
 * distinct from `notifyEmail`, which is a one-off delivery that gets cleared
 * once sent.
 */
export async function captureAuditLead(
  publicId: string,
  input: { email: string },
): Promise<void> {
  const { email } = captureLeadSchema.parse(input);

  const audit = await prisma.audit.findUnique({
    where: { publicId },
    select: {
      id: true,
      publicId: true,
      domain: true,
      status: true,
      score: true,
      summary: true,
      notifiedAt: true,
    },
  });

  if (!audit) throw AppError.notFound("We couldn't find that audit.");

  await prisma.audit.update({
    where: { id: audit.id },
    data: {
      leadEmail: email,
      // Only meaningful while the run is still going; harmless afterwards, and
      // it means a retried job can still deliver if the send below fails.
      ...(audit.status === "COMPLETED" ? {} : { notifyEmail: email }),
    },
  });

  // Still running: the pipeline owns delivery from here.
  if (audit.status !== "COMPLETED") return;

  // Already mailed — a second submit at the gate shouldn't send a duplicate.
  if (audit.notifiedAt) return;

  // Claim the send before performing it, conditioned on `notifiedAt` still
  // being null. Two tabs submitting the same address at the same moment is
  // otherwise two identical emails.
  const claimed = await prisma.audit.updateMany({
    where: { id: audit.id, notifiedAt: null },
    data: { notifiedAt: new Date() },
  });

  if (claimed.count === 0) return;

  const appUrl = env.APP_URL.replace(/\/$/, "");

  try {
    await sendAuditReadyEmail({
      to: email,
      url: `${appUrl}/audit/${audit.publicId}`,
      domain: audit.domain,
      score: audit.score ?? 0,
      headline: audit.summary ?? "Your audit is ready.",
    });
  } catch (error) {
    // Never surface a mail failure here. The report is already on screen; the
    // user gave an address as a convenience, and failing this request would
    // make it look like the gate rejected them. Release the claim so a retry
    // can still send.
    await prisma.audit
      .updateMany({ where: { id: audit.id }, data: { notifiedAt: null } })
      .catch(() => {});

    console.error(`[audit] could not email the report for ${audit.publicId}`, error);
  }
}
