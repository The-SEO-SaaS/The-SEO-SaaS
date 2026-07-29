"use client";

import { useRouter } from "next/navigation";
import * as React from "react";

import { useMutation, usePolling, useQuery } from "@/hooks/use-request";
import { auditApi, type AuditProgress, type AuditReport } from "@/lib/api";
import { isApiError } from "@/lib/api-client";

/**
 * Audit flow hooks.
 *
 * The flow spans three screens (landing → crawling → report) and a worker
 * process, so the state lives here rather than in any one page component.
 */

/** Landing page: submit a URL, then route to the crawl screen. */
export function useStartAudit() {
  const router = useRouter();

  const mutation = useMutation((domain: string) => auditApi.start(domain), {
    onSuccess: (result) => router.push(`/audit/${result.publicId}`),
  });

  return {
    startAudit: mutation.mutate,
    isStarting: mutation.isLoading,
    error: mutation.message,
    reset: mutation.reset,
  };
}

export type AuditPhase = "running" | "email-gate" | "report" | "failed";

/**
 * Drives the crawl screen and the transition into the report.
 *
 * The email gate sits between completion and the report — shown once, and
 * skippable. It's tracked in component state rather than the URL so a refresh
 * lands the user straight on the report they already earned, instead of
 * re-asking for an email they may have just declined to give.
 */
export function useAuditFlow(publicId: string) {
  const [gatePassed, setGatePassed] = React.useState(false);

  const progress = usePolling<AuditProgress>(
    (signal) => auditApi.progress(publicId, signal),
    (data) => data.status === "COMPLETED" || data.status === "FAILED",
    { intervalMs: 1500 },
  );

  const isComplete = progress.data?.status === "COMPLETED";
  const isFailed = progress.data?.status === "FAILED";

  // The report is only fetched once the audit finishes — polling it alongside
  // progress would repeatedly pull a large payload that isn't ready.
  const report = useQuery<AuditReport>(
    (signal) => auditApi.report(publicId, signal),
    [publicId, isComplete],
    { enabled: isComplete },
  );

  const phase: AuditPhase = isFailed
    ? "failed"
    : !isComplete
      ? "running"
      : gatePassed
        ? "report"
        : "email-gate";

  return {
    phase,
    progress: progress.data,
    report: report.data,
    isLoadingReport: report.isLoading,
    error: progress.error ? progress.message : report.isError ? report.message : null,
    gaveUp: progress.gaveUp,
    passGate: React.useCallback(() => setGatePassed(true), []),
  };
}

/**
 * Attaches a completed anonymous audit to the signed-in account.
 *
 * On success the user goes to onboarding, which is pre-filled from this
 * audit's findings — that's the whole point of claiming rather than asking
 * them to re-enter their domain and competitors.
 *
 * A 401 means the session expired between page load and click; rather than
 * showing an error, send them to sign in and return here.
 */
export function useClaimAudit(publicId: string) {
  const router = useRouter();

  const mutation = useMutation(() => auditApi.claim(publicId), {
    onSuccess: () => router.push("/onboarding"),
    onError: (error) => {
      if (isApiError(error) && error.isUnauthorized) {
        router.push(`/login?redirectTo=${encodeURIComponent(`/audit/${publicId}`)}`);
      }
    },
  });

  return {
    claim: () => mutation.mutate(undefined as never),
    isClaiming: mutation.isLoading,
    error: mutation.message,
  };
}
