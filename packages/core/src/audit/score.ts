import type { SiteCrawl } from "./crawl.js";
import type { TechnicalIssue } from "./technical.js";

/**
 * Scoring.
 *
 * Deterministic on purpose. A model-generated score would drift between runs on
 * an unchanged site, which destroys the one thing a score is for: telling you
 * whether last month's work moved anything.
 *
 * Two sub-scores because they map to different actions. Technical health is "is
 * anything broken" — fixable in an afternoon. Content is "is there enough here
 * to rank" — fixable only by publishing, which is what we sell.
 */

export interface ScoreBreakdown {
  overall: number;
  technicalHealth: number;
  contentHealth: number;
  /** Matches the design's 0–49 / 50–74 / 75+ bands. */
  band: "POOR" | "FAIR" | "GOOD";
}

const SEVERITY_PENALTY = { CRITICAL: 20, WARNING: 7, NOTICE: 2 } as const;

const TECHNICAL_WEIGHT = 0.45;
const CONTENT_WEIGHT = 0.55;

function clamp(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

/**
 * Penalties scale with how much of the site an issue touches. One thin page out
 * of fifty is noise; forty of fifty is the finding that matters.
 */
function scoreTechnical(issues: TechnicalIssue[], pageCount: number): number {
  const penalty = issues.reduce((total, issue) => {
    const base = SEVERITY_PENALTY[issue.severity];
    const coverage = pageCount > 0 ? Math.min(1, issue.affectedCount / pageCount) : 1;
    // Floor at 35% so a real issue on a couple of pages still counts.
    return total + base * (0.35 + 0.65 * coverage);
  }, 0);

  return clamp(100 - penalty);
}

function scoreContent(crawl: SiteCrawl): number {
  let score = 30;

  const totalWords = crawl.pages.reduce((sum, page) => sum + page.wordCount, 0);
  const avgWords = totalWords / Math.max(1, crawl.pages.length);

  // Depth per page.
  if (avgWords >= 1000) score += 18;
  else if (avgWords >= 600) score += 13;
  else if (avgWords >= 300) score += 7;

  // Breadth. A site with real content surface has many indexable pages.
  if (crawl.discoveredUrlCount >= 100) score += 18;
  else if (crawl.discoveredUrlCount >= 30) score += 13;
  else if (crawl.discoveredUrlCount >= 10) score += 8;
  else if (crawl.discoveredUrlCount >= 4) score += 4;

  // Internal linking implies real structure rather than orphan pages.
  const avgLinks =
    crawl.pages.reduce((sum, page) => sum + page.internalLinks.length, 0) /
    Math.max(1, crawl.pages.length);
  if (avgLinks >= 25) score += 14;
  else if (avgLinks >= 12) score += 9;
  else if (avgLinks >= 5) score += 5;

  // On-page hygiene at site level.
  const withTitleAndMeta = crawl.pages.filter(
    (page) => page.title && page.metaDescription,
  ).length;
  const hygiene = withTitleAndMeta / Math.max(1, crawl.pages.length);
  score += Math.round(hygiene * 12);

  // Heading structure on the homepage.
  if (crawl.homepage.h2s.length >= 4) score += 8;
  else if (crawl.homepage.h2s.length >= 2) score += 4;

  return clamp(score);
}

function bandFor(score: number): ScoreBreakdown["band"] {
  if (score >= 75) return "GOOD";
  if (score >= 50) return "FAIR";
  return "POOR";
}

export function calculateScore(
  crawl: SiteCrawl,
  issues: TechnicalIssue[],
): ScoreBreakdown {
  const technicalHealth = scoreTechnical(issues, crawl.crawledCount);
  const contentHealth = scoreContent(crawl);

  const weighted = technicalHealth * TECHNICAL_WEIGHT + contentHealth * CONTENT_WEIGHT;

  // A site blocking indexing cannot rank, so the headline must reflect that
  // however good everything else looks.
  const blocked = issues.some((issue) => issue.code === "ROBOTS_BLOCKS_ALL");
  const overall = blocked ? Math.min(25, clamp(weighted)) : clamp(weighted);

  return { overall, technicalHealth, contentHealth, band: bandFor(overall) };
}
