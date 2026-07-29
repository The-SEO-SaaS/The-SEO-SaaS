import { AppError } from "../errors.js";
import { safeHostname, toUrl } from "../util/domain.js";

/**
 * Homepage crawl.
 *
 * Deliberately shallow: one page, plus robots.txt and a sitemap probe. A deep
 * crawl would multiply cost and latency for a free audit whose job is to prove
 * value in under two minutes, and the homepage carries most of the signals we
 * actually act on (positioning, title/meta discipline, internal link shape).
 *
 * Parsing is regex-based rather than a DOM library. That is a real trade-off —
 * it will mis-handle exotic markup — but we only extract a handful of
 * well-defined tags, and it keeps a heavyweight parser out of the dependency
 * tree. If extraction accuracy ever becomes the bottleneck, swap this file for
 * node-html-parser; nothing outside it depends on the implementation.
 */

export interface CrawlResult {
  url: string;
  finalUrl: string;
  domain: string;
  statusCode: number;

  title: string | null;
  metaDescription: string | null;
  canonical: string | null;
  h1s: string[];
  h2s: string[];

  /** Visible text, collapsed. Fed to the model as positioning context. */
  textContent: string;
  wordCount: number;

  isHttps: boolean;
  hasViewport: boolean;
  hasOpenGraph: boolean;
  hasStructuredData: boolean;
  hasRobotsTxt: boolean;
  hasSitemap: boolean;
  /** Whether robots.txt actively blocks crawlers from the whole site. */
  blocksIndexing: boolean;

  internalLinks: string[];
  externalLinks: string[];
  imageCount: number;
  imagesMissingAlt: number;

  responseTimeMs: number;
}

const USER_AGENT =
  "Mozilla/5.0 (compatible; TheSEOSaaSBot/1.0; +https://theseosaas.com/bot)";

/** Caps the response we'll read. Some marketing sites ship enormous HTML. */
const MAX_HTML_BYTES = 2_000_000;
const FETCH_TIMEOUT_MS = 20_000;

async function fetchText(
  url: string,
  timeoutMs = FETCH_TIMEOUT_MS,
): Promise<{ text: string; status: number; finalUrl: string } | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      headers: { "user-agent": USER_AGENT, accept: "text/html,*/*" },
      redirect: "follow",
      signal: controller.signal,
    });

    const buffer = await response.arrayBuffer();
    const sliced = buffer.byteLength > MAX_HTML_BYTES
      ? buffer.slice(0, MAX_HTML_BYTES)
      : buffer;

    return {
      text: new TextDecoder("utf-8", { fatal: false }).decode(sliced),
      status: response.status,
      finalUrl: response.url || url,
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Strips scripts, styles and tags, then collapses whitespace. */
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
    .filter((value) => value.length > 0);
}

/** Reads a meta tag by name or property, tolerating attribute order. */
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

export async function crawlSite(domain: string): Promise<CrawlResult> {
  const url = toUrl(domain);
  const startedAt = Date.now();

  const page = await fetchText(url);
  if (!page) {
    throw AppError.badRequest(
      "We couldn't reach that site. Check the URL is right and publicly accessible.",
    );
  }

  const responseTimeMs = Date.now() - startedAt;

  if (page.status >= 400) {
    throw AppError.badRequest(
      `That site returned a ${page.status}. We can only audit pages that load publicly.`,
    );
  }

  const html = page.text;
  const finalUrl = page.finalUrl;
  const host = safeHostname(finalUrl) ?? domain;

  // robots.txt and sitemap are probed in parallel — neither blocks the audit
  // if it fails, they only contribute issues.
  const [robots, sitemap] = await Promise.all([
    fetchText(new URL("/robots.txt", finalUrl).toString(), 8000),
    fetchText(new URL("/sitemap.xml", finalUrl).toString(), 8000),
  ]);

  const robotsBody = robots?.status === 200 ? robots.text : "";
  const blocksIndexing = /^\s*User-agent:\s*\*[\s\S]*?^\s*Disallow:\s*\/\s*$/im.test(robotsBody);

  const hasSitemap =
    (sitemap?.status === 200 && /<(urlset|sitemapindex)/i.test(sitemap.text)) ||
    /^\s*Sitemap:\s*\S+/im.test(robotsBody);

  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const canonicalMatch = html.match(
    /<link[^>]+rel=["']canonical["'][^>]*href=["']([^"']+)["']/i,
  );

  const links = [...html.matchAll(/<a\b[^>]*href=["']([^"']+)["']/gi)]
    .map((match) => match[1]!)
    .filter((href) => !href.startsWith("#") && !href.startsWith("mailto:"));

  const internalLinks: string[] = [];
  const externalLinks: string[] = [];

  for (const href of links) {
    try {
      const resolved = new URL(href, finalUrl);
      if (safeHostname(resolved.toString()) === host) internalLinks.push(resolved.toString());
      else externalLinks.push(resolved.toString());
    } catch {
      // Malformed href — ignore rather than fail the crawl.
    }
  }

  const images = [...html.matchAll(/<img\b[^>]*>/gi)].map((match) => match[0]);
  const imagesMissingAlt = images.filter(
    (tag) => !/\balt=["'][^"']+["']/i.test(tag),
  ).length;

  const textContent = extractText(html);

  return {
    url,
    finalUrl,
    domain: host,
    statusCode: page.status,

    title: titleMatch?.[1] ? extractText(titleMatch[1]) : null,
    metaDescription: metaContent(html, "description"),
    canonical: canonicalMatch?.[1] ?? null,
    h1s: matchAll(html, /<h1\b[^>]*>([\s\S]*?)<\/h1>/gi),
    h2s: matchAll(html, /<h2\b[^>]*>([\s\S]*?)<\/h2>/gi).slice(0, 20),

    // Capped: this goes into a model prompt and tokens are the audit's cost.
    textContent: textContent.slice(0, 6000),
    wordCount: textContent.split(/\s+/).filter(Boolean).length,

    isHttps: finalUrl.startsWith("https://"),
    hasViewport: /<meta[^>]+name=["']viewport["']/i.test(html),
    hasOpenGraph: /<meta[^>]+property=["']og:/i.test(html),
    hasStructuredData: /application\/ld\+json/i.test(html),
    hasRobotsTxt: robots?.status === 200,
    hasSitemap,
    blocksIndexing,

    // Deduped — nav links repeat on every page and would skew the count.
    internalLinks: [...new Set(internalLinks)],
    externalLinks: [...new Set(externalLinks)],
    imageCount: images.length,
    imagesMissingAlt,

    responseTimeMs,
  };
}
