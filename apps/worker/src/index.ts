import { audit, content, queue, tracking } from "@theseosaas/core";

/**
 * Worker entry point.
 *
 * Runs as its own long-lived process, separate from Next.js. This is the whole
 * reason the queue exists: a full audit makes a crawl, several search calls and
 * three model calls, which is minutes of wall time — far past any serverless
 * request timeout, and not something to hold an HTTP connection open for.
 *
 * Run alongside the web app:
 *   pnpm --filter worker dev
 */

const CONCURRENCY = Number(process.env.WORKER_CONCURRENCY ?? 2);

const worker = queue.createWorker({
  concurrency: CONCURRENCY,
  pollIntervalMs: 2000,

  handlers: {
    [queue.JOB_TYPES.AUDIT_RUN]: async (payload, context) => {
      const { auditId, domain } = payload as { auditId: string; domain: string };

      if (!auditId || !domain) {
        throw new Error(`audit.run received a malformed payload: ${JSON.stringify(payload)}`);
      }

      console.log(`[audit] ${domain} (${auditId}) attempt ${context.attempt}`);

      await audit.runAuditPipeline({
        auditId,
        domain,
        signal: context.signal,
        // Mirror step progress onto the job row too, so a generic job view
        // shows something useful without knowing about audits.
        onProgress: (step, progress) => context.setProgress(progress, step),
      });

      console.log(`[audit] ${domain} complete`);
      return { auditId };
    },

    // A single long completion — minutes of wall time, and the most expensive
    // call the product makes. Same reason as the audit: nowhere near a
    // serverless request budget.
    [queue.JOB_TYPES.CONTENT_GENERATE]: async (payload, context) => {
      const { contentId } = payload as { contentId: string };

      if (!contentId) {
        throw new Error(
          `content.generate received a malformed payload: ${JSON.stringify(payload)}`,
        );
      }

      console.log(`[content] writing ${contentId} attempt ${context.attempt}`);

      await content.runContentGeneration({ contentId, signal: context.signal });

      console.log(`[content] ${contentId} written`);
      return { contentId };
    },

    // Self-perpetuating: each run schedules the next one 24h out, so this
    // never needs external cron infrastructure. See tracking/refresh.ts.
    [queue.JOB_TYPES.KEYWORD_REFRESH]: async () => {
      const result = await tracking.runKeywordRefreshSweep();
      console.log(
        `[keyword-refresh] checked ${result.checked} keyword(s), ${result.creditsUsed} credit(s) used`,
      );
      return result;
    },
  },

  onError: (error, job) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[worker] job ${job.id} (${job.type}) failed: ${message}`);
  },
});

/**
 * Graceful shutdown. stop() waits for in-flight jobs so they aren't left ACTIVE
 * and stranded until the stall sweeper reclaims them.
 */
async function shutdown(signal: string) {
  console.log(`[worker] ${signal} received, finishing in-flight jobs…`);
  await worker.stop();
  console.log("[worker] stopped");
  process.exit(0);
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));

// A rejected promise that reaches here means a bug, not a job failure — job
// failures are caught and recorded by the worker loop.
process.on("unhandledRejection", (reason) => {
  console.error("[worker] unhandled rejection:", reason);
});

// Idempotent — only seeds a sweep if one isn't already pending/running, so
// restarting the worker in dev never spawns a second perpetual chain.
await tracking.ensureKeywordRefreshScheduled();

console.log(`[worker] started, concurrency ${CONCURRENCY}`);
await worker.start();
