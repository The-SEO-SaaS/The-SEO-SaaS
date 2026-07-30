import { AppError } from "../errors.ts";
import { sleep } from "../util/async.ts";

/**
 * Shared HTTP foundation for every outbound provider call (Serpex,
 * OpenRouter, Dodo). Handles timeouts, retries with exponential backoff and
 * jitter, and Retry-After, so no provider client has to reimplement any of it.
 */

export interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  headers?: Record<string, string>;
  /** Serialised as JSON and sent with `content-type: application/json`. */
  body?: unknown;
  /**
   * Sent as `application/x-www-form-urlencoded`. OAuth token endpoints require
   * form encoding and reject JSON. Mutually exclusive with `body`.
   */
  form?: Record<string, string>;
  query?: Record<string, string | number | boolean | undefined | null>;
  /** Per-attempt timeout in ms. Default 30s. */
  timeoutMs?: number;
  /** Retries *after* the first attempt. Default 2 (3 calls total). */
  retries?: number;
  /** Base backoff in ms, doubled per attempt. Default 500. */
  backoffMs?: number;
  /** Label used in error messages, e.g. "serpex". */
  provider?: string;
  signal?: AbortSignal;
}

export interface HttpResponse<T> {
  data: T;
  status: number;
  headers: Headers;
}

/** Transient failures worth retrying. 429 is included, honouring Retry-After. */
const RETRYABLE_STATUSES = new Set([408, 425, 429, 500, 502, 503, 504]);

function buildUrl(url: string, query?: RequestOptions["query"]): string {
  if (!query) return url;
  const parsed = new URL(url);
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null) continue;
    parsed.searchParams.set(key, String(value));
  }
  return parsed.toString();
}

function parseRetryAfter(headers: Headers): number | undefined {
  const raw = headers.get("retry-after");
  if (!raw) return undefined;

  const asSeconds = Number(raw);
  if (Number.isFinite(asSeconds)) return asSeconds * 1000;

  const asDate = Date.parse(raw);
  if (Number.isFinite(asDate)) return Math.max(0, asDate - Date.now());

  return undefined;
}

/** Full jitter — avoids a thundering herd when many workers retry together. */
function backoffDelay(attempt: number, baseMs: number): number {
  const ceiling = Math.min(baseMs * 2 ** attempt, 20_000);
  return Math.random() * ceiling;
}

export async function request<T>(
  url: string,
  options: RequestOptions = {},
): Promise<HttpResponse<T>> {
  const {
    method = "GET",
    headers = {},
    body,
    form,
    query,
    timeoutMs = 30_000,
    retries = 2,
    backoffMs = 500,
    provider = "upstream",
    signal,
  } = options;

  const target = buildUrl(url, query);
  let lastError: unknown;

  const encodedForm = form ? new URLSearchParams(form).toString() : undefined;
  const payload = encodedForm ?? (body !== undefined ? JSON.stringify(body) : undefined);
  const contentType = encodedForm
    ? "application/x-www-form-urlencoded"
    : body !== undefined
      ? "application/json"
      : undefined;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    // Propagate an external cancel (e.g. the caller gave up) into this attempt.
    const onExternalAbort = () => controller.abort();
    signal?.addEventListener("abort", onExternalAbort, { once: true });

    try {
      const response = await fetch(target, {
        method,
        headers: {
          accept: "application/json",
          ...(contentType ? { "content-type": contentType } : {}),
          ...headers,
        },
        ...(payload !== undefined ? { body: payload } : {}),
        signal: controller.signal,
      });

      if (!response.ok) {
        const text = await response.text().catch(() => "");
        const retryAfterMs = parseRetryAfter(response.headers);

        const shouldRetry = RETRYABLE_STATUSES.has(response.status) && attempt < retries;
        if (shouldRetry) {
          await sleep(retryAfterMs ?? backoffDelay(attempt, backoffMs));
          continue;
        }

        throw new AppError(
          response.status === 429 ? "RATE_LIMITED" : "UPSTREAM_ERROR",
          `${provider} responded ${response.status}`,
          {
            details: { provider, status: response.status, body: text.slice(0, 500) },
            ...(retryAfterMs !== undefined
              ? { retryAfter: Math.ceil(retryAfterMs / 1000) }
              : {}),
          },
        );
      }

      // 204 and empty bodies are valid successes.
      const raw = await response.text();
      const data = (raw ? JSON.parse(raw) : null) as T;

      return { data, status: response.status, headers: response.headers };
    } catch (error) {
      lastError = error;

      // A deliberate external cancel must not be retried.
      if (signal?.aborted) {
        throw AppError.timeout(`${provider} request was cancelled.`, { cause: error });
      }

      // Don't retry errors we already classified as terminal.
      if (error instanceof AppError) throw error;

      if (attempt < retries) {
        await sleep(backoffDelay(attempt, backoffMs));
        continue;
      }

      const timedOut = error instanceof Error && error.name === "AbortError";
      throw timedOut
        ? AppError.timeout(`${provider} timed out after ${timeoutMs}ms.`, { cause: error })
        : AppError.upstream(`${provider} request failed.`, {
            cause: error,
            details: { provider },
          });
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener("abort", onExternalAbort);
    }
  }

  throw AppError.upstream(`${provider} request failed.`, { cause: lastError });
}
