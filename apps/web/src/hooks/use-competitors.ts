"use client";

import { useMutation, useQuery } from "@/hooks/use-request";
import { competitorsApi, type CompetitorsPayload } from "@/lib/api";

export function useCompetitors(projectId: string) {
  const { data, isLoading, isError, message, refetch } = useQuery<CompetitorsPayload>(
    (signal) => competitorsApi.list(projectId, signal),
    [projectId],
  );

  const addMutation = useMutation(
    (input: { domain: string; name?: string }) => competitorsApi.add(projectId, input),
    { onSuccess: () => refetch() },
  );

  const removeMutation = useMutation(
    (competitorId: string) => competitorsApi.remove(projectId, competitorId),
    { onSuccess: () => refetch() },
  );

  return {
    payload: data,
    isLoading,
    isError,
    errorMessage: message,
    refetch,

    addCompetitor: addMutation.mutate,
    isAdding: addMutation.isLoading,
    addError: addMutation.message,

    removeCompetitor: removeMutation.mutate,
    isRemoving: removeMutation.isLoading,
    removeError: removeMutation.message,
  };
}
