import prisma from "@theseosaas/db";

import { enqueue, JOB_TYPES } from "../queue/index.js";
import { search } from "../search/serpex.js";

/**
 * Keyword rank tracking.
 *
 * The schema already had `KeywordRanking` (position, url, checkedAt) waiting
 * for this — it's what turns the dashboard's average-position chart from a
 * mockup into something real. One Serpex search per tracked keyword, once a
 * day, is the cheapest way to keep it fed: no crawl, no AI call, just "where
 * do we rank for this term today."
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

async function checkOwnPosition(
  term: string,
  domain: string,
): Promise<{ position: number | null; url: string | null; creditsUsed: number }> {
  const response = await search({ q: term, limit: 50 });
  const target = domain.replace(/^www\./, "").toLowerCase();
  const match = response.results.find((result) => result.domain === target);

  return {
    position: match?.position ?? null,
    url: match?.url ?? null,
    creditsUsed: response.creditsUsed,
  };
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
    select: { id: true, term: true, project: { select: { domain: true } } },
    take: MAX_KEYWORDS_PER_SWEEP,
  });

  let creditsUsed = 0;

  for (const keyword of keywords) {
    try {
      const result = await checkOwnPosition(keyword.term, keyword.project.domain);
      creditsUsed += result.creditsUsed;

      await prisma.keywordRanking.create({
        data: { keywordId: keyword.id, position: result.position, url: result.url },
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
