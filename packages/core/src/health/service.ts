import prisma from "@theseosaas/db";
import { env } from "@theseosaas/env/server";

import { getTransporter } from "../mail/mailer.ts";

/**
 * Live dependency checks behind the public status page.
 *
 * Every check here actually talks to the thing it reports on. A status page
 * that renders a hardcoded green tick is worse than no status page: it's a
 * promise the product can't keep, and the first time someone trusts it during a
 * real outage is the last time they trust anything else on the site.
 *
 * Three rules the checks follow:
 *
 *  1. **Cheap and read-only.** A status page is the one URL that gets hammered
 *     during an incident. Nothing here writes, and nothing costs money —
 *     the Serpex and OpenRouter probes hit metadata endpoints rather than
 *     spending credits on a real query.
 *  2. **Independently timed out.** One hung dependency must not hold the whole
 *     page open; each check races a timer and reports `down` if it loses.
 *  3. **Degraded is a real state.** Slow is not the same as broken, and a
 *     worker with a backlog is not the same as a worker that's dead. Collapsing
 *     those into up/down throws away the information an incident actually needs.
 */

export type ServiceState = "operational" | "degraded" | "down";

export interface ServiceHealth {
  key: string;
  /** Shown on the page. Written for a customer, not an operator. */
  name: string;
  /** What breaks for the user when this is down. */
  description: string;
  state: ServiceState;
  /** Round-trip in milliseconds, when the check completed. */
  latencyMs: number | null;
  /** Plain-language detail. Never contains credentials or stack traces. */
  detail: string | null;
}

export interface HealthReport {
  /** Worst state across all services. */
  state: ServiceState;
  services: ServiceHealth[];
  checkedAt: string;
}

/** Past this, a dependency is considered down rather than slow. */
const CHECK_TIMEOUT_MS = 5000;
/** Past this, it's up but unhappy. */
const DEGRADED_ABOVE_MS = 1500;

async function timed<T>(
  operation: (signal: AbortSignal) => Promise<T>,
): Promise<{ ms: number; value: T } | { ms: number; error: unknown }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CHECK_TIMEOUT_MS);
  const started = Date.now();

  try {
    const value = await operation(controller.signal);
    return { ms: Date.now() - started, value };
  } catch (error) {
    return { ms: Date.now() - started, error };
  } finally {
    clearTimeout(timer);
  }
}

/** Slow-but-alive is `degraded`; this keeps that rule in one place. */
function stateFor(ms: number): ServiceState {
  return ms > DEGRADED_ABOVE_MS ? "degraded" : "operational";
}

function messageOf(error: unknown): string {
  if (error instanceof Error) {
    return error.name === "AbortError"
      ? `No response within ${CHECK_TIMEOUT_MS / 1000}s`
      : error.message;
  }
  return "Unavailable";
}

async function checkDatabase(): Promise<ServiceHealth> {
  const result = await timed(() => prisma.$queryRaw`SELECT 1`);

  return {
    key: "database",
    name: "Database",
    description: "Accounts, reports and the job queue.",
    state: "error" in result ? "down" : stateFor(result.ms),
    latencyMs: result.ms,
    detail: "error" in result ? messageOf(result.error) : null,
  };
}

/**
 * The queue is judged by its backlog, not by a ping.
 *
 * A worker process that's running but wedged looks identical to a healthy one
 * from the outside — the only observable difference is that jobs stop moving.
 * So this asks the question the user cares about: is anything stuck?
 */
async function checkWorker(): Promise<ServiceHealth> {
  const result = await timed(async () => {
    const [pending, stalled] = await Promise.all([
      prisma.job.count({
        where: { status: "PENDING", runAfter: { lt: new Date(Date.now() - 60_000) } },
      }),
      prisma.job.count({
        where: { status: "ACTIVE", lockedAt: { lt: new Date(Date.now() - 5 * 60_000) } },
      }),
    ]);

    return { pending, stalled };
  });

  if ("error" in result) {
    return {
      key: "worker",
      name: "Audit engine",
      description: "Runs crawls, rank checks and article generation.",
      state: "down",
      latencyMs: result.ms,
      detail: messageOf(result.error),
    };
  }

  const { pending, stalled } = result.value;

  // Anything holding a lock this long has lost its worker: the heartbeat runs
  // every 30s, so five minutes is ten missed beats.
  if (stalled > 0) {
    return {
      key: "worker",
      name: "Audit engine",
      description: "Runs crawls, rank checks and article generation.",
      state: "down",
      latencyMs: result.ms,
      detail: `${stalled} job${stalled === 1 ? "" : "s"} stalled. New audits may not start.`,
    };
  }

  if (pending > 10) {
    return {
      key: "worker",
      name: "Audit engine",
      description: "Runs crawls, rank checks and article generation.",
      state: "degraded",
      latencyMs: result.ms,
      detail: `${pending} jobs waiting. Audits are running, but slower than usual.`,
    };
  }

  return {
    key: "worker",
    name: "Audit engine",
    description: "Runs crawls, rank checks and article generation.",
    state: "operational",
    latencyMs: result.ms,
    detail: pending > 0 ? `${pending} in the queue` : null,
  };
}

/**
 * Reachability only.
 *
 * Deliberately does not run a real search: every Serpex query costs credits,
 * and a status page that bills you per refresh is a status page someone will
 * eventually point a monitor at. A failed TCP/TLS handshake or a 5xx is what
 * this is looking for.
 */
async function checkSerpex(): Promise<ServiceHealth> {
  const result = await timed(async (signal) => {
    const response = await fetch("https://api.serpex.dev/", {
      method: "HEAD",
      signal,
      headers: { "user-agent": "TheSEOSaaS-status/1.0" },
    });
    // 4xx is fine here — it means the service answered. Only 5xx is its fault.
    if (response.status >= 500) throw new Error(`Upstream returned ${response.status}`);
    return response.status;
  });

  return {
    key: "search",
    name: "Search data",
    description: "Competitor discovery, rankings and keyword gaps.",
    state: "error" in result ? "down" : stateFor(result.ms),
    latencyMs: result.ms,
    detail: "error" in result ? messageOf(result.error) : null,
  };
}

async function checkOpenRouter(): Promise<ServiceHealth> {
  const result = await timed(async (signal) => {
    // The models list is public, free and unauthenticated — the cheapest honest
    // signal that the API is answering.
    const response = await fetch("https://openrouter.ai/api/v1/models", {
      method: "HEAD",
      signal,
      headers: { "user-agent": "TheSEOSaaS-status/1.0" },
    });
    if (response.status >= 500) throw new Error(`Upstream returned ${response.status}`);
    return response.status;
  });

  return {
    key: "ai",
    name: "Content generation",
    description: "Briefs, articles and the audit's written verdict.",
    state: "error" in result ? "down" : stateFor(result.ms),
    latencyMs: result.ms,
    detail: "error" in result ? messageOf(result.error) : null,
  };
}

/**
 * `verify()` opens a real SMTP connection and authenticates, without sending —
 * which is exactly the check worth having, since bad credentials are the
 * failure mode that otherwise stays silent until a user reports a missing
 * report link.
 */
async function checkMail(): Promise<ServiceHealth> {
  const result = await timed(async () => {
    await getTransporter().verify();
    return true;
  });

  return {
    key: "email",
    name: "Email delivery",
    description: "Sign-in links and finished-report notifications.",
    state: "error" in result ? "down" : stateFor(result.ms),
    latencyMs: result.ms,
    detail: "error" in result ? messageOf(result.error) : null,
  };
}

const SEVERITY: Record<ServiceState, number> = {
  operational: 0,
  degraded: 1,
  down: 2,
};

export async function getHealthReport(): Promise<HealthReport> {
  // Concurrent, so the page costs one timeout rather than five. `allSettled`
  // isn't needed — each check catches its own failure and returns a shape.
  const services = await Promise.all([
    checkDatabase(),
    checkWorker(),
    checkSerpex(),
    checkOpenRouter(),
    checkMail(),
  ]);

  const state = services.reduce<ServiceState>(
    (worst, service) => (SEVERITY[service.state] > SEVERITY[worst] ? service.state : worst),
    "operational",
  );

  return { state, services, checkedAt: new Date().toISOString() };
}

/** Exposed so the status page can name the environment it's reporting on. */
export const APP_ORIGIN = env.APP_URL;
