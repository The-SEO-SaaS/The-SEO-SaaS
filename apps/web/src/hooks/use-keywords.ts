"use client";

import * as React from "react";

import { useMutation, useQuery } from "@/hooks/use-request";
import { keywordsApi, type KeywordIntent, type KeywordsPayload } from "@/lib/api";

/**
 * Keyword management for one site.
 *
 * Every mutation refetches rather than patching local state. The server owns
 * quota arithmetic and the freshly-triggered rank check, so trying to mirror
 * that optimistically would drift — and these are deliberate, low-frequency
 * actions where a brief refetch is invisible.
 */
export function useKeywords(projectId: string) {
  const { data, isLoading, isError, message, refetch } = useQuery<KeywordsPayload>(
    (signal) => keywordsApi.list(projectId, signal),
    [projectId],
  );

  const addMutation = useMutation(
    (input: { terms: string[]; intent?: KeywordIntent }) =>
      keywordsApi.add(projectId, input),
    { onSuccess: () => refetch() },
  );

  const trackGapsMutation = useMutation(
    (gapTerms: string[]) => keywordsApi.trackGaps(projectId, gapTerms),
    { onSuccess: () => refetch() },
  );

  const trackedMutation = useMutation(
    (input: { keywordId: string; isTracked: boolean }) =>
      keywordsApi.setTracked(projectId, input.keywordId, input.isTracked),
    { onSuccess: () => refetch() },
  );

  const removeMutation = useMutation(
    (keywordId: string) => keywordsApi.remove(projectId, keywordId),
    { onSuccess: () => refetch() },
  );

  return {
    payload: data,
    isLoading,
    isError,
    errorMessage: message,
    refetch,

    addKeywords: addMutation.mutate,
    isAdding: addMutation.isLoading,
    addError: addMutation.message,

    trackGaps: trackGapsMutation.mutate,
    isTrackingGaps: trackGapsMutation.isLoading,
    gapsError: trackGapsMutation.message,

    setTracked: React.useCallback(
      (keywordId: string, isTracked: boolean) =>
        trackedMutation.mutate({ keywordId, isTracked }),
      [trackedMutation],
    ),
    isUpdatingTracked: trackedMutation.isLoading,
    trackedError: trackedMutation.message,

    removeKeyword: removeMutation.mutate,
    isRemoving: removeMutation.isLoading,
    removeError: removeMutation.message,
  };
}
