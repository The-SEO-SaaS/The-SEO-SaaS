import prisma, { type Prisma } from "@theseosaas/db";

/**
 * Postgres-backed job queue.
 *
 * Dequeue uses `FOR UPDATE SKIP LOCKED`, the standard Postgres primitive for
 * safe concurrent claiming: each worker locks distinct rows and skips ones
 * another worker already holds, so N workers never process the same job.
 *
 * Why not pg-boss or a hosted queue: audits need per-step progress driven
 * straight into the UI's checklist loader, retries are simple, and the DB is
 * already there. This is ~150 lines with zero new infrastructure.
 */

export interface EnqueueOptions {
  /** Higher runs first. Paid work should outrank anonymous free audits. */
  priority?: number;
  maxAttempts?: number;
  /** Delay before the job becomes eligible. */
  delayMs?: number;
}

export interface QueuedJob {
  id: string;
  type: string;
  payload: unknown;
  attempts: number;
  maxAttempts: number;
}

export async function enqueue(
  type: string,
  payload: Record<string, unknown>,
  options: EnqueueOptions = {},
): Promise<{ id: string }> {
  const job = await prisma.job.create({
    data: {
      type,
      payload: payload as Prisma.InputJsonValue,
      priority: options.priority ?? 0,
      maxAttempts: options.maxAttempts ?? 3,
      runAfter: new Date(Date.now() + (options.delayMs ?? 0)),
    },
    select: { id: true },
  });

  return job;
}

/**
 * Atomically claims up to `limit` eligible jobs for this worker.
 *
 * The UPDATE ... FROM (SELECT ... FOR UPDATE SKIP LOCKED) pattern is a single
 * statement, so claiming is atomic without an explicit transaction.
 */
export async function claimJobs(
  workerId: string,
  types: string[],
  limit = 1,
): Promise<QueuedJob[]> {
  if (types.length === 0) return [];

  const rows = await prisma.$queryRaw<
    Array<{
      id: string;
      type: string;
      payload: unknown;
      attempts: number;
      maxAttempts: number;
    }>
  >`
    UPDATE "Job" AS j
    SET
      status = 'ACTIVE',
      "lockedAt" = NOW(),
      "lockedBy" = ${workerId},
      "startedAt" = COALESCE(j."startedAt", NOW()),
      attempts = j.attempts + 1,
      "updatedAt" = NOW()
    FROM (
      SELECT id
      FROM "Job"
      WHERE status = 'PENDING'
        AND "runAfter" <= NOW()
        AND type = ANY(${types}::text[])
      ORDER BY priority DESC, "runAfter" ASC
      LIMIT ${limit}
      FOR UPDATE SKIP LOCKED
    ) AS eligible
    WHERE j.id = eligible.id
    RETURNING j.id, j.type, j.payload, j.attempts, j."maxAttempts" AS "maxAttempts";
  `;

  return rows;
}

/** Drives the audit checklist loader. Deliberately cheap and non-blocking. */
export async function updateProgress(
  jobId: string,
  progress: number,
  label?: string,
): Promise<void> {
  await prisma.job
    .update({
      where: { id: jobId },
      data: {
        progress: Math.max(0, Math.min(100, Math.round(progress))),
        ...(label ? { progressLabel: label } : {}),
      },
    })
    .catch(() => {});
}

export async function completeJob(
  jobId: string,
  result?: Record<string, unknown>,
): Promise<void> {
  await prisma.job.update({
    where: { id: jobId },
    data: {
      status: "COMPLETED",
      progress: 100,
      result: (result ?? {}) as Prisma.InputJsonValue,
      lockedAt: null,
      lockedBy: null,
      completedAt: new Date(),
    },
  });
}

/**
 * Records a failure. Reschedules with exponential backoff while attempts
 * remain, otherwise marks the job dead.
 */
export async function failJob(
  jobId: string,
  error: unknown,
  attempts: number,
  maxAttempts: number,
): Promise<{ willRetry: boolean }> {
  const message = error instanceof Error ? error.message : String(error);
  const willRetry = attempts < maxAttempts;

  // 30s, 2m, 8m — long enough for a transient provider outage to clear.
  const backoffMs = 30_000 * 4 ** (attempts - 1);

  await prisma.job.update({
    where: { id: jobId },
    data: {
      status: willRetry ? "PENDING" : "FAILED",
      lastError: message.slice(0, 1000),
      lockedAt: null,
      lockedBy: null,
      ...(willRetry
        ? { runAfter: new Date(Date.now() + backoffMs) }
        : { completedAt: new Date() }),
    },
  });

  return { willRetry };
}

/**
 * Marks a running job as still alive.
 *
 * `lockedAt` was previously written once, at claim time, and never touched
 * again — so "stalled" really meant "started more than ten minutes ago". An
 * audit is advertised to users as six to eight minutes and regularly runs
 * longer on a big site, which put healthy jobs inside the reclaim window: the
 * sweep would hand a live job to a second worker, and two pipelines would write
 * the same audit concurrently.
 *
 * With a heartbeat, `lockedAt` means what the sweep assumes it means — last
 * sign of life — so the threshold can be about worker health rather than job
 * duration.
 */
export async function heartbeatJob(jobId: string): Promise<void> {
  await prisma.job
    .updateMany({
      where: { id: jobId, status: "ACTIVE" },
      data: { lockedAt: new Date() },
    })
    .catch(() => {});
}

/**
 * Hands a claimed job straight back, without consuming a retry.
 *
 * For clean shutdown specifically. `failJob` is wrong there twice over: it
 * burns an attempt — two `--watch` restarts would exhaust an audit's
 * maxAttempts of 2 and mark it dead — and it applies a 30s backoff, so a job
 * interrupted by a dev-server reload wouldn't restart until well after the new
 * process was up. Nothing failed here; the process just went away.
 */
export async function releaseJob(jobId: string, reason: string): Promise<void> {
  await prisma.job
    .updateMany({
      where: { id: jobId, status: "ACTIVE" },
      data: {
        status: "PENDING",
        attempts: { decrement: 1 },
        lockedAt: null,
        lockedBy: null,
        runAfter: new Date(),
        lastError: reason.slice(0, 1000),
      },
    })
    .catch(() => {});
}

/**
 * Returns jobs whose worker died mid-run (locked but never finished) to the
 * pending pool. Without this, a crashed process strands work forever.
 *
 * Two minutes, not ten, now that `lockedAt` is heartbeated every 30s — four
 * missed beats is dead, not busy. The old ten-minute value existed to avoid
 * reclaiming long-running audits, which the heartbeat handles properly; it also
 * meant a `kill -9` stranded an audit for ten minutes while its progress bar sat
 * frozen at whatever step it died on.
 */
export async function reclaimStalledJobs(stalledAfterMs = 1000 * 60 * 2): Promise<number> {
  const cutoff = new Date(Date.now() - stalledAfterMs);

  const { count } = await prisma.job.updateMany({
    where: { status: "ACTIVE", lockedAt: { lt: cutoff } },
    data: {
      status: "PENDING",
      lockedAt: null,
      lockedBy: null,
      lastError: "Worker stalled; job reclaimed.",
    },
  });

  return count;
}

export async function getJob(jobId: string) {
  return prisma.job.findUnique({
    where: { id: jobId },
    select: {
      id: true,
      type: true,
      status: true,
      progress: true,
      progressLabel: true,
      attempts: true,
      maxAttempts: true,
      lastError: true,
      result: true,
      createdAt: true,
      completedAt: true,
    },
  });
}

export async function cancelJob(jobId: string): Promise<void> {
  await prisma.job.updateMany({
    where: { id: jobId, status: { in: ["PENDING", "ACTIVE"] } },
    data: { status: "CANCELED", lockedAt: null, lockedBy: null, completedAt: new Date() },
  });
}
