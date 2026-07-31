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

  /**
   * One click, one post — not the brief-then-approve flow the API still
   * models internally.
   *
   * The brief is free and returns inline, so nothing is lost by writing it
   * and immediately queuing the full post rather than making the user look at
   * an outline and press a second button — that intermediate approval step
   * only made sense back when every user saw it for free before deciding
   * whether to spend a post on it. Now the app is subscriber-only end to end,
   * so "write a blog post" can just mean write a blog post.
   *
   * Returns the new post's id so the caller can navigate straight to it — the
   * detail page's own polling picks up from "GENERATING" and shows the rest.
   */
  const writeMutation = useMutation(
    async (opportunityId: string) => {
      const brief = await contentApi.createBrief(projectId, opportunityId);
      const { contentId } = await contentApi.writePost(projectId, brief.id);
      return contentId;
    },
    { onSuccess: () => refetch() },
  );

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

    writePost: writeMutation.mutate,
    isWritingPost: writeMutation.isLoading,
    writeError: writeMutation.message,
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
