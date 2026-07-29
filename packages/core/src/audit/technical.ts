import type { CrawlResult } from "./crawl.js";

/**
 * Technical SEO checks.
 *
 * Rules are deterministic and derived from the crawl — no model call, because
 * these are objective facts and paying for tokens to restate them would be
 * waste. The model's job is interpretation, not detection.
 *
 * Every issue carries `whyItMatters` in business terms. The report shows only
 * the top few by rank, never the full list: a founder who sees 30 findings
 * fixes none of them.
 */

export type IssueSeverity = "CRITICAL" | "WARNING" | "NOTICE";

export interface TechnicalIssue {
  code: string;
  severity: IssueSeverity;
  title: string;
  whyItMatters: string;
  howToFix: string | null;
  affectedUrls: string[];
  /** Lower sorts first. Set by severity and business impact, not check order. */
  rank: number;
}

/** Recommended lengths — Google truncates roughly here in practice. */
const TITLE_MIN = 30;
const TITLE_MAX = 60;
const META_MIN = 70;
const META_MAX = 160;
const THIN_CONTENT_WORDS = 300;
const SLOW_RESPONSE_MS = 2500;

export function runTechnicalChecks(crawl: CrawlResult): TechnicalIssue[] {
  const issues: TechnicalIssue[] = [];
  const page = [crawl.finalUrl];

  // --- Blocking issues: the site can't rank at all ------------------------
  if (crawl.blocksIndexing) {
    issues.push({
      code: "ROBOTS_BLOCKS_ALL",
      severity: "CRITICAL",
      title: "Your robots.txt is blocking search engines from your whole site",
      whyItMatters:
        "Google can't index a single page while this is in place. Nothing else in this report matters until it's removed — you are invisible in search.",
      howToFix:
        "Remove the `Disallow: /` line from robots.txt, then request indexing in Google Search Console.",
      affectedUrls: [new URL("/robots.txt", crawl.finalUrl).toString()],
      rank: 0,
    });
  }

  if (!crawl.isHttps) {
    issues.push({
      code: "NO_HTTPS",
      severity: "CRITICAL",
      title: "Your site isn't served over HTTPS",
      whyItMatters:
        "Browsers mark HTTP sites as 'Not secure', and it's a confirmed ranking signal. For a SaaS asking people to sign up, it also kills trust at exactly the wrong moment.",
      howToFix: "Enable TLS at your host or CDN and redirect all HTTP traffic to HTTPS.",
      affectedUrls: page,
      rank: 1,
    });
  }

  // --- Title -------------------------------------------------------------
  if (!crawl.title) {
    issues.push({
      code: "MISSING_TITLE",
      severity: "CRITICAL",
      title: "Your homepage has no title tag",
      whyItMatters:
        "The title is the clickable headline in search results. Without one, Google invents something from your page content — usually badly — and your click-through rate suffers.",
      howToFix: "Add a <title> describing what you do and who it's for, in 50–60 characters.",
      affectedUrls: page,
      rank: 2,
    });
  } else if (crawl.title.length < TITLE_MIN) {
    issues.push({
      code: "SHORT_TITLE",
      severity: "WARNING",
      title: "Your homepage title is too short to be useful",
      whyItMatters:
        "You're leaving space unused in the one line buyers read before deciding whether to click. A longer title can carry both what you do and who it's for.",
      howToFix: `Expand to ${TITLE_MIN}–${TITLE_MAX} characters. Currently ${crawl.title.length}.`,
      affectedUrls: page,
      rank: 12,
    });
  } else if (crawl.title.length > TITLE_MAX) {
    issues.push({
      code: "LONG_TITLE",
      severity: "NOTICE",
      title: "Your homepage title will be cut off in search results",
      whyItMatters:
        "Google truncates around 60 characters, so the end of your title never gets read. If your value proposition is at the end, it's invisible.",
      howToFix: `Trim to under ${TITLE_MAX} characters. Currently ${crawl.title.length}.`,
      affectedUrls: page,
      rank: 22,
    });
  }

  // --- Meta description --------------------------------------------------
  if (!crawl.metaDescription) {
    issues.push({
      code: "MISSING_META_DESCRIPTION",
      severity: "WARNING",
      title: "Your homepage has no meta description",
      whyItMatters:
        "This is your ad copy in search results. Without it Google scrapes an arbitrary sentence from your page, which rarely sells anything.",
      howToFix: `Write a ${META_MIN}–${META_MAX} character description that states the outcome you deliver.`,
      affectedUrls: page,
      rank: 10,
    });
  } else if (crawl.metaDescription.length < META_MIN) {
    issues.push({
      code: "SHORT_META_DESCRIPTION",
      severity: "NOTICE",
      title: "Your meta description is shorter than it needs to be",
      whyItMatters:
        "You have roughly 160 characters of free advertising under every search listing and you're using a fraction of it.",
      howToFix: `Expand toward ${META_MAX} characters. Currently ${crawl.metaDescription.length}.`,
      affectedUrls: page,
      rank: 24,
    });
  }

  // --- Headings ----------------------------------------------------------
  if (crawl.h1s.length === 0) {
    issues.push({
      code: "MISSING_H1",
      severity: "WARNING",
      title: "Your homepage has no H1 heading",
      whyItMatters:
        "The H1 is the strongest on-page signal of what a page is about. Without one, search engines are guessing at your primary topic.",
      howToFix: "Add a single H1 stating what your product does.",
      affectedUrls: page,
      rank: 11,
    });
  } else if (crawl.h1s.length > 1) {
    issues.push({
      code: "MULTIPLE_H1",
      severity: "NOTICE",
      title: `Your homepage has ${crawl.h1s.length} H1 headings`,
      whyItMatters:
        "Multiple H1s dilute the topic signal. One clear primary heading ranks better than several competing ones.",
      howToFix: "Keep one H1 and demote the rest to H2.",
      affectedUrls: page,
      rank: 26,
    });
  }

  // --- Discoverability ---------------------------------------------------
  if (!crawl.hasSitemap) {
    issues.push({
      code: "MISSING_SITEMAP",
      severity: "WARNING",
      title: "We couldn't find a sitemap",
      whyItMatters:
        "A sitemap tells Google which pages exist and when they changed. Without one, new pages you publish can take far longer to get indexed — which directly delays the payoff from any content you create.",
      howToFix: "Publish /sitemap.xml and reference it from robots.txt.",
      affectedUrls: page,
      rank: 13,
    });
  }

  if (!crawl.canonical) {
    issues.push({
      code: "MISSING_CANONICAL",
      severity: "NOTICE",
      title: "Your homepage has no canonical URL",
      whyItMatters:
        "Canonical tags stop duplicate versions of a page (with and without www, with tracking parameters) from splitting your ranking signals.",
      howToFix: 'Add <link rel="canonical" href="..."> pointing at the preferred URL.',
      affectedUrls: page,
      rank: 28,
    });
  }

  // --- Content depth -----------------------------------------------------
  if (crawl.wordCount < THIN_CONTENT_WORDS) {
    issues.push({
      code: "THIN_CONTENT",
      severity: "WARNING",
      title: "Your homepage is very light on text",
      whyItMatters:
        "With roughly " +
        crawl.wordCount +
        " words there isn't much for Google to understand or rank. It also means buyers comparing options have little to read before deciding.",
      howToFix:
        "Expand the page with the problems you solve, who you're for, and the outcomes customers get.",
      affectedUrls: page,
      rank: 14,
    });
  }

  // --- Secondary signals -------------------------------------------------
  if (!crawl.hasOpenGraph) {
    issues.push({
      code: "MISSING_OPEN_GRAPH",
      severity: "NOTICE",
      title: "Your pages have no social preview tags",
      whyItMatters:
        "When someone shares your link on X, LinkedIn or Slack it renders as a bare URL with no image or headline. For a product that grows through founder sharing, that's a wasted impression every time.",
      howToFix: "Add og:title, og:description and og:image meta tags.",
      affectedUrls: page,
      rank: 30,
    });
  }

  if (!crawl.hasStructuredData) {
    issues.push({
      code: "MISSING_STRUCTURED_DATA",
      severity: "NOTICE",
      title: "No structured data found",
      whyItMatters:
        "Schema markup is what makes rich results possible — pricing, ratings, FAQs shown directly in search. Without it your listing is plain text next to competitors' enhanced ones.",
      howToFix: "Add JSON-LD for Organization and SoftwareApplication.",
      affectedUrls: page,
      rank: 32,
    });
  }

  if (crawl.imageCount > 0 && crawl.imagesMissingAlt / crawl.imageCount > 0.5) {
    issues.push({
      code: "IMAGES_MISSING_ALT",
      severity: "NOTICE",
      title: `${crawl.imagesMissingAlt} of ${crawl.imageCount} images have no alt text`,
      whyItMatters:
        "Alt text is both an accessibility requirement and a ranking signal for image search.",
      howToFix: "Describe each meaningful image in its alt attribute.",
      affectedUrls: page,
      rank: 34,
    });
  }

  if (crawl.responseTimeMs > SLOW_RESPONSE_MS) {
    issues.push({
      code: "SLOW_RESPONSE",
      severity: "WARNING",
      title: "Your homepage is slow to respond",
      whyItMatters: `It took ${(crawl.responseTimeMs / 1000).toFixed(1)}s to load. Page speed is a ranking factor, and every extra second measurably increases the share of visitors who leave before seeing anything.`,
      howToFix: "Check server response time, enable caching, and put a CDN in front of it.",
      affectedUrls: page,
      rank: 15,
    });
  }

  if (!crawl.hasViewport) {
    issues.push({
      code: "MISSING_VIEWPORT",
      severity: "WARNING",
      title: "No mobile viewport tag",
      whyItMatters:
        "Google indexes the mobile version of your site first. Without a viewport tag your pages render at desktop width on phones, which hurts both rankings and conversions.",
      howToFix: '<meta name="viewport" content="width=device-width, initial-scale=1">',
      affectedUrls: page,
      rank: 9,
    });
  }

  return issues.sort((a, b) => a.rank - b.rank);
}
