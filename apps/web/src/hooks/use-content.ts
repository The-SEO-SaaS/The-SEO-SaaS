"use client";

import * as React from "react";

import { useMutation, useQuery } from "@/hooks/use-request";
import { contentApi, type ContentDetail, type ContentLibrary } from "@/lib/api";

/**
 * The content library for one site.
 *
 * Polls only while a post is being written. Generation is a single long model
 * call — a minute or more — so the row has to flip from "Writing…" to "Ready"
 * without the user reloading; but a permanent interval on a page someone
 * leaves open is wasted load, so it stops as soon as nothing is generating.
 */
export function useContentLibrary(projectId: string) {
  const { data, isLoading, isError, message, refetch } = useQuery<ContentLibrary>(
    (signal) => contentApi.library(projectId, signal),
    [projectId],
  );

  const briefMutation = useMutation(
    (opportunityId: string) => contentApi.createBrief(projectId, opportunityId),
    { onSuccess: () => refetch() },
  );

  const postMutation = useMutation((briefId: string) => contentApi.writePost(projectId, briefId), {
    onSuccess: () => refetch(),
  });

  const isGenerating = Boolean(data?.posts.some((post) => post.status === "GENERATING"));

  React.useEffect(() => {
    if (!isGenerating) return;

    const timer = setInterval(() => refetch(), 5000);
    return () => clearInterval(timer);
  }, [isGenerating, refetch]);

  return {
    library: data,
    isLoading,
    isError,
    errorMessage: message,
    refetch,

    createBrief: briefMutation.mutate,
    isCreatingBrief: briefMutation.isLoading,
    briefError: briefMutation.message,

    writePost: postMutation.mutate,
    isWritingPost: postMutation.isLoading,
    postError: postMutation.message,
  };
}

/** One brief or post. Polls while it's still being written. */
export function useContentItem(contentId: string) {
  const { data, isLoading, isError, message, refetch } = useQuery<ContentDetail>(
    (signal) => contentApi.item(contentId, signal),
    [contentId],
  );

  const isGenerating = data?.status === "GENERATING";

  React.useEffect(() => {
    if (!isGenerating) return;

    const timer = setInterval(() => refetch(), 4000);
    return () => clearInterval(timer);
  }, [isGenerating, refetch]);

  const statusMutation = useMutation(
    (status: "PUBLISHED" | "ARCHIVED" | "GENERATED") => contentApi.setStatus(contentId, status),
    { onSuccess: () => refetch() },
  );

  return {
    item: data,
    isLoading,
    isError,
    errorMessage: message,
    refetch,

    setStatus: statusMutation.mutate,
    isUpdatingStatus: statusMutation.isLoading,
  };
}
