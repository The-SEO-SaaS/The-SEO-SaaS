"use client";

import { useQuery } from "@/hooks/use-request";
import { accountApi, type AccountSummary } from "@/lib/api";

export function useAccount() {
  const { data, isLoading, isError, message, refetch } = useQuery<AccountSummary>(
    (signal) => accountApi.summary(signal),
    [],
  );

  return { summary: data, isLoading, isError, errorMessage: message, refetch };
}
