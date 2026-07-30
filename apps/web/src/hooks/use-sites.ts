"use client";

import * as React from "react";

import { useQuery } from "@/hooks/use-request";
import { sitesApi, type SiteDashboard, type SiteSummary, type AddSiteQuota } from "@/lib/api";

/**
 * Every site the signed-in user owns, for the dashboard's switcher.
 *
 * Fetched once at the dashboard layout level and shared down, rather than
 * per-page, so switching sites doesn't re-fetch the list every time.
 */
export function useSites() {
  const { data, isLoading, isError, message, refetch } = useQuery<{
    sites: SiteSummary[];
    addSiteQuota: AddSiteQuota;
  }>((signal) => sitesApi.list(signal), []);

  return {
    sites: data?.sites ?? [],
    addSiteQuota: data?.addSiteQuota ?? null,
    isLoading,
    isError,
    errorMessage: message,
    refetch,
  };
}

/** The full dashboard payload for one site. */
export function useSiteDashboard(projectId: string | null) {
  const { data, isLoading, isError, message, refetch } = useQuery<SiteDashboard>(
    (signal) => sitesApi.dashboard(projectId as string, signal),
    [projectId],
    { enabled: Boolean(projectId) },
  );

  return { dashboard: data, isLoading, isError, errorMessage: message, refetch };
}

/** Persists the last-viewed site across visits, scoped per browser. */
const LAST_SITE_KEY = "theseosaas:last-site-id";

export function rememberLastSiteId(id: string) {
  try {
    window.localStorage.setItem(LAST_SITE_KEY, id);
  } catch {
    // Storage can be unavailable (private mode, quota) — losing this is fine.
  }
}

export function useLastSiteId(): string | null {
  const [id, setId] = React.useState<string | null>(null);

  React.useEffect(() => {
    try {
      setId(window.localStorage.getItem(LAST_SITE_KEY));
    } catch {
      setId(null);
    }
  }, []);

  return id;
}
