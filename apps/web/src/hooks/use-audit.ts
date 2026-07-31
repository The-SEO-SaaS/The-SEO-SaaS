"use client";

import { useRouter } from "next/navigation";
import * as React from "react";

import { trackEvent } from "@/components/analytics";
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
    onSuccess: (result) => {
      // Top of the funnel. `reused` separates a genuine new audit from a cache
      // hit on a domain someone already ran today — without it, a shared link
      // getting clicked ten times looks like ten conversions.
      trackEvent("audit_started", { reused: result.reused });
      router.push(`/audit/${result.publicId}`);
    },
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

  // Reported once per outcome, not once per poll — `usePolling` re-renders every
  // 1.5s and would otherwise fire an event on each tick after the terminal
  // state. The ref, not state, because this must not itself cause a render.
  const reported = React.useRef(false);

  React.useEffect(() => {
    if (reported.current) return;
    if (!isComplete && !isFailed) return;

    reported.current = true;
    trackEvent(isComplete ? "audit_completed" : "audit_failed", {
      // Pairs with audit_started's own duration, giving a real distribution of
      // how long people wait rather than the eight minutes the copy promises.
      step: progress.data?.currentStep ?? "unknown",
    });
  }, [isComplete, isFailed, progress.data?.currentStep]);

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
    /**
     * Surfaced separately from `error` so the report screen can tell "the fetch
     * failed" apart from "still loading". Merged into one field, a 500 on the
     * report endpoint rendered as an eternal spinner — the audit was finished
     * and readable, and the page just never said so.
     */
    reportError: report.isError ? report.message : null,
    retryReport: report.refetch,
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
