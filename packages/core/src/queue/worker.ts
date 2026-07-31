import { randomUUID } from "node:crypto";

import { sleep } from "../util/async.ts";
import {
  claimJobs,
  completeJob,
  failJob,
  heartbeatJob,
  reclaimStalledJobs,
  releaseJob,
  updateProgress,
  type QueuedJob,
} from "./queue.ts";

/**
 * Long-running worker loop.
 *
 * Runs as a separate process (`node worker.js`), not inside a request. Audits
 * take far longer than any serverless timeout allows, which is exactly why the
 * work is queued rather than run inline.
 */

/**
 * How often a running job refreshes its lock. Four beats inside the two-minute
 * stall threshold, so a single slow write or brief database blip can't get a
 * healthy job reclaimed out from under itself.
 */
const HEARTBEAT_MS = 30_000;

export interface JobContext {
  jobId: string;
  attempt: number;
  /** Push progress to the UI's checklist loader. */
  setProgress: (progress: number, label?: string) => Promise<void>;
  /** Flips true on shutdown so long handlers can bail out cleanly. */
  signal: AbortSignal;
}

export type JobHandler = (
  payload: Record<string, unknown>,
  context: JobContext,
) => Promise<Record<string, unknown> | void>;

export interface WorkerOptions {
  handlers: Record<string, JobHandler>;
  /** Jobs processed simultaneously. Keep low — each fans out provider calls. */
  concurrency?: number;
  /** Idle poll interval. */
  pollIntervalMs?: number;
  workerId?: string;
  onError?: (error: unknown, job: QueuedJob) => void;
}

export interface Worker {
  start: () => Promise<void>;
  stop: () => Promise<void>;
}

export function createWorker(options: WorkerOptions): Worker {
  const {
    handlers,
    concurrency = 2,
    pollIntervalMs = 2000,
    workerId = `worker-${randomUUID().slice(0, 8)}`,
    onError,
  } = options;

  const types = Object.keys(handlers);
  const controller = new AbortController();
  let running = false;
  let active = 0;

  async function runJob(job: QueuedJob): Promise<void> {
    active++;

    // Keeps `lockedAt` fresh for as long as this job runs, so the stall sweep
    // can tell a slow job from a dead worker. Without it the sweep was really
    // asking "did this start a long time ago?", which for an audit is a yes
    // well before it's finished.
    const heartbeat = setInterval(() => {
      void heartbeatJob(job.id);
    }, HEARTBEAT_MS);
    // Don't hold the event loop open on this timer alone.
    heartbeat.unref?.();

    try {
      const handler = handlers[job.type];
      if (!handler) {
        await failJob(job.id, new Error(`No handler for "${job.type}"`), job.maxAttempts, job.maxAttempts);
        return;
      }

      const result = await handler(job.payload as Record<string, unknown>, {
        jobId: job.id,
        attempt: job.attempts,
        setProgress: (progress, label) => updateProgress(job.id, progress, label),
        signal: controller.signal,
      });

      await completeJob(job.id, result ?? undefined);
    } catch (error) {
      // A shutdown isn't a failure. When the abort signal is what stopped this
      // handler, hand the job straight back without consuming an attempt — two
      // `--watch` restarts would otherwise exhaust an audit's maxAttempts of 2
      // and mark real work permanently dead.
      if (controller.signal.aborted) {
        await releaseJob(job.id, "Worker shut down mid-job; released for retry.").catch(
          () => {},
        );
      } else {
        onError?.(error, job);
        await failJob(job.id, error, job.attempts, job.maxAttempts).catch(() => {});
      }
    } finally {
      clearInterval(heartbeat);
      active--;
    }
  }

  async function loop(): Promise<void> {
    let sweepCounter = 0;

    while (running) {
      try {
        // Periodically return work stranded by a crashed worker.
        if (sweepCounter++ % 30 === 0) {
          await reclaimStalledJobs().catch(() => {});
        }

        const capacity = concurrency - active;
        if (capacity <= 0) {
          await sleep(pollIntervalMs);
          continue;
        }

        const jobs = await claimJobs(workerId, types, capacity);

        if (jobs.length === 0) {
          await sleep(pollIntervalMs);
          continue;
        }

        // Deliberately not awaited: the loop returns to claim more work while
        // these run, up to `concurrency`.
        for (const job of jobs) void runJob(job);
      } catch (error) {
        onError?.(error, { id: "-", type: "-", payload: null, attempts: 0, maxAttempts: 0 });
        // Back off on a DB outage rather than spinning hot.
        await sleep(pollIntervalMs * 5);
      }
    }
  }

  return {
    async start() {
      if (running) return;
      running = true;
      await loop();
    },
    async stop() {
      running = false;
      controller.abort();

      // Let in-flight jobs notice the abort and release themselves. Anything
      // still running past the deadline is left ACTIVE with a stale heartbeat,
      // which the next worker's stall sweep picks up within two minutes.
      const deadline = Date.now() + 30_000;
      while (active > 0 && Date.now() < deadline) {
        await sleep(200);
      }
    },
  };
}
