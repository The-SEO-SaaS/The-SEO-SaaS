import type { SearchResult } from "../search/index.ts";

/**
 * Difficulty and demand, derived from the SERP we already fetch.
 *
 * The daily rank sweep pulls the full top-50 for every tracked keyword to find
 * our own position. That same response describes who currently holds the term,
 * and *that* is a real signal about how hard it is to win — so both scores here
 * cost nothing extra.
 *
 * What this is NOT: search volume. A SERP response carries no demand figure,
 * and there is no honest transformation from "who ranks" into "how many people
 * search this per month". `demand` below is a three-way band describing how
 * commercially contested a term looks, not a traffic estimate, and it is
 * labelled that way everywhere it surfaces. If exact monthly numbers are ever
 * needed they have to come from Keyword Planner or a paid keyword API.
 *
 * Both scores are deterministic — same SERP in, same numbers out — so a
 * keyword's difficulty only moves when the results actually move.
 */

/** Domains whose presence means an ordinary page can still compete. */
const UGC_DOMAINS = [
  "reddit.com",
  "quora.com",
  "stackexchange.com",
  "stackoverflow.com",
  "medium.com",
  "substack.com",
  "linkedin.com",
  "facebook.com",
  "x.com",
  "twitter.com",
];

/** Domains that are effectively unbeatable for a general query. */
const GIANT_DOMAINS = [
  "wikipedia.org",
  "youtube.com",
  "amazon.com",
  "amazon.co.uk",
  "ebay.com",
  "etsy.com",
  "walmart.com",
  "apple.com",
  "google.com",
  "microsoft.com",
  "nytimes.com",
  "forbes.com",
  "shopify.com",
];

const TOP_WINDOW = 10;

export type DemandBand = "HIGH" | "MEDIUM" | "LOW";

export interface SerpSignals {
  /** 0–100, higher is harder. Our own estimate, not an industry metric. */
  difficulty: number;
  demand: DemandBand;
}

function host(value: string): string {
  return value.replace(/^www\./, "").toLowerCase();
}

function matchesAny(domain: string, list: string[]): boolean {
  return list.some((entry) => domain === entry || domain.endsWith(`.${entry}`));
}

function isHomepage(url: string): boolean {
  try {
    const path = new URL(url).pathname.replace(/\/+$/, "");
    return path === "";
  } catch {
    return false;
  }
}

/**
 * Scores one keyword from its search results.
 *
 * Returns null below four results — a thin SERP means the fetch was truncated
 * or the term is so obscure the sample says nothing, and a confident score off
 * two rows would be worse than no score.
 */
export function scoreSerp(term: string, results: SearchResult[]): SerpSignals | null {
  const top = results.filter((result) => Boolean(result.domain)).slice(0, TOP_WINDOW);
  if (top.length < 4) return null;

  const domains = top.map((result) => host(result.domain));
  const distinct = new Set(domains);

  const giants = domains.filter((domain) => matchesAny(domain, GIANT_DOMAINS)).length;
  const ugc = domains.filter((domain) => matchesAny(domain, UGC_DOMAINS)).length;
  const homepages = top.filter((result) => isHomepage(result.url)).length;

  const phrase = term.trim().toLowerCase();
  const exactTitles = top.filter((result) => result.title.toLowerCase().includes(phrase)).length;

  const words = phrase.split(/\s+/).filter(Boolean).length;

  // --- Difficulty ----------------------------------------------------------
  // Baseline sits mid-scale and each signal pushes from there, so no single
  // input can drive the score to an extreme on its own.
  let difficulty = 45;

  // Every result from a different domain means the term is fragmented — nobody
  // owns it, so there's room. One domain holding several slots means it does.
  const diversity = distinct.size / top.length;
  difficulty += (0.75 - diversity) * 40;

  // Giants in the top 10 are a hard ceiling for a new page.
  difficulty += giants * 6;

  // Forums and social ranking means Google is accepting non-authoritative
  // pages here, which is the clearest "this is winnable" tell there is.
  difficulty -= ugc * 7;

  // Homepages ranking means the term reads as a brand or category, not a
  // question an article can answer better.
  difficulty += (homepages / top.length) * 18;

  // Titles carrying the exact phrase mean the competition is deliberately
  // optimised for it rather than ranking by accident.
  difficulty += (exactTitles / top.length) * 14;

  // Long-tail phrases are structurally easier regardless of who ranks.
  if (words >= 5) difficulty -= 10;
  else if (words >= 4) difficulty -= 5;
  else if (words <= 2) difficulty += 6;

  // --- Demand --------------------------------------------------------------
  // How commercially contested the term looks. Deliberately a three-way band:
  // the underlying signals cannot support finer resolution than that, and a
  // number here would imply a precision we do not have.
  let demandScore = 0;

  if (words <= 2) demandScore += 2;
  else if (words === 3) demandScore += 1;
  else if (words >= 6) demandScore -= 1;

  if (giants > 0) demandScore += 1;
  if (giants >= 2) demandScore += 1;
  if (homepages / top.length > 0.3) demandScore += 1;
  if (distinct.size === top.length) demandScore += 1;
  if (ugc >= 3) demandScore -= 1;

  const demand: DemandBand = demandScore >= 4 ? "HIGH" : demandScore >= 2 ? "MEDIUM" : "LOW";

  return {
    difficulty: Math.max(1, Math.min(100, Math.round(difficulty))),
    demand,
  };
}
