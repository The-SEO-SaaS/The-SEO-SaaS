import type { PageCrawl, SiteCrawl } from "./crawl.ts";

/**
 * Technical SEO checks across the crawled pages.
 *
 * Deterministic rules, no model call — these are objective facts and paying
 * tokens to restate them would be waste. The model's job is interpretation.
 *
 * Findings are site-wide and carry the pages they affect, so the report can say
 * "14 pages" rather than "your site has an issue". Ranking is by impact, and
 * the free report shows only the top few: a founder who sees 40 findings fixes
 * none of them.
 */

export type IssueSeverity = "CRITICAL" | "WARNING" | "NOTICE";

export interface TechnicalIssue {
  code: string;
  severity: IssueSeverity;
  title: string;
  whyItMatters: string;
  howToFix: string | null;
  affectedUrls: string[];
  affectedCount: number;
  rank: number;
}

export interface TechnicalSummary {
  issues: TechnicalIssue[];
  counts: { critical: number; warning: number; notice: number };
  /** Things that are already right — the design shows these too. */
  healthy: string[];
}

const TITLE_MIN = 30;
const TITLE_MAX = 60;
const META_MIN = 70;
const META_MAX = 160;
const THIN_CONTENT_WORDS = 300;
const SLOW_RESPONSE_MS = 2500;

/** Cap stored URLs — a 50-page site could otherwise attach 50 links per issue. */
const MAX_STORED_URLS = 10;

interface IssueDraft {
  code: string;
  severity: IssueSeverity;
  title: (count: number) => string;
  whyItMatters: (count: number, crawl: SiteCrawl) => string;
  howToFix: string | null;
  rank: number;
  /** Pages failing this check. */
  test: (page: PageCrawl) => boolean;
}

/**
 * Per-page checks. Each runs across every crawled page and collapses into one
 * finding carrying its affected pages.
 */
const PAGE_CHECKS: IssueDraft[] = [
  {
    code: "MISSING_TITLE",
    severity: "CRITICAL",
    rank: 2,
    test: (page) => !page.title,
    title: (count) => `${count} ${count === 1 ? "page has" : "pages have"} no title tag`,
    whyItMatters: () =>
      "The title is the clickable headline in search results. Without one, Google invents something from the page content — usually badly — and click-through rate suffers.",
    howToFix: "Add a <title> describing what the page covers, in 50–60 characters.",
  },
  {
    code: "MISSING_META_DESCRIPTION",
    severity: "WARNING",
    rank: 10,
    test: (page) => !page.metaDescription,
    title: (count) => `${count} ${count === 1 ? "page has" : "pages have"} no meta description`,
    whyItMatters: () =>
      "This is your ad copy in search results. Without it Google scrapes an arbitrary sentence from the page, which rarely sells anything.",
    howToFix: `Write a ${META_MIN}–${META_MAX} character description stating the outcome the page delivers.`,
  },
  {
    code: "MISSING_H1",
    severity: "WARNING",
    rank: 11,
    test: (page) => page.h1s.length === 0,
    title: (count) => `${count} ${count === 1 ? "page has" : "pages have"} no H1 heading`,
    whyItMatters: () =>
      "The H1 is the strongest on-page signal of what a page is about. Without one, search engines are guessing at the primary topic.",
    howToFix: "Add a single H1 stating what the page covers.",
  },
  {
    code: "MULTIPLE_H1",
    severity: "NOTICE",
    rank: 26,
    test: (page) => page.h1s.length > 1,
    title: (count) => `${count} ${count === 1 ? "page has" : "pages have"} multiple H1 headings`,
    whyItMatters: () =>
      "Multiple H1s dilute the topic signal. One clear primary heading ranks better than several competing ones.",
    howToFix: "Keep one H1 per page and demote the rest to H2.",
  },
  {
    code: "SHORT_TITLE",
    severity: "WARNING",
    rank: 12,
    test: (page) => Boolean(page.title && page.title.length < TITLE_MIN),
    title: (count) => `${count} ${count === 1 ? "title is" : "titles are"} too short to be useful`,
    whyItMatters: () =>
      "You're leaving space unused in the one line buyers read before deciding whether to click. A fuller title can carry both what the page covers and who it's for.",
    howToFix: `Expand titles to ${TITLE_MIN}–${TITLE_MAX} characters.`,
  },
  {
    code: "LONG_TITLE",
    severity: "NOTICE",
    rank: 22,
    test: (page) => Boolean(page.title && page.title.length > TITLE_MAX),
    title: (count) => `${count} ${count === 1 ? "title" : "titles"} will be cut off in search`,
    whyItMatters: () =>
      "Google truncates around 60 characters, so the end of these titles never gets read. If the value proposition sits at the end, it's invisible.",
    howToFix: `Trim titles to under ${TITLE_MAX} characters.`,
  },
  {
    code: "MISSING_CANONICAL",
    severity: "NOTICE",
    rank: 28,
    test: (page) => !page.canonical,
    title: (count) => `${count} ${count === 1 ? "page has" : "pages have"} no canonical URL`,
    whyItMatters: () =>
      "Canonical tags stop duplicate versions of a page — with and without www, with tracking parameters — from splitting ranking signals between them.",
    howToFix: 'Add <link rel="canonical"> pointing at the preferred URL.',
  },
  {
    code: "THIN_CONTENT",
    severity: "WARNING",
    rank: 14,
    test: (page) => page.wordCount < THIN_CONTENT_WORDS,
    title: (count) => `${count} ${count === 1 ? "page is" : "pages are"} very light on content`,
    whyItMatters: () =>
      `With under ${THIN_CONTENT_WORDS} words there isn't much for Google to understand or rank, and buyers comparing options have little to read before deciding.`,
    howToFix: "Expand with the problems you solve, who it's for, and the outcomes customers get.",
  },
  {
    code: "NOINDEX",
    severity: "WARNING",
    rank: 8,
    test: (page) => page.isNoIndex,
    title: (count) => `${count} ${count === 1 ? "page is" : "pages are"} marked noindex`,
    whyItMatters: () =>
      "These pages are explicitly excluded from search. That's correct for admin or thank-you pages, and a costly mistake on anything you want found.",
    howToFix: "Remove the noindex directive from any page that should rank.",
  },
  {
    code: "IMAGES_MISSING_ALT",
    severity: "NOTICE",
    rank: 34,
    test: (page) => page.imageCount > 0 && page.imagesMissingAlt / page.imageCount > 0.5,
    title: (count) => `${count} ${count === 1 ? "page has" : "pages have"} images without alt text`,
    whyItMatters: () =>
      "Alt text is both an accessibility requirement and a ranking signal for image search.",
    howToFix: "Describe each meaningful image in its alt attribute.",
  },
  {
    code: "MISSING_OPEN_GRAPH",
    severity: "NOTICE",
    rank: 30,
    test: (page) => !page.hasOpenGraph,
    title: (count) => `${count} ${count === 1 ? "page has" : "pages have"} no social preview tags`,
    whyItMatters: () =>
      "Shared on X, LinkedIn or Slack these render as a bare URL with no image or headline. For a product that grows through founder sharing, that's a wasted impression every time.",
    howToFix: "Add og:title, og:description and og:image meta tags.",
  },
];

export function runTechnicalChecks(crawl: SiteCrawl): TechnicalSummary {
  const issues: TechnicalIssue[] = [];
  const homeUrl = [crawl.finalUrl];

  // --- Site-wide blocking issues ------------------------------------------
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
      affectedCount: 1,
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
      affectedUrls: homeUrl,
      affectedCount: crawl.crawledCount,
      rank: 1,
    });
  }

  if (!crawl.hasSitemap) {
    issues.push({
      code: "MISSING_SITEMAP",
      severity: "WARNING",
      title: "We couldn't find a sitemap",
      whyItMatters:
        "A sitemap tells Google which pages exist and when they changed. Without one, new pages you publish can take far longer to get indexed — which directly delays the payoff from any content you create.",
      howToFix: "Publish /sitemap.xml and reference it from robots.txt.",
      affectedUrls: homeUrl,
      affectedCount: 1,
      rank: 13,
    });
  }

  if (!crawl.homepage.hasViewport) {
    issues.push({
      code: "MISSING_VIEWPORT",
      severity: "WARNING",
      title: "No mobile viewport tag",
      whyItMatters:
        "Google indexes the mobile version of your site first. Without a viewport tag your pages render at desktop width on phones, which hurts both rankings and conversions.",
      howToFix: '<meta name="viewport" content="width=device-width, initial-scale=1">',
      affectedUrls: homeUrl,
      affectedCount: crawl.crawledCount,
      rank: 9,
    });
  }

  if (crawl.avgResponseTimeMs > SLOW_RESPONSE_MS) {
    issues.push({
      code: "SLOW_RESPONSE",
      severity: "WARNING",
      title: "Your pages are slow to respond",
      whyItMatters: `Pages averaged ${(crawl.avgResponseTimeMs / 1000).toFixed(1)}s to load. Page speed is a ranking factor, and every extra second measurably increases the share of visitors who leave before seeing anything.`,
      howToFix: "Check server response time, enable caching, and put a CDN in front of it.",
      affectedUrls: homeUrl,
      affectedCount: crawl.crawledCount,
      rank: 15,
    });
  }

  if (!crawl.homepage.hasStructuredData) {
    issues.push({
      code: "MISSING_STRUCTURED_DATA",
      severity: "NOTICE",
      title: "No structured data found",
      whyItMatters:
        "Schema markup is what makes rich results possible — pricing, ratings, FAQs shown directly in search. Without it your listing is plain text next to competitors' enhanced ones.",
      howToFix: "Add JSON-LD for Organization and SoftwareApplication.",
      affectedUrls: homeUrl,
      affectedCount: 1,
      rank: 32,
    });
  }

  /**
   * Pages whose text we couldn't see, because they render in the browser.
   *
   * Three checks read extracted text: MISSING_H1, THIN_CONTENT and
   * SHORT_TITLE-adjacent copy rules. On a client-rendered shell all three fire
   * on every page and produce findings that are simply false — the H1 exists,
   * the copy exists, we just never executed the JavaScript that puts them
   * there. Reporting those anyway is the worst kind of wrong: specific,
   * confident, and trivially disproved by the customer opening their own site.
   *
   * So those checks are skipped for these pages, and the rendering itself is
   * raised instead as a single finding below. That isn't a consolation prize:
   * content that only exists after JavaScript runs is a genuine and serious
   * ranking risk, and it's the actual problem worth telling them about.
   */
  const blindPages = crawl.pages.filter((page) => page.isClientRendered);
  const TEXT_DERIVED = new Set(["MISSING_H1", "THIN_CONTENT"]);

  if (blindPages.length > 0) {
    issues.push({
      code: "CLIENT_RENDERED_CONTENT",
      severity: blindPages.length === crawl.pages.length ? "CRITICAL" : "WARNING",
      title:
        blindPages.length === 1
          ? "Your page content only appears after JavaScript runs"
          : `${blindPages.length} pages only show their content after JavaScript runs`,
      whyItMatters:
        "We fetched these pages the way a crawler does and got an almost empty shell. Google does render JavaScript, but it does so on a second pass that can lag by days or weeks, and it drops pages that are slow or error out. Anything that matters for ranking, your headings and body copy, is invisible on the first pass.",
      howToFix:
        "Check it yourself: open the page, view source, and search for a sentence you can see on screen. If it isn't in the source, Google's first pass doesn't see it either. Server-render or pre-render the pages you want ranked. In Next.js that means a server component or static generation; most frameworks have an equivalent.",
      affectedUrls: blindPages.slice(0, MAX_STORED_URLS).map((page) => page.url),
      affectedCount: blindPages.length,
      rank: 6,
    });
  }

  // --- Per-page checks, collapsed into one finding each --------------------
  for (const check of PAGE_CHECKS) {
    const candidates = TEXT_DERIVED.has(check.code)
      ? crawl.pages.filter((page) => !page.isClientRendered)
      : crawl.pages;
    const failing = candidates.filter(check.test);
    if (failing.length === 0) continue;

    issues.push({
      code: check.code,
      severity: check.severity,
      title: check.title(failing.length),
      whyItMatters: check.whyItMatters(failing.length, crawl),
      howToFix: check.howToFix,
      affectedUrls: failing.slice(0, MAX_STORED_URLS).map((page) => page.url),
      affectedCount: failing.length,
      rank: check.rank,
    });
  }

  issues.sort((a, b) => a.rank - b.rank);

  // --- What's already right -----------------------------------------------
  // The design surfaces these alongside the problems. Reading only failures
  // makes a decent site feel broken.
  const healthy: string[] = [];
  if (crawl.isHttps) healthy.push("HTTPS is enabled across the site");
  if (crawl.hasSitemap) healthy.push("A sitemap is published and reachable");
  if (crawl.hasRobotsTxt && !crawl.blocksIndexing)
    healthy.push("robots.txt allows search engines to crawl");
  if (crawl.homepage.hasViewport) healthy.push("Pages are mobile-ready");
  if (crawl.homepage.hasOpenGraph) healthy.push("Social previews are configured");
  if (crawl.homepage.hasStructuredData) healthy.push("Structured data is present");
  if (crawl.pages.every((page) => page.title)) healthy.push("Every crawled page has a title");
  if (crawl.avgResponseTimeMs <= 1000) healthy.push("Pages respond quickly");

  return {
    issues,
    counts: {
      critical: issues.filter((issue) => issue.severity === "CRITICAL").length,
      warning: issues.filter((issue) => issue.severity === "WARNING").length,
      notice: issues.filter((issue) => issue.severity === "NOTICE").length,
    },
    healthy,
  };
}
