export {
  enqueue,
  claimJobs,
  updateProgress,
  completeJob,
  failJob,
  heartbeatJob,
  releaseJob,
  reclaimStalledJobs,
  getJob,
  cancelJob,
  type EnqueueOptions,
  type QueuedJob,
} from "./queue.ts";

export {
  createWorker,
  type Worker,
  type WorkerOptions,
  type JobHandler,
  type JobContext,
} from "./worker.ts";

/** Handler keys. Kept here so producer and worker can't drift apart. */
export const JOB_TYPES = {
  AUDIT_RUN: "audit.run",
  CONTENT_GENERATE: "content.generate",
  KEYWORD_REFRESH: "keyword.refresh",
} as const;

export type JobType = (typeof JOB_TYPES)[keyof typeof JOB_TYPES];
