import { AppError } from "../errors.js";
import { mapWithConcurrency } from "../util/async.js";
import { safeHostname, toUrl } from "../util/domain.js";

/**
 * Site crawler.
 *
 * Capped multi-page rather than whole-site: we take up to MAX_PAGES, preferring
 * the sitemap and falling back to a breadth-first walk of internal links. That
 * is enough to produce honest per-page findings and real "pages affected"
 * counts, while keeping a free audit inside a couple of minutes and a few
 * cents. A genuine 400-page crawl would need politeness scheduling, dedupe
 * across redirects, and a cost model the free tier can't carry.
 *
 * Parsing is regex-based. It will mis-handle exotic markup, but we extract a
 * handful of well-defined tags and it keeps a DOM library out of the tree.
 * Nothing outside this file depends on the approach.
 */

export interface PageCrawl {
  url: string;
  statusCode: number;

  title: string | null;
  metaDescription: string | null;
  canonical: string | null;
  h1s: string[];
  h2s: string[];

  wordCount: number;
  imageCount: number;
  imagesMissingAlt: number;

  hasViewport: boolean;
  hasOpenGraph: boolean;
  hasStructuredData: boolean;
  /** noindex via meta robots — a page deliberately kept out of search. */
  isNoIndex: boolean;

  internalLinks: string[];
  responseTimeMs: number;
}

export interface SiteCrawl {
  domain: string;
  finalUrl: string;
  isHttps: boolean;

  /** Always present — the crawl fails outright if the homepage can't load. */
  homepage: PageCrawl;
  /** Includes the homepage. */
  pages: PageCrawl[];

  /** Positioning context for the model. Homepage text only. */
  homepageText: string;

  hasRobotsTxt: boolean;
  hasSitemap: boolean;
  blocksIndexing: boolean;

  /** URLs known to exist, which may exceed the number actually crawled. */
  discoveredUrlCount: number;
  crawledCount: number;
  avgResponseTimeMs: number;
}

const USER_AGENT =
  "Mozilla/5.0 (compatible; TheSEOSaaSBot/1.0; +https://theseosaas.com/bot)";

const MAX_PAGES = 50;
const CONCURRENCY = 5;
const MAX_HTML_BYTES = 1_500_000;
const PAGE_TIMEOUT_MS = 15_000;

/** Assets and endpoints that are never worth an audit request. */
const SKIP_PATTERN =
  /\.(png|jpe?g|gif|svg|webp|avif|ico|css|js|mjs|json|xml|pdf|zip|gz|mp4|webm|mp3|woff2?|ttf|eot)(\?|$)/i;

async function fetchText(
  url: string,
  timeoutMs = PAGE_TIMEOUT_MS,
): Promise<{ text: string; status: number; finalUrl: string; ms: number } | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const started = Date.now();

  try {
    const response = await fetch(url, {
      headers: { "user-agent": USER_AGENT, accept: "text/html,*/*" },
      redirect: "follow",
      signal: controller.signal,
    });

    const type = response.headers.get("content-type") ?? "";
    // Guard against a sitemap pointing at a PDF or image.
    if (!type.includes("html") && !type.includes("xml") && type !== "") {
      return null;
    }

    const buffer = await response.arrayBuffer();
    const sliced =
      buffer.byteLength > MAX_HTML_BYTES ? buffer.slice(0, MAX_HTML_BYTES) : buffer;

    return {
      text: new TextDecoder("utf-8", { fatal: false }).decode(sliced),
      status: response.status,
      finalUrl: response.url || url,
      ms: Date.now() - started,
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function extractText(html: string): string {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function matchAll(html: string, pattern: RegExp): string[] {
  return [...html.matchAll(pattern)]
    .map((match) => extractText(match[1] ?? ""))
    .filter(Boolean);
}

function metaContent(html: string, key: string): string | null {
  const patterns = [
    new RegExp(`<meta[^>]+(?:name|property)=["']${key}["'][^>]*content=["']([^"']*)["']`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]*(?:name|property)=["']${key}["']`, "i"),
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) return match[1].trim();
  }
  return null;
}

function parsePage(html: string, url: string, status: number, ms: number): PageCrawl {
  const host = safeHostname(url);
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const canonicalMatch = html.match(
    /<link[^>]+rel=["']canonical["'][^>]*href=["']([^"']+)["']/i,
  );

  const internalLinks: string[] = [];
  for (const match of html.matchAll(/<a\b[^>]*href=["']([^"']+)["']/gi)) {
    const href = match[1]!;
    if (href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) continue;
    try {
      const resolved = new URL(href, url);
      resolved.hash = "";
      if (safeHostname(resolved.toString()) === host && !SKIP_PATTERN.test(resolved.pathname)) {
        internalLinks.push(resolved.toString());
      }
    } catch {
      // Malformed href — skip it rather than fail the page.
    }
  }

  const images = [...html.matchAll(/<img\b[^>]*>/gi)].map((m) => m[0]);
  const text = extractText(html);
  const robotsMeta = metaContent(html, "robots") ?? "";

  return {
    url,
    statusCode: status,
    title: titleMatch?.[1] ? extractText(titleMatch[1]) : null,
    metaDescription: metaContent(html, "description"),
    canonical: canonicalMatch?.[1] ?? null,
    h1s: matchAll(html, /<h1\b[^>]*>([\s\S]*?)<\/h1>/gi),
    h2s: matchAll(html, /<h2\b[^>]*>([\s\S]*?)<\/h2>/gi).slice(0, 20),
    wordCount: text.split(/\s+/).filter(Boolean).length,
    imageCount: images.length,
    imagesMissingAlt: images.filter((tag) => !/\balt=["'][^"']+["']/i.test(tag)).length,
    hasViewport: /<meta[^>]+name=["']viewport["']/i.test(html),
    hasOpenGraph: /<meta[^>]+property=["']og:/i.test(html),
    hasStructuredData: /application\/ld\+json/i.test(html),
    isNoIndex: /noindex/i.test(robotsMeta),
    internalLinks: [...new Set(internalLinks)],
    responseTimeMs: ms,
  };
}

/** Pulls page URLs out of a sitemap, following one level of sitemap index. */
async function readSitemap(baseUrl: string, robotsBody: string): Promise<string[]> {
  const candidates = new Set<string>();

  for (const match of robotsBody.matchAll(/^\s*Sitemap:\s*(\S+)/gim)) {
    candidates.add(match[1]!);
  }
  candidates.add(new URL("/sitemap.xml", baseUrl).toString());
  candidates.add(new URL("/sitemap_index.xml", baseUrl).toString());

  const urls: string[] = [];

  for (const candidate of candidates) {
    const response = await fetchText(candidate, 10_000);
    if (!response || response.status !== 200) continue;

    const locs = [...response.text.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)].map((m) => m[1]!);

    if (/<sitemapindex/i.test(response.text)) {
      // Sitemap index — read the first few child sitemaps only. Large sites
      // ship dozens, and we cap total pages anyway.
      for (const child of locs.slice(0, 3)) {
        const childResponse = await fetchText(child, 10_000);
        if (!childResponse || childResponse.status !== 200) continue;
        urls.push(
          ...[...childResponse.text.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)].map((m) => m[1]!),
        );
      }
    } else {
      urls.push(...locs);
    }

    if (urls.length > 0) break;
  }

  return urls;
}

export async function crawlSite(
  domain: string,
  options: { maxPages?: number; signal?: AbortSignal } = {},
): Promise<SiteCrawl> {
  const maxPages = Math.min(options.maxPages ?? MAX_PAGES, MAX_PAGES);
  const entryUrl = toUrl(domain);

  const home = await fetchText(entryUrl);
  if (!home) {
    throw AppError.badRequest(
      "We couldn't reach that site. Check the URL is right and publicly accessible.",
    );
  }
  if (home.status >= 400) {
    throw AppError.badRequest(
      `That site returned a ${home.status}. We can only audit pages that load publicly.`,
    );
  }

  const finalUrl = home.finalUrl;
  const host = safeHostname(finalUrl) ?? domain;
  const homepage = parsePage(home.text, finalUrl, home.status, home.ms);

  const robots = await fetchText(new URL("/robots.txt", finalUrl).toString(), 8000);
  const robotsBody = robots?.status === 200 ? robots.text : "";
  const blocksIndexing = /^\s*User-agent:\s*\*[\s\S]*?^\s*Disallow:\s*\/\s*$/im.test(robotsBody);

  const sitemapUrls = await readSitemap(finalUrl, robotsBody);
  const hasSitemap = sitemapUrls.length > 0;

  // Sitemap first — it's the site's own statement of what matters. Homepage
  // links are the fallback when there's no sitemap or it's too small.
  const candidates: string[] = [];
  const seen = new Set([finalUrl]);

  for (const url of [...sitemapUrls, ...homepage.internalLinks]) {
    if (candidates.length >= maxPages - 1) break;
    try {
      const parsed = new URL(url);
      parsed.hash = "";
      const normalized = parsed.toString();
      if (seen.has(normalized)) continue;
      if (safeHostname(normalized) !== host) continue;
      if (SKIP_PATTERN.test(parsed.pathname)) continue;
      seen.add(normalized);
      candidates.push(normalized);
    } catch {
      // Ignore malformed sitemap entries.
    }
  }

  const crawled = await mapWithConcurrency(candidates, CONCURRENCY, async (url) => {
    if (options.signal?.aborted) return null;
    const response = await fetchText(url);
    if (!response || response.status >= 400) return null;
    return parsePage(response.text, response.finalUrl, response.status, response.ms);
  });

  const pages = [homepage, ...crawled.filter((page): page is PageCrawl => page !== null)];
  const avgResponseTimeMs = Math.round(
    pages.reduce((total, page) => total + page.responseTimeMs, 0) / pages.length,
  );

  return {
    domain: host,
    finalUrl,
    isHttps: finalUrl.startsWith("https://"),
    homepage,
    pages,
    // Capped: this goes into a model prompt and tokens are the audit's cost.
    homepageText: extractText(home.text).slice(0, 6000),
    hasRobotsTxt: robots?.status === 200,
    hasSitemap,
    blocksIndexing,
    discoveredUrlCount: Math.max(sitemapUrls.length, seen.size),
    crawledCount: pages.length,
    avgResponseTimeMs,
  };
}
