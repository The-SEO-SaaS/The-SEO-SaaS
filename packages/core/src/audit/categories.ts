/**
 * Which of the design's four audit categories each check belongs to, and how
 * each category scores.
 *
 * The design groups findings under Technical / On-page / Content / Speed with
 * a score against each. Every one of those is computable from the crawl we
 * already run — no Lighthouse, no second provider:
 *
 *  - Technical: indexability, HTTPS, sitemap, canonicals, viewport.
 *  - On-page:   titles, meta descriptions, headings, structured data, social.
 *  - Content:   thin pages, and the depth signals the crawl already measures.
 *  - Speed:     average response time across the crawled pages.
 *
 * The honest limit, stated once here and repeated in the UI: Speed measures
 * *server response time*, which is what an HTTP crawl can see. It is not Core
 * Web Vitals — no LCP, no CLS, no interaction latency, because measuring those
 * needs a real browser rendering the page. A site can respond in 200ms and
 * still feel slow. Treat this as "the server isn't the bottleneck", not "the
 * page is fast".
 */

export type IssueCategory = "TECHNICAL" | "ON_PAGE" | "CONTENT" | "SPEED";

/** Check code → category. Anything unmapped falls back to TECHNICAL. */
const CATEGORY_BY_CODE: Record<string, IssueCategory> = {
  // Technical — can search engines reach and index this at all?
  ROBOTS_BLOCKS_ALL: "TECHNICAL",
  NO_HTTPS: "TECHNICAL",
  MISSING_SITEMAP: "TECHNICAL",
  MISSING_VIEWPORT: "TECHNICAL",
  MISSING_CANONICAL: "TECHNICAL",
  NOINDEX: "TECHNICAL",

  // On-page — is each page telling search engines what it is?
  MISSING_TITLE: "ON_PAGE",
  SHORT_TITLE: "ON_PAGE",
  LONG_TITLE: "ON_PAGE",
  MISSING_META_DESCRIPTION: "ON_PAGE",
  MISSING_H1: "ON_PAGE",
  MULTIPLE_H1: "ON_PAGE",
  MISSING_STRUCTURED_DATA: "ON_PAGE",
  MISSING_OPEN_GRAPH: "ON_PAGE",
  IMAGES_MISSING_ALT: "ON_PAGE",

  // Content — is there enough substance on the page to rank?
  THIN_CONTENT: "CONTENT",

  // Speed — how quickly does the server answer?
  SLOW_RESPONSE: "SPEED",
};

export function categoryFor(code: string): IssueCategory {
  return CATEGORY_BY_CODE[code] ?? "TECHNICAL";
}

export const CATEGORY_LABEL: Record<IssueCategory, string> = {
  TECHNICAL: "Technical",
  ON_PAGE: "On-page",
  CONTENT: "Content",
  SPEED: "Speed",
};

/** Design order, left to right. */
export const CATEGORY_ORDER: IssueCategory[] = ["TECHNICAL", "ON_PAGE", "CONTENT", "SPEED"];

const PENALTY = { CRITICAL: 22, WARNING: 9, NOTICE: 3 } as const;

/**
 * A 0–100 score per category, from full marks downward.
 *
 * Penalties scale with how much of the site is affected, so one bad page out
 * of fifty costs a fraction of what a sitewide failure does — otherwise a
 * single thin page would read the same as fifty of them.
 */
export function scoreCategories(
  issues: { code: string; severity: keyof typeof PENALTY; affectedCount: number }[],
  pagesCrawled: number,
  avgResponseTimeMs: number,
): Record<IssueCategory, number> {
  const scores: Record<IssueCategory, number> = {
    TECHNICAL: 100,
    ON_PAGE: 100,
    CONTENT: 100,
    SPEED: 100,
  };

  const pages = Math.max(1, pagesCrawled);

  for (const issue of issues) {
    const category = categoryFor(issue.code);
    // Sitewide problems (robots, HTTPS) report affectedCount 0 or 1 but affect
    // everything, so they take the full penalty.
    const share = issue.affectedCount > 1 ? Math.min(1, issue.affectedCount / pages) : 1;
    scores[category] -= PENALTY[issue.severity] * share;
  }

  // Speed is measured directly rather than inferred from findings: response
  // time is a continuous number, and one pass/fail check throws most of it
  // away. Full marks under 400ms, zero by 3s.
  const speedPenalty = Math.min(100, Math.max(0, (avgResponseTimeMs - 400) / 26));
  scores.SPEED = Math.min(scores.SPEED, 100 - speedPenalty);

  for (const key of CATEGORY_ORDER) {
    scores[key] = Math.max(0, Math.min(100, Math.round(scores[key])));
  }

  return scores;
}
