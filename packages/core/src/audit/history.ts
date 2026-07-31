import prisma from "@theseosaas/db";

import { queuePriorityFor, type PlanId } from "../billing/plan-data.ts";
import { AppError } from "../errors.ts";
import { enqueue, JOB_TYPES } from "../queue/index.ts";
import { randomId } from "../util/crypto.ts";

/**
 * Audit history for a site, and re-running one.
 *
 * The dashboard's score trend can only grow if audits get re-run, and a full
 * audit is too expensive to schedule automatically for every site every day
 * (crawl + several searches + three model calls). So re-running is a deliberate
 * user action, priced into the plan rather than metered: audits are how the
 * product earns trust, and metering them would be self-defeating.
 *
 * Rank tracking is the piece that *is* automatic — see ../tracking/refresh.ts.
 */

/** Guards against a user hammering the button and queueing five identical runs. */
const MIN_RERUN_GAP_MS = 1000 * 60 * 30;

export interface AuditHistoryEntry {
  id: string;
  publicId: string;
  status: "QUEUED" | "RUNNING" | "COMPLETED" | "FAILED";
  score: number | null;
  technicalHealth: number | null;
  /** Change vs the previous completed audit. Positive is an improvement. */
  scoreChange: number | null;
  issueCount: number;
  pagesCrawled: number;
  summary: string | null;
  createdAt: string;
  /** When the worker picked it up. The run header's elapsed time measures
   *  from here, not from `createdAt`, so queue wait isn't reported as work. */
  startedAt: string | null;
  completedAt: string | null;
}

export interface AuditHistory {
  site: { id: string; domain: string };
  audits: AuditHistoryEntry[];
  /** Present while an audit is queued or running, so the UI can poll it. */
  inFlight: { publicId: string; status: string } | null;
  canRerun: boolean;
  /** Why not, when canRerun is false — shown instead of a dead button. */
  rerunBlockedReason: string | null;
}

async function assertOwnedProject(userId: string, projectId: string) {
  const project = await prisma.project.findFirst({
    where: { id: projectId, userId },
    select: { id: true, domain: true },
  });
  if (!project) throw AppError.notFound("We couldn't find that site.");
  return project;
}

export async function getAuditHistory(
  userId: string,
  projectId: string,
): Promise<AuditHistory> {
  const project = await assertOwnedProject(userId, projectId);

  const rows = await prisma.audit.findMany({
    where: { projectId },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      publicId: true,
      status: true,
      score: true,
      technicalHealth: true,
      issueCount: true,
      pagesCrawled: true,
      summary: true,
      createdAt: true,
      startedAt: true,
      completedAt: true,
    },
  });

  // Deltas are computed against the previous *completed* audit, skipping any
  // failed runs in between — a failure isn't a score of zero.
  const completedScores = rows
    .filter((row) => row.status === "COMPLETED" && row.score !== null)
    .map((row) => ({ id: row.id, score: row.score! }));

  const previousScore = new Map<string, number>();
  for (let index = 0; index < completedScores.length - 1; index++) {
    previousScore.set(completedScores[index]!.id, completedScores[index + 1]!.score);
  }

  const audits: AuditHistoryEntry[] = rows.map((row) => {
    const previous = previousScore.get(row.id);

    return {
      id: row.id,
      publicId: row.publicId,
      status: row.status as AuditHistoryEntry["status"],
      score: row.score,
      technicalHealth: row.technicalHealth,
      scoreChange:
        row.score !== null && previous !== undefined ? row.score - previous : null,
      issueCount: row.issueCount,
      pagesCrawled: row.pagesCrawled,
      // On failure this field carries the reason rather than a verdict.
      summary: row.summary,
      createdAt: row.createdAt.toISOString(),
      startedAt: row.startedAt?.toISOString() ?? null,
      completedAt: row.completedAt?.toISOString() ?? null,
    };
  });

  const inFlightRow = rows.find(
    (row) => row.status === "QUEUED" || row.status === "RUNNING",
  );

  const mostRecent = rows[0] ?? null;
  const tooSoon =
    mostRecent !== null &&
    Date.now() - mostRecent.createdAt.getTime() < MIN_RERUN_GAP_MS &&
    mostRecent.status === "COMPLETED";

  return {
    site: project,
    audits,
    inFlight: inFlightRow
      ? { publicId: inFlightRow.publicId, status: inFlightRow.status }
      : null,
    canRerun: !inFlightRow && !tooSoon,
    rerunBlockedReason: inFlightRow
      ? "An audit is already running for this site."
      : tooSoon
        ? "This site was audited in the last half hour. Findings won't have changed yet."
        : null,
  };
}

/**
 * Queues a fresh audit for an owned project.
 *
 * Unlike the anonymous funnel audit this doesn't reuse a recent result — the
 * entire point of the action is to get a new measurement after making changes.
 * It does still refuse to stack duplicates.
 */
export async function rerunAudit(
  userId: string,
  projectId: string,
): Promise<{ publicId: string }> {
  const project = await assertOwnedProject(userId, projectId);

  const inFlight = await prisma.audit.findFirst({
    where: { projectId, status: { in: ["QUEUED", "RUNNING"] } },
    orderBy: { createdAt: "desc" },
    select: { publicId: true },
  });

  if (inFlight) {
    // Not an error — hand back the run that's already going.
    return { publicId: inFlight.publicId };
  }

  const subscription = await prisma.subscription.findUnique({
    where: { userId },
    select: { plan: true, status: true },
  });

  const audit = await prisma.audit.create({
    data: {
      domain: project.domain,
      publicId: randomId(12),
      status: "QUEUED",
      userId,
      projectId: project.id,
      // Owned from the start, unlike a funnel audit that gets claimed later.
      leadClaimed: true,
    },
    select: { id: true, publicId: true },
  });

  const job = await enqueue(
    JOB_TYPES.AUDIT_RUN,
    { auditId: audit.id, domain: project.domain },
    {
      // Paying customers jump ahead of the anonymous free queue.
      priority: queuePriorityFor((subscription?.plan as PlanId | undefined) ?? null),
      maxAttempts: 2,
    },
  );

  await prisma.audit.update({ where: { id: audit.id }, data: { jobId: job.id } });

  return { publicId: audit.publicId };
}
