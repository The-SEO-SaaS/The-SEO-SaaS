import type { CrawlResult } from "./crawl.js";
import type { TechnicalIssue } from "./technical.js";

/**
 * Scoring.
 *
 * Deterministic on purpose. A model-generated score would drift between runs
 * on an unchanged site, which destroys the one thing a score is for: telling
 * you whether last month's work moved anything.
 *
 * Two sub-scores, because they map to different actions. Technical health is
 * "is anything broken" — fixable in an afternoon. Content is "is there enough
 * here to rank" — fixable only by publishing, which is what we sell.
 */

export interface ScoreBreakdown {
  overall: number;
  technicalHealth: number;
  contentHealth: number;
}

const SEVERITY_PENALTY = {
  CRITICAL: 22,
  WARNING: 8,
  NOTICE: 3,
} as const;

/** Weighted toward content: technical is table stakes, content is the moat. */
const TECHNICAL_WEIGHT = 0.45;
const CONTENT_WEIGHT = 0.55;

function clamp(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function scoreTechnical(issues: TechnicalIssue[]): number {
  const penalty = issues.reduce((total, issue) => total + SEVERITY_PENALTY[issue.severity], 0);
  return clamp(100 - penalty);
}

/**
 * Content health from crawl signals. Blunt by design — we only crawl the
 * homepage, so this measures whether the site reads like a real product with
 * depth behind it, not the quality of any individual article.
 */
function scoreContent(crawl: CrawlResult): number {
  let score = 40; // Baseline: a live homepage that we could read at all.

  // Depth.
  if (crawl.wordCount >= 1200) score += 20;
  else if (crawl.wordCount >= 600) score += 14;
  else if (crawl.wordCount >= 300) score += 7;

  // Internal linking implies pages beyond the homepage — real site structure.
  if (crawl.internalLinks.length >= 40) score += 16;
  else if (crawl.internalLinks.length >= 20) score += 11;
  else if (crawl.internalLinks.length >= 8) score += 6;

  // Heading structure implies the page is organised around topics.
  if (crawl.h2s.length >= 6) score += 10;
  else if (crawl.h2s.length >= 3) score += 6;

  // Basic on-page hygiene present.
  if (crawl.title && crawl.metaDescription) score += 8;
  if (crawl.h1s.length === 1) score += 6;

  return clamp(score);
}

export function calculateScore(
  crawl: CrawlResult,
  issues: TechnicalIssue[],
): ScoreBreakdown {
  const technicalHealth = scoreTechnical(issues);
  const contentHealth = scoreContent(crawl);

  // A site blocking indexing cannot rank, so the headline score must reflect
  // that regardless of how good everything else looks.
  const blocked = issues.some((issue) => issue.code === "ROBOTS_BLOCKS_ALL");

  const weighted =
    technicalHealth * TECHNICAL_WEIGHT + contentHealth * CONTENT_WEIGHT;

  return {
    overall: blocked ? Math.min(25, clamp(weighted)) : clamp(weighted),
    technicalHealth,
    contentHealth,
  };
}
