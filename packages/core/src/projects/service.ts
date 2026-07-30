import prisma from "@theseosaas/db";

import { getEntitlements } from "../billing/quota.ts";
import { AppError } from "../errors.ts";

/**
 * Sites (a.k.a. projects) and the dashboard built from one.
 *
 * "Site" is the user-facing word — matches onboarding's copy ("Which site are
 * we working on?"). `Project` stays the model name; renaming it is a bigger
 * migration than the naming deserves.
 *
 * The dashboard design assumes months of history: a score sparkline, a 6-month
 * average-position line, an AI narrative comparing this month to last. None of
 * that exists for a brand-new site, and won't for months even for an old one,
 * because a full re-audit (crawl + 3 AI calls) is too expensive to run
 * automatically every day. What *is* cheap enough to run daily is a rank check
 * per tracked keyword (see ../tracking/refresh.ts) — so average position
 * genuinely accumulates from day one, while the score trend only grows when
 * the user re-runs a full audit. Every field below is real or explicitly
 * marked as not-enough-data-yet; nothing is fabricated to fill the design.
 */

// --- Switcher ----------------------------------------------------------------

export interface SiteSummary {
  id: string;
  domain: string;
  name: string;
  /** Null until the site has a completed audit. */
  score: number | null;
  /** Sidebar badges. Tracked keywords and competitors, per the design. */
  keywordCount: number;
  competitorCount: number;
  createdAt: string;
}

export async function listSites(userId: string): Promise<SiteSummary[]> {
  const projects = await prisma.project.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      domain: true,
      name: true,
      createdAt: true,
      audits: {
        where: { status: "COMPLETED" },
        orderBy: { completedAt: "desc" },
        take: 1,
        select: { score: true },
      },
      // Counted rather than loaded — the sidebar only shows the totals.
      _count: {
        select: {
          keywords: { where: { isTracked: true } },
          competitors: true,
        },
      },
    },
  });

  return projects.map((project) => ({
    id: project.id,
    domain: project.domain,
    name: project.name,
    score: project.audits[0]?.score ?? null,
    keywordCount: project._count.keywords,
    competitorCount: project._count.competitors,
    createdAt: project.createdAt.toISOString(),
  }));
}

export interface AddSiteQuota {
  used: number;
  limit: number;
  canAdd: boolean;
}

/** Non-throwing — the switcher needs to show "3 of 3 used" either way. */
export async function getAddSiteQuota(userId: string): Promise<AddSiteQuota> {
  const entitlements = await getEntitlements(userId);
  const limit = entitlements?.limits.projects ?? 0;
  const used = await prisma.project.count({ where: { userId } });

  return { used, limit, canAdd: Boolean(entitlements) && used < limit };
}

// --- Dashboard ---------------------------------------------------------------

interface RawCompetitor {
  domain: string;
  name: string | null;
  appearances: number;
  bestPosition: number;
}

interface RawAuditData {
  competitors?: RawCompetitor[];
  band?: "POOR" | "FAIR" | "GOOD";
  counts?: { critical: number; warning: number; notice: number };
}

export interface ScoreHistoryPoint {
  date: string;
  score: number;
}

export interface CompetitorStanding {
  domain: string;
  name: string | null;
  notes: string | null;
  /** How many of the project's seed queries this domain ranked for, last audit. */
  sharedTerms: number;
  bestPosition: number | null;
}

export interface AveragePositionPoint {
  date: string;
  averagePosition: number;
}

export interface NextAction {
  opportunityId: string;
  title: string;
  rationale: string;
  keywords: string[];
  /** Always links into the existing audit report — nowhere else generates content yet. */
  reportUrl: string | null;
}

/**
 * The rows the design stacks under the "do this next" card. Same shape as
 * NextAction minus the report link, which the card above already carries.
 */
export interface QueuedAction {
  opportunityId: string;
  title: string;
  rationale: string;
  keywords: string[];
}

export interface SiteDashboard {
  project: { id: string; domain: string; name: string; createdAt: string };

  score: {
    current: number | null;
    technicalHealth: number | null;
    band: "POOR" | "FAIR" | "GOOD" | null;
    /** Consultant-voice text from the latest completed audit. */
    verdict: string | null;
    /** 2+ points once the user has re-run more than one audit; otherwise empty. */
    history: ScoreHistoryPoint[];
  };

  figures: {
    openIssues: { critical: number; warning: number; notice: number };
    /**
     * Change in total open issues against the previous completed audit.
     * Negative is an improvement. Null until a second audit exists.
     */
    openIssuesChange: number | null;
    /** Oldest-first issue totals per completed audit. Empty below 2 points. */
    openIssuesHistory: number[];
    opportunityCount: number;
    averagePosition: number | null;
    /** Change against the previous check-day. Negative is an improvement. */
    averagePositionChange: number | null;
  };

  competitors: CompetitorStanding[];

  /** Null until there are 2+ distinct check-days of ranking data. */
  averagePositionTrend: AveragePositionPoint[] | null;

  nextAction: NextAction | null;

  /** Up to three more suggestions, ranked below `nextAction`. */
  queuedActions: QueuedAction[];

  /** The design's "content in flight" table. Newest first. */
  contentInFlight: {
    id: string;
    title: string;
    /** The term it targets — the design's middle column. */
    target: string | null;
    status: "DRAFT" | "GENERATING" | "GENERATED" | "PUBLISHED" | "ARCHIVED" | "FAILED";
  }[];

  quota: {
    competitors: { used: number; limit: number };
    keywords: { used: number; limit: number };
  };

  hasCompletedAudit: boolean;
}

async function assertOwnedProject(userId: string, projectId: string) {
  const project = await prisma.project.findFirst({
    where: { id: projectId, userId },
    select: { id: true, domain: true, name: true, createdAt: true },
  });
  if (!project) throw AppError.notFound("We couldn't find that site.");
  return project;
}

export async function getSiteDashboard(userId: string, projectId: string): Promise<SiteDashboard> {
  const project = await assertOwnedProject(userId, projectId);

  const [entitlements, competitorRows, trackedKeywordCount, audits, publicIdRow] =
    await Promise.all([
      getEntitlements(userId),
      prisma.competitor.findMany({
        where: { projectId },
        select: { domain: true, name: true, notes: true },
      }),
      prisma.keyword.count({ where: { projectId, isTracked: true } }),
      prisma.audit.findMany({
        where: { projectId, status: "COMPLETED" },
        orderBy: { completedAt: "desc" },
        take: 12,
        select: {
          score: true,
          technicalHealth: true,
          summary: true,
          rawData: true,
          completedAt: true,
        },
      }),
      prisma.audit.findFirst({
        where: { projectId, status: "COMPLETED" },
        orderBy: { completedAt: "desc" },
        select: { publicId: true },
      }),
    ]);

  const latest = audits[0] ?? null;
  const raw = (latest?.rawData ?? {}) as RawAuditData;

  const competitorPositions = new Map(
    (raw.competitors ?? []).map((c) => [c.domain, c] as const),
  );

  const competitors: CompetitorStanding[] = competitorRows.map((competitor) => {
    const match = competitorPositions.get(competitor.domain);
    return {
      domain: competitor.domain,
      name: competitor.name,
      notes: competitor.notes,
      sharedTerms: match?.appearances ?? 0,
      bestPosition: match?.bestPosition ?? null,
    };
  });

  // Oldest-first for a left-to-right chart.
  const scoreHistory: ScoreHistoryPoint[] = audits
    .filter((a) => a.score !== null && a.completedAt)
    .map((a) => ({ date: a.completedAt!.toISOString(), score: a.score! }))
    .reverse();

  // Four, not one: the design's "do this next" block is a headline card plus
  // a short queue beneath it. Taking them in a single query keeps the ranking
  // consistent between the two.
  const rankedOpportunities = await prisma.opportunity.findMany({
    where: { projectId, status: "SUGGESTED" },
    orderBy: { rank: "asc" },
    take: 4,
    select: { id: true, title: true, rationale: true, keywords: true },
  });

  const topOpportunity = rankedOpportunities[0] ?? null;

  const averagePositionTrend = await computeAveragePositionTrend(projectId);

  const latestAveragePosition =
    averagePositionTrend && averagePositionTrend.length > 0
      ? averagePositionTrend[averagePositionTrend.length - 1]!.averagePosition
      : null;

  const averagePositionChange =
    averagePositionTrend && averagePositionTrend.length >= 2
      ? Math.round(
          (averagePositionTrend[averagePositionTrend.length - 1]!.averagePosition -
            averagePositionTrend[averagePositionTrend.length - 2]!.averagePosition) *
            10,
        ) / 10
      : null;

  // Issue totals per audit, oldest-first, so the figures strip can draw the
  // design's small trend line. Audits without a counts block are skipped
  // rather than counted as zero, which would draw a false cliff.
  const issueTotals = audits
    .map((audit) => (audit.rawData ?? {}) as RawAuditData)
    .map((data) =>
      data.counts ? data.counts.critical + data.counts.warning + data.counts.notice : null,
    )
    .filter((total): total is number => total !== null)
    .reverse();

  const openIssuesChange =
    issueTotals.length >= 2
      ? issueTotals[issueTotals.length - 1]! - issueTotals[issueTotals.length - 2]!
      : null;

  const opportunityCount = await prisma.opportunity.count({
    where: { projectId, status: "SUGGESTED" },
  });

  const contentRows = await prisma.content.findMany({
    where: { projectId, type: "BLOG_POST" },
    orderBy: { createdAt: "desc" },
    take: 5,
    select: { id: true, title: true, keywords: true, status: true },
  });

  const limits = entitlements?.limits ?? null;

  return {
    project: {
      id: project.id,
      domain: project.domain,
      name: project.name,
      createdAt: project.createdAt.toISOString(),
    },
    score: {
      current: latest?.score ?? null,
      technicalHealth: latest?.technicalHealth ?? null,
      band: raw.band ?? null,
      verdict: latest?.summary ?? null,
      history: scoreHistory,
    },
    figures: {
      openIssues: raw.counts ?? { critical: 0, warning: 0, notice: 0 },
      openIssuesChange,
      openIssuesHistory: issueTotals.length >= 2 ? issueTotals : [],
      opportunityCount,
      averagePosition: latestAveragePosition,
      averagePositionChange,
    },
    competitors,
    averagePositionTrend,
    nextAction: topOpportunity
      ? {
          opportunityId: topOpportunity.id,
          title: topOpportunity.title,
          rationale: topOpportunity.rationale,
          keywords: topOpportunity.keywords,
          reportUrl: publicIdRow ? `/audit/${publicIdRow.publicId}` : null,
        }
      : null,
    contentInFlight: contentRows.map((row) => ({
      id: row.id,
      title: row.title,
      target: row.keywords[0] ?? null,
      status: row.status,
    })),
    queuedActions: rankedOpportunities.slice(1).map((opportunity) => ({
      opportunityId: opportunity.id,
      title: opportunity.title,
      rationale: opportunity.rationale,
      keywords: opportunity.keywords,
    })),
    quota: {
      competitors: { used: competitorRows.length, limit: limits?.competitorsPerProject ?? 0 },
      keywords: { used: trackedKeywordCount, limit: limits?.trackedKeywords ?? 0 },
    },
    hasCompletedAudit: Boolean(latest),
  };
}

/**
 * Daily average position across every tracked keyword, one point per day that
 * actually has data. Needs 2+ days before it's worth charting — a single point
 * is just today's snapshot, not a trend.
 */
async function computeAveragePositionTrend(
  projectId: string,
): Promise<AveragePositionPoint[] | null> {
  const rankings = await prisma.keywordRanking.findMany({
    where: { keyword: { projectId, isTracked: true }, position: { not: null } },
    orderBy: { checkedAt: "asc" },
    select: { position: true, checkedAt: true },
    take: 2000,
  });

  if (rankings.length === 0) return null;

  const byDay = new Map<string, number[]>();
  for (const ranking of rankings) {
    const day = ranking.checkedAt.toISOString().slice(0, 10);
    const bucket = byDay.get(day) ?? [];
    bucket.push(ranking.position!);
    byDay.set(day, bucket);
  }

  const points = [...byDay.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, positions]) => ({
      date,
      averagePosition:
        Math.round((positions.reduce((sum, p) => sum + p, 0) / positions.length) * 10) / 10,
    }));

  return points.length >= 2 ? points : null;
}
