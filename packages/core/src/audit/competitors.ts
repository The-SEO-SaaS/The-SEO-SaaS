import { mapWithConcurrency, settle } from "../util/async.js";
import { safeHostname } from "../util/domain.js";
import { search } from "../search/serpex.js";

/**
 * Competitor discovery and their best-performing content.
 *
 * Strategy: search the terms the user's own positioning implies, then see who
 * else keeps showing up. A domain that ranks for several of your core terms is
 * a competitor in the only sense that matters for SEO — they are taking
 * traffic you want.
 *
 * Cost discipline: the spec caps this at 3 competitors and 1 blog post each,
 * and every call is cached. Discovery is 2–3 searches; best-post lookup is one
 * search per competitor.
 */

const MAX_COMPETITORS = 3;

/** Domains that rank for everything and compete with nobody. */
const EXCLUDED_HOSTS = new Set([
  "wikipedia.org",
  "youtube.com",
  "linkedin.com",
  "facebook.com",
  "x.com",
  "twitter.com",
  "instagram.com",
  "reddit.com",
  "medium.com",
  "github.com",
  "quora.com",
  "producthunt.com",
  "g2.com",
  "capterra.com",
  "trustpilot.com",
  "getapp.com",
  "softwareadvice.com",
  "crunchbase.com",
  "glassdoor.com",
  "indeed.com",
  "amazon.com",
  "apple.com",
  "google.com",
  "microsoft.com",
]);

function isExcluded(host: string): boolean {
  if (EXCLUDED_HOSTS.has(host)) return true;
  // Also catch regional variants, e.g. amazon.co.uk, wikipedia.fr.
  return [...EXCLUDED_HOSTS].some((excluded) => {
    const root = excluded.split(".")[0]!;
    return host === root || host.startsWith(`${root}.`);
  });
}

export interface DiscoveredCompetitor {
  domain: string;
  name: string | null;
  /** How many of our seed queries this domain ranked for. */
  appearances: number;
  /** Best position achieved across those queries. */
  bestPosition: number;
  sampleTitle: string;
}

export async function discoverCompetitors(
  seedQueries: string[],
  ownDomain: string,
  signal?: AbortSignal,
): Promise<{ competitors: DiscoveredCompetitor[]; creditsUsed: number }> {
  const own = ownDomain.replace(/^www\./, "").toLowerCase();
  const tally = new Map<string, DiscoveredCompetitor>();
  let creditsUsed = 0;

  // Sequential rather than parallel: the cache makes repeat queries free, and
  // hammering the provider with concurrent requests risks rate limiting on a
  // path that must not fail.
  for (const query of seedQueries.slice(0, 3)) {
    const response = await settle(search({ q: query, limit: 20 }, { signal }));
    if (!response) continue;

    creditsUsed += response.creditsUsed;

    for (const result of response.results) {
      const host = result.domain;
      if (!host || host === own || isExcluded(host)) continue;

      const existing = tally.get(host);
      if (existing) {
        existing.appearances += 1;
        existing.bestPosition = Math.min(existing.bestPosition, result.position);
      } else {
        tally.set(host, {
          domain: host,
          name: null,
          appearances: 1,
          bestPosition: result.position,
          sampleTitle: result.title,
        });
      }
    }
  }

  // Rank by breadth first, then by best position: a domain ranking for three
  // of your terms is a truer competitor than one sitting at #1 for a single
  // tangential query.
  const competitors = [...tally.values()]
    .sort(
      (a, b) => b.appearances - a.appearances || a.bestPosition - b.bestPosition,
    )
    .slice(0, MAX_COMPETITORS);

  return { competitors, creditsUsed };
}

export interface CompetitorBestPage {
  domain: string;
  url: string;
  title: string;
}

/**
 * Finds each competitor's strongest blog post.
 *
 * The spec shows exactly one post per competitor and deliberately omits
 * traffic estimates — partly cost, partly honesty, since estimates from SERP
 * data alone are guesswork dressed up as data. Ranking position for a
 * content-shaped query is the real signal, and it's free.
 */
export async function findBestBlogPosts(
  competitors: DiscoveredCompetitor[],
  industryHint: string,
  signal?: AbortSignal,
): Promise<{ pages: CompetitorBestPage[]; creditsUsed: number }> {
  let creditsUsed = 0;

  const results = await mapWithConcurrency(competitors, 2, async (competitor) => {
    const response = await settle(
      search(
        {
          // site: restricted to blog-shaped paths — we want their content
          // marketing, not their pricing page.
          q: `site:${competitor.domain} (blog OR guide OR "how to") ${industryHint}`,
          limit: 10,
        },
        { signal },
      ),
    );

    if (!response) return null;
    creditsUsed += response.creditsUsed;

    const best = response.results.find(
      (result) =>
        result.url &&
        result.title &&
        // Filter out the blog index itself — we want a specific article.
        !/\/(blog|resources|articles)\/?$/i.test(result.url),
    );

    if (!best) return null;

    return { domain: competitor.domain, url: best.url, title: best.title };
  });

  return {
    pages: results.filter((page): page is CompetitorBestPage => page !== null),
    creditsUsed,
  };
}
