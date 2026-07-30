import prisma from "@theseosaas/db";

import { scoreSerp } from "../keywords/serp-signals.ts";
import { enqueue, JOB_TYPES } from "../queue/index.ts";
import { search } from "../search/serpex.ts";

/**
 * Keyword rank tracking.
 *
 * The schema already had `KeywordRanking` (position, url, checkedAt) waiting
 * for this — it's what turns the dashboard's average-position chart from a
 * mockup into something real. One Serpex search per tracked keyword, once a
 * day, is the cheapest way to keep it fed: no crawl, no AI call, just "where
 * do we rank for this term today."
 *
 * That single search also answers "where does every competitor rank for this
 * term", because the whole SERP comes back in one response. So competitor
 * standings cost nothing extra — see `recordPositions` below. That's the
 * reason the head-to-head matrix on the competitors page is real data rather
 * than a placeholder.
 *
 * Deliberately not folded into the audit pipeline. A full re-audit re-runs
 * competitor discovery and three AI calls — worth doing occasionally, not
 * worth doing daily for every project on every plan. Rank tracking is the one
 * piece of "recurring" that's cheap enough to actually run every day.
 */

const REFRESH_INTERVAL_MS = 1000 * 60 * 60 * 24;

/** Cost guard: a burst of newly-tracked keywords can't blow the sweep's budget.
 *  Anything left over is simply due again on the next tick. */
const MAX_KEYWORDS_PER_SWEEP = 500;

/** How deep we look. Past ~50 the position stops being commercially meaningful. */
const RESULT_WINDOW = 50;

function bareHost(domain: string): string {
  return domain.replace(/^www\./, "").toLowerCase();
}

/**
 * One search, then everything derivable from it: our position, and each
 * tracked competitor's position for the same term.
 */
async function recordPositions(keyword: {
  id: string;
  term: string;
  projectId: string;
  projectDomain: string;
}): Promise<number> {
  const response = await search({ q: keyword.term, limit: RESULT_WINDOW });

  const byDomain = new Map<string, { position: number; url: string }>();
  for (const result of response.results) {
    if (!result.domain) continue;
    // First occurrence wins — a domain ranking twice is best represented by
    // its better position, and results arrive in rank order.
    if (!byDomain.has(result.domain)) {
      byDomain.set(result.domain, { position: result.position, url: result.url });
    }
  }

  const own = byDomain.get(bareHost(keyword.projectDomain)) ?? null;

  const competitors = await prisma.competitor.findMany({
    where: { projectId: keyword.projectId },
    select: { id: true, domain: true },
  });

  // Free: this SERP is already paid for and in memory. Scoring it here is what
  // keeps difficulty current without a second provider or a second call.
  const signals = scoreSerp(keyword.term, response.results);

  await prisma.$transaction([
    ...(signals
      ? [
          prisma.keyword.update({
            where: { id: keyword.id },
            data: { difficulty: signals.difficulty, demand: signals.demand },
          }),
        ]
      : []),
    prisma.keywordRanking.create({
      data: {
        keywordId: keyword.id,
        position: own?.position ?? null,
        url: own?.url ?? null,
      },
    }),
    ...competitors.map((competitor) => {
      const hit = byDomain.get(bareHost(competitor.domain)) ?? null;
      return prisma.competitorRanking.create({
        data: {
          competitorId: competitor.id,
          keywordId: keyword.id,
          position: hit?.position ?? null,
          url: hit?.url ?? null,
        },
      });
    }),
  ]);

  return response.creditsUsed;
}

export interface KeywordRefreshResult {
  checked: number;
  creditsUsed: number;
}

/**
 * Runs one sweep and re-schedules itself.
 *
 * "Due" means every existing ranking row for the keyword is older than the
 * refresh window — vacuously true for a keyword with no rows yet, and true
 * again 24h after the last check, so this needs no separate "last checked"
 * column to stay correct.
 */
export async function runKeywordRefreshSweep(): Promise<KeywordRefreshResult> {
  const cutoff = new Date(Date.now() - REFRESH_INTERVAL_MS);

  const keywords = await prisma.keyword.findMany({
    where: {
      isTracked: true,
      rankings: { every: { checkedAt: { lt: cutoff } } },
    },
    select: {
      id: true,
      term: true,
      projectId: true,
      project: { select: { domain: true } },
    },
    take: MAX_KEYWORDS_PER_SWEEP,
  });

  let creditsUsed = 0;

  for (const keyword of keywords) {
    try {
      creditsUsed += await recordPositions({
        id: keyword.id,
        term: keyword.term,
        projectId: keyword.projectId,
        projectDomain: keyword.project.domain,
      });
    } catch (error) {
      // One bad keyword (rate limit, transient provider error) shouldn't stall
      // the rest of the sweep or the sweep's own perpetuation.
      console.error(`[keyword-refresh] failed for keyword ${keyword.id}:`, error);
    }
  }

  // Perpetuate regardless of how many keywords were due — an empty sweep
  // still needs tomorrow's sweep scheduled.
  await enqueue(JOB_TYPES.KEYWORD_REFRESH, {}, { delayMs: REFRESH_INTERVAL_MS, maxAttempts: 1 });

  return { checked: keywords.length, creditsUsed };
}

/**
 * Checks a handful of keywords immediately, outside the daily cadence.
 *
 * Used when a user adds keywords by hand: waiting up to a day for the first
 * data point would make the table look broken right after the one action
 * where they're paying closest attention. Costs one search per keyword, which
 * is the deliberate trade.
 */
export async function checkKeywordsNow(keywordIds: string[]): Promise<KeywordRefreshResult> {
  if (keywordIds.length === 0) return { checked: 0, creditsUsed: 0 };

  const keywords = await prisma.keyword.findMany({
    where: { id: { in: keywordIds } },
    select: {
      id: true,
      term: true,
      projectId: true,
      project: { select: { domain: true } },
    },
  });

  let creditsUsed = 0;

  for (const keyword of keywords) {
    try {
      creditsUsed += await recordPositions({
        id: keyword.id,
        term: keyword.term,
        projectId: keyword.projectId,
        projectDomain: keyword.project.domain,
      });
    } catch (error) {
      console.error(`[keyword-check] failed for keyword ${keyword.id}:`, error);
    }
  }

  return { checked: keywords.length, creditsUsed };
}

/**
 * Seeds the very first sweep. Safe to call on every worker boot — it only
 * enqueues when no sweep is already pending or running, so restarting the
 * worker in dev never spawns a second perpetual chain.
 */
export async function ensureKeywordRefreshScheduled(): Promise<void> {
  const existing = await prisma.job.findFirst({
    where: { type: JOB_TYPES.KEYWORD_REFRESH, status: { in: ["PENDING", "ACTIVE"] } },
    select: { id: true },
  });

  if (existing) return;

  await enqueue(JOB_TYPES.KEYWORD_REFRESH, {}, { maxAttempts: 1 });
}
