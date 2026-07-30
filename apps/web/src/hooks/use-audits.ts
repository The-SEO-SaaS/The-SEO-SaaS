"use client";

import * as React from "react";

import { useMutation, useQuery } from "@/hooks/use-request";
import { auditHistoryApi, type AuditHistory } from "@/lib/api";

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

  const hasInFlight = Boolean(data?.inFlight);

  React.useEffect(() => {
    if (!hasInFlight) return;

    const timer = setInterval(() => refetch(), 5000);
    return () => clearInterval(timer);
  }, [hasInFlight, refetch]);

  return {
    history: data,
    isLoading,
    isError,
    errorMessage: message,
    refetch,

    rerun: () => rerunMutation.mutate(undefined as never),
    isRerunning: rerunMutation.isLoading,
    rerunError: rerunMutation.message,
  };
}
