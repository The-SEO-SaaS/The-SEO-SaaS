import prisma from "@theseosaas/db";
import { z } from "zod";

import { getEntitlements } from "../billing/quota.ts";
import { AppError } from "../errors.ts";
import { normalizeDomain } from "../util/domain.ts";

/**
 * Competitor management and head-to-head comparison.
 *
 * The comparison matrix is real data at zero extra cost: the daily rank sweep
 * already pulls the full SERP for every tracked keyword to find our own
 * position, so each rival's position is in that same response and gets written
 * to `CompetitorRanking`. See ../tracking/refresh.ts.
 *
 * The design's "what they shipped this month" change log is deliberately not
 * here — it needs recurring crawls of each rival's site, which is a separate
 * pipeline and a real per-rival cost. Deferred rather than faked.
 */

const TREND_WINDOW = 30;

export interface CompetitorStanding {
  id: string;
  domain: string;
  name: string | null;
  notes: string | null;

  /** Tracked keywords where this rival currently outranks us. */
  beatingUsOn: number;
  /** Tracked keywords where we currently outrank them. */
  losingToUsOn: number;
  /** Their best current position across our tracked terms. */
  bestPosition: number | null;
  /** Mean position over terms where they rank at all. Null if they rank nowhere. */
  averagePosition: number | null;
  /** Oldest-first daily averages for the card sparkline. */
  trend: number[];
  /** Their strongest content page, from the audit. */
  bestPage: { url: string; title: string; whyItMatters: string | null } | null;
  isPending: boolean;

  /**
   * 0–100 search visibility across *your* tracked terms.
   *
   * The design shows a rival "score" as though we had audited their whole
   * site. We don't crawl competitor sites, so this measures the one thing we
   * genuinely observe: how well they perform on the keywords you care about.
   * Coverage (how many of your terms they appear for) weighted by rank
   * quality. Null until the first sweep. Not a site-health score, and the UI
   * labels it as visibility rather than borrowing the design's wording.
   */
  visibilityScore: number | null;
}

/**
 * Position → value curve. Rank 1 is worth far more than rank 10, and past ~30
 * a listing is worth almost nothing, so this decays rather than scaling
 * linearly — a rival holding #1 and #40 should not read the same as two #20s.
 */
function positionValue(position: number): number {
  if (position <= 0) return 0;
  return 1 / (1 + Math.log2(position));
}

export interface MatrixRow {
  keywordId: string;
  term: string;
  /** Our position, null when not ranking. */
  own: number | null;
  /** Keyed by competitor id. */
  byCompetitor: Record<string, number | null>;
  /** Who currently holds the best position — competitor id, or "own". */
  leader: string | null;
}

export interface CompetitorsPayload {
  competitors: CompetitorStanding[];
  matrix: MatrixRow[];
  quota: { used: number; limit: number; canAdd: boolean };
  /** True when no rank check has run yet, so the matrix is empty for now. */
  isAwaitingFirstCheck: boolean;
}

async function assertOwnedProject(userId: string, projectId: string) {
  const project = await prisma.project.findFirst({
    where: { id: projectId, userId },
    select: { id: true, domain: true },
  });
  if (!project) throw AppError.notFound("We couldn't find that site.");
  return project;
}

/** Latest row per (competitor, keyword) pair, plus a per-day average series. */
function summarizeRankings(
  rankings: { position: number | null; checkedAt: Date; keywordId: string }[],
): {
  latestByKeyword: Map<string, number | null>;
  trend: number[];
} {
  const latestByKeyword = new Map<string, number | null>();
  const seenKeyword = new Set<string>();
  const byDay = new Map<string, number[]>();

  // Rankings arrive newest-first, so the first sighting of a keyword is latest.
  for (const ranking of rankings) {
    if (!seenKeyword.has(ranking.keywordId)) {
      seenKeyword.add(ranking.keywordId);
      latestByKeyword.set(ranking.keywordId, ranking.position);
    }

    if (ranking.position !== null) {
      const day = ranking.checkedAt.toISOString().slice(0, 10);
      const bucket = byDay.get(day) ?? [];
      bucket.push(ranking.position);
      byDay.set(day, bucket);
    }
  }

  const trend = [...byDay.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(
      ([, positions]) =>
        Math.round((positions.reduce((sum, p) => sum + p, 0) / positions.length) * 10) / 10,
    );

  return { latestByKeyword, trend };
}

interface RawCompetitor {
  domain: string;
  bestPage: { url: string; title: string } | null;
}

export async function listCompetitors(
  userId: string,
  projectId: string,
): Promise<CompetitorsPayload> {
  await assertOwnedProject(userId, projectId);

  const [entitlements, competitorRows, trackedKeywords, latestAudit] = await Promise.all([
    getEntitlements(userId),
    prisma.competitor.findMany({
      where: { projectId },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        domain: true,
        name: true,
        notes: true,
        pages: {
          take: 1,
          orderBy: { discoveredAt: "desc" },
          select: { url: true, title: true, whyItMatters: true },
        },
        rankings: {
          orderBy: { checkedAt: "desc" },
          take: TREND_WINDOW * 20,
          select: { position: true, checkedAt: true, keywordId: true },
        },
      },
    }),
    prisma.keyword.findMany({
      where: { projectId, isTracked: true },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        term: true,
        rankings: {
          orderBy: { checkedAt: "desc" },
          take: 1,
          select: { position: true },
        },
      },
    }),
    prisma.audit.findFirst({
      where: { projectId, status: "COMPLETED" },
      orderBy: { completedAt: "desc" },
      select: { rawData: true },
    }),
  ]);

  const raw = (latestAudit?.rawData ?? {}) as { competitors?: RawCompetitor[] };
  const rawByDomain = new Map(
    (raw.competitors ?? []).map((competitor) => [competitor.domain, competitor]),
  );

  const ownPositions = new Map(
    trackedKeywords.map((keyword) => [keyword.id, keyword.rankings[0]?.position ?? null]),
  );

  const summaries = new Map(
    competitorRows.map((competitor) => [competitor.id, summarizeRankings(competitor.rankings)]),
  );

  const competitors: CompetitorStanding[] = competitorRows.map((competitor) => {
    const summary = summaries.get(competitor.id)!;
    const positions = [...summary.latestByKeyword.values()].filter(
      (position): position is number => position !== null,
    );

    let beatingUsOn = 0;
    let losingToUsOn = 0;

    for (const [keywordId, theirPosition] of summary.latestByKeyword) {
      const ourPosition = ownPositions.get(keywordId) ?? null;
      if (theirPosition === null) {
        // They don't rank; we only "win" if we actually do.
        if (ourPosition !== null) losingToUsOn += 1;
        continue;
      }
      // A missing own-position means we're nowhere, so they're ahead.
      if (ourPosition === null || theirPosition < ourPosition) beatingUsOn += 1;
      else losingToUsOn += 1;
    }

    const fromAudit = rawByDomain.get(competitor.domain);
    const page = competitor.pages[0] ?? null;

    return {
      id: competitor.id,
      domain: competitor.domain,
      name: competitor.name,
      notes: competitor.notes,
      beatingUsOn,
      losingToUsOn,
      bestPosition: positions.length > 0 ? Math.min(...positions) : null,
      averagePosition:
        positions.length > 0
          ? Math.round((positions.reduce((sum, p) => sum + p, 0) / positions.length) * 10) / 10
          : null,
      trend: summary.trend,
      bestPage: page
        ? { url: page.url, title: page.title, whyItMatters: page.whyItMatters }
        : fromAudit?.bestPage
          ? { ...fromAudit.bestPage, whyItMatters: null }
          : null,
      isPending: competitor.rankings.length === 0,
      // Sum of per-position value over *every* tracked term, not just the ones
      // they rank for — a rival appearing on three of your fifty keywords
      // should score low, however well those three place.
      visibilityScore:
        competitor.rankings.length === 0 || trackedKeywords.length === 0
          ? null
          : Math.max(
              1,
              Math.min(
                100,
                Math.round(
                  (positions.reduce((sum, position) => sum + positionValue(position), 0) /
                    trackedKeywords.length) *
                    100,
                ),
              ),
            ),
    };
  });

  const matrix: MatrixRow[] = trackedKeywords.map((keyword) => {
    const own = keyword.rankings[0]?.position ?? null;

    const byCompetitor: Record<string, number | null> = {};
    for (const competitor of competitorRows) {
      byCompetitor[competitor.id] =
        summaries.get(competitor.id)!.latestByKeyword.get(keyword.id) ?? null;
    }

    // Best = lowest position number among everyone who ranks at all.
    let leader: string | null = null;
    let best = Number.POSITIVE_INFINITY;

    if (own !== null) {
      leader = "own";
      best = own;
    }
    for (const [competitorId, position] of Object.entries(byCompetitor)) {
      if (position !== null && position < best) {
        best = position;
        leader = competitorId;
      }
    }

    return { keywordId: keyword.id, term: keyword.term, own, byCompetitor, leader };
  });

  const limit = entitlements?.limits.competitorsPerProject ?? 0;

  return {
    competitors,
    matrix,
    quota: {
      used: competitorRows.length,
      limit,
      canAdd: competitorRows.length < limit,
    },
    isAwaitingFirstCheck:
      trackedKeywords.length > 0 && trackedKeywords.every((k) => k.rankings.length === 0),
  };
}

// --- Mutations ---------------------------------------------------------------

export const addCompetitorSchema = z.object({
  domain: z.string().trim().min(1, "Enter a competitor's domain."),
  name: z.string().trim().max(120).optional(),
});

export async function addCompetitor(
  userId: string,
  projectId: string,
  input: z.infer<typeof addCompetitorSchema>,
): Promise<{ id: string }> {
  const project = await assertOwnedProject(userId, projectId);
  const parsed = addCompetitorSchema.parse(input);
  const domain = normalizeDomain(parsed.domain);

  if (domain === project.domain) {
    throw AppError.badRequest("That's your own site — pick a competitor's domain.");
  }

  const entitlements = await getEntitlements(userId);
  if (!entitlements) throw AppError.paymentRequired("Choose a plan to track competitors.");

  const existing = await prisma.competitor.findUnique({
    where: { projectId_domain: { projectId, domain } },
    select: { id: true },
  });

  if (existing) {
    throw AppError.conflict("You're already tracking that competitor.");
  }

  const count = await prisma.competitor.count({ where: { projectId } });
  const limit = entitlements.limits.competitorsPerProject;

  if (count >= limit) {
    throw AppError.quotaExceeded(
      `Your plan tracks up to ${limit} competitors per site. Remove one first, or upgrade.`,
      { details: { limit, used: count } },
    );
  }

  const competitor = await prisma.competitor.create({
    data: { projectId, domain, name: parsed.name || domain },
    select: { id: true },
  });

  // No immediate rank check here, unlike keywords: their positions come from
  // the keyword searches, so this rival simply gets populated on the next
  // daily sweep rather than needing searches of its own.
  return competitor;
}

export async function removeCompetitor(
  userId: string,
  projectId: string,
  competitorId: string,
): Promise<void> {
  await assertOwnedProject(userId, projectId);

  const { count } = await prisma.competitor.deleteMany({
    where: { id: competitorId, projectId },
  });

  if (count === 0) throw AppError.notFound("We couldn't find that competitor.");
}
