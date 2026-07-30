import { createHash } from "node:crypto";

import prisma from "@theseosaas/db";
import { env } from "@theseosaas/env/server";
import { z } from "zod";

import { request } from "../http/index.ts";
import { safeHostname } from "../util/domain.ts";

/**
 * Serpex client — SERP data for competitor discovery, ranking pages, and
 * competitor blog discovery.
 *
 * Search is the dominant per-audit cost, so every call goes through a
 * Postgres-backed cache by default. Two founders auditing the same niche, or
 * one founder re-running an audit, should not both be billed.
 */

const SERPEX_SEARCH_URL = "https://api.serpex.dev/api/search";

/**
 * Tolerant by design. The docs pin down the envelope but not every field on a
 * result item, and a schema that's too strict would fail an entire audit over
 * one unexpected key. Unknown fields pass through.
 */
const serpexResultSchema = z
  .object({
    title: z.string().optional().default(""),
    url: z.string().optional().default(""),
    description: z.string().optional(),
    snippet: z.string().optional(),
    position: z.number().optional(),
    engine: z.string().optional(),
  })
  .loose();

const serpexResponseSchema = z
  .object({
    id: z.string().optional(),
    query: z.string().optional(),
    engines: z.array(z.string()).optional(),
    metadata: z
      .object({
        number_of_results: z.number().optional(),
        response_time: z.number().optional(),
        credits_used: z.number().optional(),
      })
      .loose()
      .optional(),
    results: z.array(serpexResultSchema).optional().default([]),
  })
  .loose();

export type SerpexRawResponse = z.infer<typeof serpexResponseSchema>;

export interface SearchResult {
  title: string;
  url: string;
  /** Serpex uses `description` on some engines and `snippet` on others. */
  snippet: string;
  position: number;
  domain: string | null;
}

export interface SearchResponse {
  query: string;
  results: SearchResult[];
  creditsUsed: number;
  cached: boolean;
}

/**
 * Serpex engines. We pin to Google rather than `auto`, because competitor
 * discovery is only as good as the index behind it — "who ranks for X" has to
 * mean Google, which is where the user's buyers actually are. `auto` would
 * silently route to DuckDuckGo or Brave and quietly degrade the whole audit.
 */
export type SerpexEngine =
  | "google"
  | "auto"
  | "bing"
  | "duckduckgo"
  | "brave"
  | "yahoo"
  | "yandex";

export type SerpexTimeFilter = "day" | "week" | "month" | "year";

export const DEFAULT_ENGINE: SerpexEngine = "google";

export interface SearchParams {
  q: string;
  /** Defaults to Google. Override only with a deliberate reason. */
  engine?: SerpexEngine;
  country?: string;
  language?: string;
  limit?: number;
  /** Recency window — used when looking for a competitor's *recent* posts. */
  time?: SerpexTimeFilter;
}

export interface SearchOptions {
  /** Cache lifetime. SERPs move slowly enough that a day is safe. */
  ttlMs?: number;
  /** Set false to force a live call, e.g. for a paid rank check. */
  useCache?: boolean;
  signal?: AbortSignal;
}

const DEFAULT_TTL_MS = 1000 * 60 * 60 * 24;

function cacheKeyFor(params: SearchParams): string {
  const canonical = JSON.stringify({
    q: params.q.trim().toLowerCase(),
    // Resolved, not raw: an explicit "google" and an omitted engine are the
    // same query and must share a cache entry.
    engine: params.engine ?? DEFAULT_ENGINE,
    country: params.country ?? null,
    language: params.language ?? null,
    limit: params.limit ?? null,
    time: params.time ?? null,
  });
  return createHash("sha256").update(canonical).digest("hex");
}

function normalize(raw: SerpexRawResponse, query: string, cached: boolean): SearchResponse {
  const results = (raw.results ?? []).map((item, index) => ({
    title: item.title ?? "",
    url: item.url ?? "",
    snippet: item.description ?? item.snippet ?? "",
    position: item.position ?? index + 1,
    domain: item.url ? safeHostname(item.url) : null,
  }));

  return {
    query: raw.query ?? query,
    results,
    creditsUsed: raw.metadata?.credits_used ?? 0,
    cached,
  };
}

export async function search(
  params: SearchParams,
  options: SearchOptions = {},
): Promise<SearchResponse> {
  const { ttlMs = DEFAULT_TTL_MS, useCache = true, signal } = options;
  const cacheKey = cacheKeyFor(params);

  if (useCache) {
    const hit = await prisma.searchCache.findFirst({
      where: { cacheKey, expiresAt: { gt: new Date() } },
      select: { id: true, payload: true },
    });

    if (hit) {
      // Fire-and-forget: a hit counter must never delay or fail the request.
      prisma.searchCache
        .update({ where: { id: hit.id }, data: { hits: { increment: 1 } } })
        .catch(() => {});

      const parsed = serpexResponseSchema.safeParse(hit.payload);
      if (parsed.success) return normalize(parsed.data, params.q, true);
      // A malformed cache row falls through to a live call rather than throwing.
    }
  }

  const { data } = await request<unknown>(SERPEX_SEARCH_URL, {
    method: "GET",
    provider: "serpex",
    headers: { authorization: `Bearer ${env.SERPEX_API_KEY}` },
    query: {
      q: params.q,
      engine: params.engine ?? DEFAULT_ENGINE,
      country: params.country,
      language: params.language,
      limit: params.limit,
      time: params.time,
    },
    timeoutMs: 20_000,
    signal,
  });

  const parsed = serpexResponseSchema.parse(data);

  if (useCache) {
    await prisma.searchCache
      .upsert({
        where: { cacheKey },
        create: {
          cacheKey,
          provider: "serpex",
          payload: parsed as object,
          expiresAt: new Date(Date.now() + ttlMs),
        },
        update: {
          payload: parsed as object,
          expiresAt: new Date(Date.now() + ttlMs),
        },
      })
      .catch(() => {});
  }

  return normalize(parsed, params.q, false);
}

/**
 * Results excluding the user's own domain — the common shape when looking for
 * who else ranks for a term.
 */
export async function searchExcludingDomain(
  params: SearchParams,
  excludeDomain: string,
  options?: SearchOptions,
): Promise<SearchResponse> {
  const response = await search(params, options);
  const exclude = excludeDomain.replace(/^www\./, "").toLowerCase();

  return {
    ...response,
    results: response.results.filter((result) => result.domain !== exclude),
  };
}

/**
 * Finds where a domain ranks for a term. Returns null when it isn't in the
 * result window, which the UI should read as "not ranking" rather than "0".
 */
export async function findRankingPosition(
  term: string,
  domain: string,
  options?: SearchOptions,
): Promise<{ position: number; url: string } | null> {
  const response = await search({ q: term, limit: 50 }, options);
  const target = domain.replace(/^www\./, "").toLowerCase();

  const match = response.results.find((result) => result.domain === target);
  return match ? { position: match.position, url: match.url } : null;
}

export async function deleteExpiredSearchCache(): Promise<number> {
  const { count } = await prisma.searchCache.deleteMany({
    where: { expiresAt: { lte: new Date() } },
  });
  return count;
}
