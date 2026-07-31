import prisma from "@theseosaas/db";
import { z } from "zod";

import { rerunAudit } from "../audit/history.ts";
import { PLANS, type PlanId } from "../billing/plans.ts";
import { AppError } from "../errors.ts";
import { normalizeDomain } from "../util/domain.ts";

/**
 * Onboarding.
 *
 * The defining constraint: by the time a user reaches this flow we already ran
 * a real audit on their site. So no step asks a question we can answer
 * ourselves — every screen is a confirmation of something we found, not a blank
 * form. That's what makes four steps tolerable.
 *
 * Steps: site → competitors → keywords → plan. Brand voice is deferred to
 * v0.2.
 */

export const ONBOARDING_STEPS = ["site", "competitors", "keywords", "plan"] as const;
export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];

// --- State -----------------------------------------------------------------

export interface OnboardingState {
  isComplete: boolean;
  /** Where to resume. */
  currentStep: OnboardingStep;
  project: {
    id: string;
    domain: string;
    name: string;
    siteType: string | null;
    platform: string | null;
    pagesCrawled: number;
  } | null;
  competitors: {
    id: string;
    domain: string;
    name: string | null;
    notes: string | null;
    sharedTerms: number;
    selected: boolean;
  }[];
  keywords: {
    id: string;
    term: string;
    intent: string;
    rationale: string | null;
    selected: boolean;
  }[];
  plan: PlanId | null;
  limits: { competitors: number; keywords: number } | null;
  /**
   * Whether there's audit data behind the competitor and keyword suggestions.
   *
   * "none" and "running" both mean those lists are empty for a reason the
   * user should be told about, rather than looking like we found nothing on
   * their site. The steps stay skippable in both cases.
   */
  audit: { status: "none" | "running" | "completed"; publicId: string | null };
}

interface RawCompetitor {
  domain: string;
  name: string | null;
  appearances: number;
  bestPage: { url: string; title: string } | null;
}

interface RawKeyword {
  term: string;
  intent: "TRANSACTIONAL" | "COMMERCIAL" | "INFORMATIONAL" | "NAVIGATIONAL";
  rationale: string;
}

/**
 * Builds the flow's state from the claimed audit.
 *
 * Competitors and keywords live in the audit's rawData until the user confirms
 * them here — that's the point at which they become real, plan-limited rows.
 */
/**
 * `projectId` is what makes this function double as the "add another site"
 * wizard: pass one and it reviews that specific project's audit instead of
 * the account's first one. Since `resolveStep` already skips the plan screen
 * once a subscription exists, an existing subscriber calling this for a new
 * site naturally gets site → competitors → keywords with no plan/billing step
 * — nothing extra to special-case.
 */
export async function getOnboardingState(
  userId: string,
  projectId?: string,
): Promise<OnboardingState> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      onboardedAt: true,
      subscription: { select: { plan: true } },
      projects: {
        where: projectId ? { id: projectId } : undefined,
        orderBy: { createdAt: "asc" },
        take: 1,
        select: {
          id: true,
          domain: true,
          name: true,
          siteType: true,
          platform: true,
          competitors: {
            select: { id: true, domain: true, name: true, notes: true },
          },
          keywords: {
            select: { id: true, term: true, intent: true, rationale: true, isTracked: true },
            orderBy: { createdAt: "asc" },
          },
          audits: {
            where: { status: "COMPLETED" },
            orderBy: { completedAt: "desc" },
            take: 1,
            select: { rawData: true, pagesCrawled: true },
          },
        },
      },
    },
  });

  if (!user) throw AppError.unauthorized();

  // An explicit projectId that matched nothing is a wrong/foreign id, not a
  // fresh account — those are different situations and shouldn't look alike.
  if (projectId && user.projects.length === 0) {
    throw AppError.notFound("We couldn't find that site.");
  }

  const project = user.projects[0] ?? null;
  const plan = user.subscription?.plan ?? null;

  if (!project) {
    // No claimed audit — the user reached onboarding without one, typically
    // by signing up straight from the pricing table.
    return {
      isComplete: Boolean(user.onboardedAt),
      currentStep: "site",
      project: null,
      competitors: [],
      keywords: [],
      plan,
      limits: plan
        ? {
            competitors: PLANS[plan].limits.competitorsPerProject,
            keywords: PLANS[plan].limits.trackedKeywords,
          }
        : null,
      audit: { status: "none", publicId: null },
    };
  }

  // A crawl kicked off at the site step is still running, so it isn't in the
  // COMPLETED set above. Queried separately because Prisma can't select the
  // same relation twice under different filters.
  const inFlightAudit = project.audits[0]
    ? null
    : await prisma.audit.findFirst({
        where: { projectId: project.id, status: { in: ["QUEUED", "RUNNING"] } },
        orderBy: { createdAt: "desc" },
        select: { publicId: true },
      });

  const raw = (project.audits[0]?.rawData ?? {}) as {
    competitors?: RawCompetitor[];
    keywords?: RawKeyword[];
  };

  // Already-saved rows win over audit suggestions, so returning to a step
  // shows what the user chose rather than resetting to our defaults.
  const savedCompetitorDomains = new Set(project.competitors.map((c) => c.domain));

  const competitors = [
    ...project.competitors.map((competitor) => ({
      ...competitor,
      sharedTerms:
        raw.competitors?.find((c) => c.domain === competitor.domain)?.appearances ?? 0,
      selected: true,
    })),
    ...(raw.competitors ?? [])
      .filter((competitor) => !savedCompetitorDomains.has(competitor.domain))
      .map((competitor) => ({
        id: competitor.domain,
        domain: competitor.domain,
        name: competitor.name,
        notes: null,
        sharedTerms: competitor.appearances,
        // Pre-selected: they came from the audit, so the default is "yes".
        selected: true,
      })),
  ];

  const savedTerms = new Set(project.keywords.map((k) => k.term));

  const keywords = [
    ...project.keywords.map((keyword) => ({
      id: keyword.id,
      term: keyword.term,
      intent: keyword.intent,
      rationale: keyword.rationale,
      selected: keyword.isTracked,
    })),
    ...(raw.keywords ?? [])
      .filter((keyword) => !savedTerms.has(keyword.term))
      .map((keyword) => ({
        id: keyword.term,
        term: keyword.term,
        intent: keyword.intent,
        rationale: keyword.rationale,
        // Buying-intent terms are pre-ticked; informational ones aren't. The
        // spec's whole thesis is that high-intent traffic is what converts.
        selected: keyword.intent === "TRANSACTIONAL" || keyword.intent === "COMMERCIAL",
      })),
  ];

  return {
    isComplete: Boolean(user.onboardedAt),
    currentStep: resolveStep(project.siteType, project.competitors.length, plan),
    project: {
      id: project.id,
      domain: project.domain,
      name: project.name,
      siteType: project.siteType,
      platform: project.platform,
      pagesCrawled: project.audits[0]?.pagesCrawled ?? 0,
    },
    competitors,
    keywords,
    plan,
    limits: plan
      ? {
          competitors: PLANS[plan].limits.competitorsPerProject,
          keywords: PLANS[plan].limits.trackedKeywords,
        }
      : null,
    audit: project.audits[0]
      ? { status: "completed", publicId: null }
      : inFlightAudit
        ? { status: "running", publicId: inFlightAudit.publicId }
        : { status: "none", publicId: null },
  };
}

/** Furthest incomplete step, so a refresh resumes rather than restarts. */
function resolveStep(
  siteType: string | null,
  competitorCount: number,
  plan: PlanId | null,
): OnboardingStep {
  if (!siteType) return "site";
  if (competitorCount === 0) return "competitors";
  if (!plan) return "plan";
  return "keywords";
}

// --- Step 1: site ----------------------------------------------------------

export const siteStepSchema = z.object({
  domain: z.string().min(1, "Enter your site's domain."),
  name: z.string().trim().max(120).optional(),
  siteType: z.enum(["SAAS", "ECOMMERCE", "CONTENT", "LOCAL"]),
  platform: z.enum(["SHOPIFY", "WORDPRESS", "WEBFLOW", "NEXTJS", "OTHER"]).optional(),
});

export async function saveSiteStep(
  userId: string,
  input: z.infer<typeof siteStepSchema>,
): Promise<{ projectId: string; auditPublicId: string | null }> {
  const parsed = siteStepSchema.parse(input);
  const domain = normalizeDomain(parsed.domain);

  const project = await prisma.project.upsert({
    where: { userId_domain: { userId, domain } },
    create: {
      userId,
      domain,
      name: parsed.name || domain,
      siteType: parsed.siteType,
      platform: parsed.platform ?? null,
    },
    update: {
      name: parsed.name || domain,
      siteType: parsed.siteType,
      platform: parsed.platform ?? null,
    },
    select: { id: true },
  });

  /**
   * Start a crawl if this site has never had one.
   *
   * The flow was built assuming everyone arrives from the free audit, so the
   * competitors and keywords steps are confirmations of what we already
   * found. Someone who signs up straight from the pricing table has no audit,
   * so those screens had nothing to confirm — and keywords, which required at
   * least one selection, became a dead end with no way forward.
   *
   * Kicking the audit off here rather than at completion means the crawl runs
   * during the remaining steps instead of after them, so the data is usually
   * there by the time they reach the dashboard.
   */
  const existingAudit = await prisma.audit.findFirst({
    where: {
      projectId: project.id,
      status: { in: ["COMPLETED", "QUEUED", "RUNNING"] },
    },
    select: { publicId: true },
  });

  if (existingAudit) return { projectId: project.id, auditPublicId: null };

  // Never let a queue failure block setup — they can re-run from Audits.
  const started = await rerunAudit(userId, project.id).catch((error: unknown) => {
    console.error("[onboarding] couldn't start the first audit:", error);
    return null;
  });

  return { projectId: project.id, auditPublicId: started?.publicId ?? null };
}

// --- Step 2: competitors ---------------------------------------------------

export const competitorsStepSchema = z.object({
  projectId: z.string().min(1),
  domains: z.array(z.string().min(1)).max(50),
});

export async function saveCompetitorsStep(
  userId: string,
  input: z.infer<typeof competitorsStepSchema>,
): Promise<{ saved: number }> {
  const parsed = competitorsStepSchema.parse(input);
  const project = await assertOwnedProject(userId, parsed.projectId);

  const plan = await getPlan(userId);
  const limit = plan ? PLANS[plan].limits.competitorsPerProject : 3;

  const domains = [...new Set(parsed.domains.map((domain) => normalizeDomain(domain)))];

  if (domains.length > limit) {
    throw AppError.quotaExceeded(
      `Your plan tracks up to ${limit} competitors. Untick a few, or upgrade for more.`,
      { details: { limit, selected: domains.length } },
    );
  }

  // Replace rather than merge: this screen is the complete statement of who
  // the user wants tracked, so an unticked competitor must actually go away.
  await prisma.$transaction([
    prisma.competitor.deleteMany({
      where: { projectId: project.id, domain: { notIn: domains } },
    }),
    ...domains.map((domain) =>
      prisma.competitor.upsert({
        where: { projectId_domain: { projectId: project.id, domain } },
        create: { projectId: project.id, domain, name: domain },
        update: {},
      }),
    ),
  ]);

  return { saved: domains.length };
}

// --- Step 3: keywords ------------------------------------------------------

export const keywordsStepSchema = z.object({
  projectId: z.string().min(1),
  terms: z
    .array(
      z.object({
        term: z.string().trim().min(1).max(200),
        intent: z
          .enum(["TRANSACTIONAL", "COMMERCIAL", "INFORMATIONAL", "NAVIGATIONAL"])
          .optional(),
        rationale: z.string().max(500).optional(),
      }),
    )
    .max(2000),
});

export async function saveKeywordsStep(
  userId: string,
  input: z.infer<typeof keywordsStepSchema>,
): Promise<{ tracked: number }> {
  const parsed = keywordsStepSchema.parse(input);
  const project = await assertOwnedProject(userId, parsed.projectId);

  const plan = await getPlan(userId);
  const limit = plan ? PLANS[plan].limits.trackedKeywords : 100;

  // Case-insensitive dedupe — "SEO Audit" and "seo audit" are one keyword.
  const seen = new Map<string, (typeof parsed.terms)[number]>();
  for (const entry of parsed.terms) {
    seen.set(entry.term.toLowerCase(), entry);
  }
  const terms = [...seen.values()];

  if (terms.length > limit) {
    throw AppError.quotaExceeded(
      `Your plan tracks up to ${limit} keywords. Deselect some, or upgrade for more.`,
      { details: { limit, selected: terms.length } },
    );
  }

  await prisma.$transaction([
    // Untracked rather than deleted: ranking history is worth keeping if the
    // user re-adds a term later.
    prisma.keyword.updateMany({
      where: { projectId: project.id, term: { notIn: terms.map((t) => t.term) } },
      data: { isTracked: false },
    }),
    ...terms.map((entry) =>
      prisma.keyword.upsert({
        where: { projectId_term: { projectId: project.id, term: entry.term } },
        create: {
          projectId: project.id,
          term: entry.term,
          intent: entry.intent ?? "COMMERCIAL",
          rationale: entry.rationale ?? null,
          source: "AUDIT",
          isTracked: true,
        },
        update: { isTracked: true },
      }),
    ),
  ]);

  return { tracked: terms.length };
}

// --- Completion ------------------------------------------------------------

/**
 * How recent the carried-over free audit has to be for us to skip the first
 * tracked crawl. Signing up straight after running the free audit is the
 * common path, and re-crawling the same site minutes later costs real provider
 * spend to produce the same findings.
 */
const FIRST_CRAWL_STALE_MS = 1000 * 60 * 60 * 6;

export interface CompleteOnboardingResult {
  /**
   * The run the "you're set up" screen watches. `reused` means we're pointing
   * at the audit that carried over from the free funnel rather than paying for
   * a fresh one.
   */
  firstCrawl: { publicId: string; reused: boolean } | null;

  project: { id: string; domain: string } | null;

  plan: { id: PlanId; name: string; articlesPerMonth: number };

  /**
   * The design's "waiting for you" panel. Returned here rather than fetched
   * separately so the screen renders complete on its first paint — it appears
   * immediately after a payment redirect, which is the worst moment to show
   * three loading skeletons.
   */
  waiting: {
    criticalFindings: number;
    /** Suggested opportunities — the design calls these article briefs. */
    briefs: number;
    trackedKeywords: number;
  };
}

export async function completeOnboarding(userId: string): Promise<CompleteOnboardingResult> {
  const plan = await getPlan(userId);
  if (!plan) {
    throw AppError.paymentRequired("Choose a plan to finish setting up.");
  }

  await prisma.user.update({
    where: { id: userId },
    data: { onboardedAt: new Date() },
  });

  const definition = PLANS[plan];
  const planSummary = {
    id: plan,
    name: definition.name,
    articlesPerMonth: definition.limits.aiBlogPostsPerMonth,
  };

  const project = await prisma.project.findFirst({
    where: { userId },
    orderBy: { createdAt: "asc" },
    select: { id: true, domain: true },
  });

  // No project means the user reached the end without a claimed audit. Nothing
  // to crawl, and the done screen handles a null run.
  if (!project) {
    return {
      firstCrawl: null,
      project: null,
      plan: planSummary,
      waiting: { criticalFindings: 0, briefs: 0, trackedKeywords: 0 },
    };
  }

  const [latestCompleted, briefs, trackedKeywords] = await Promise.all([
    prisma.audit.findFirst({
      where: { projectId: project.id, status: "COMPLETED" },
      orderBy: { completedAt: "desc" },
      select: { rawData: true },
    }),
    prisma.opportunity.count({ where: { projectId: project.id, status: "SUGGESTED" } }),
    prisma.keyword.count({ where: { projectId: project.id, isTracked: true } }),
  ]);

  const counts = ((latestCompleted?.rawData ?? {}) as {
    counts?: { critical: number };
  }).counts;

  const waiting = {
    criticalFindings: counts?.critical ?? 0,
    briefs,
    trackedKeywords,
  };

  const inFlight = await prisma.audit.findFirst({
    where: { projectId: project.id, status: { in: ["QUEUED", "RUNNING"] } },
    orderBy: { createdAt: "desc" },
    select: { publicId: true },
  });

  if (inFlight) {
    return {
      firstCrawl: { publicId: inFlight.publicId, reused: true },
      project,
      plan: planSummary,
      waiting,
    };
  }

  const recent = await prisma.audit.findFirst({
    where: {
      projectId: project.id,
      status: "COMPLETED",
      completedAt: { gt: new Date(Date.now() - FIRST_CRAWL_STALE_MS) },
    },
    orderBy: { completedAt: "desc" },
    select: { publicId: true },
  });

  if (recent) {
    return {
      firstCrawl: { publicId: recent.publicId, reused: true },
      project,
      plan: planSummary,
      waiting,
    };
  }

  const started = await rerunAudit(userId, project.id);

  return {
    firstCrawl: { publicId: started.publicId, reused: false },
    project,
    plan: planSummary,
    waiting,
  };
}

/**
 * Opts the caller into a one-off "your crawl finished" email.
 *
 * Deliberately not an audit-wide preference: it's a single notification the
 * user asked for on the setup screen, and the worker clears it once sent.
 */
export async function notifyWhenAuditCompletes(
  userId: string,
  publicId: string,
): Promise<void> {
  const [audit, user] = await Promise.all([
    prisma.audit.findUnique({
      where: { publicId },
      select: { id: true, userId: true, status: true },
    }),
    prisma.user.findUnique({ where: { id: userId }, select: { email: true } }),
  ]);

  if (!audit || audit.userId !== userId) {
    throw AppError.notFound("We couldn't find that audit.");
  }
  if (!user) throw AppError.unauthorized();

  // Already finished — there's nothing left to wait for, and queueing a mail
  // for a past event would arrive as a confusing duplicate of the screen the
  // user is already looking at.
  if (audit.status === "COMPLETED" || audit.status === "FAILED") return;

  await prisma.audit.update({
    where: { id: audit.id },
    data: { notifyEmail: user.email },
  });
}

// --- Helpers ---------------------------------------------------------------

async function assertOwnedProject(userId: string, projectId: string) {
  const project = await prisma.project.findFirst({
    where: { id: projectId, userId },
    select: { id: true },
  });
  if (!project) throw AppError.notFound("We couldn't find that project.");
  return project;
}

async function getPlan(userId: string): Promise<PlanId | null> {
  const subscription = await prisma.subscription.findUnique({
    where: { userId },
    select: { plan: true },
  });
  return subscription?.plan ?? null;
}
