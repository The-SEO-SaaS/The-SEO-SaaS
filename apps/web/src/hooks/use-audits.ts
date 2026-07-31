"use client";

import * as React from "react";

import { useMutation, useQuery } from "@/hooks/use-request";
import { auditApi, auditHistoryApi, type AuditHistory, type AuditReport } from "@/lib/api";

/**
 * Audit history for one site, plus re-running.
 *
 * Polls while a run is in flight so the row flips to COMPLETED and the score
 * delta appears without the user reloading. Polling stops as soon as nothing
 * is running — an audit takes minutes, not hours, and a permanent interval on
 * a page someone leaves open is wasted load.
 */
export function useAudits(projectId: string) {
  const { data, isLoading, isError, message, refetch } = useQuery<AuditHistory>(
    (signal) => auditHistoryApi.list(projectId, signal),
    [projectId],
  );

  const rerunMutation = useMutation(() => auditHistoryApi.rerun(projectId), {
    onSuccess: () => refetch(),
  });

  // The design's audits screen is a detail view of the newest run, so the page
  // needs that run's findings as well as the list. Reusing the public report
  // endpoint avoids a second findings API; as the owner, the caller gets the
  // unlocked payload.
  const latestCompleted =
    data?.audits.find((entry) => entry.status === "COMPLETED") ?? null;

  // `latestCompleted` can still be null on the render that flips `enabled` to
  // true — `useQuery`'s effect keys off `[enabled, ...deps]`, and a refetch
  // that briefly clears `data` (a failed 5s poll while a run is in flight)
  // recomputes this as null on the same tick the previous `publicId` dep is
  // still in scope. The old `latestCompleted!.publicId` non-null assertion
  // crashed exactly there — "Cannot read properties of null (reading
  // 'publicId')" on the audits page. Checking here instead of asserting means
  // a stray invocation rejects the request instead of throwing past React.
  const report = useQuery<AuditReport>(
    (signal) =>
      latestCompleted
        ? auditApi.report(latestCompleted.publicId, signal)
        : Promise.reject(new Error("No completed audit to fetch yet")),
    [latestCompleted?.publicId],
    { enabled: Boolean(latestCompleted) },
  );

  const hasInFlight = Boolean(data?.inFlight);

  React.useEffect(() => {
    if (!hasInFlight) return;

    const timer = setInterval(() => refetch(), 5000);
    return () => clearInterval(timer);
  }, [hasInFlight, refetch]);

  return {
    history: data,
    latest: latestCompleted,
    report: report.data,
    isReportLoading: report.isLoading,
    isLoading,
    isError,
    errorMessage: message,
    refetch,

    rerun: () => rerunMutation.mutate(undefined as never),
    isRerunning: rerunMutation.isLoading,
    rerunError: rerunMutation.message,
  };
}
