"use client";

import { useRouter } from "next/navigation";
import * as React from "react";

import { useMutation, useQuery } from "@/hooks/use-request";
import { authApi, type SessionUser } from "@/lib/api";

/**
 * Session hooks.
 *
 * Read-only and unconditional: /api/auth/session returns `{ user: null }` when
 * signed out rather than erroring, so this is safe to call from public pages.
 */
export function useSession() {
  const { data, isLoading, refetch } = useQuery<{ user: SessionUser | null }>(
    (signal) => authApi.session(signal),
    [],
  );

  return {
    user: data?.user ?? null,
    isSignedIn: Boolean(data?.user),
    isLoading,
    refetch,
  };
}

export function useSignOut() {
  const router = useRouter();

  const mutation = useMutation(() => authApi.signOut(), {
    onSuccess: () => {
      // refresh() clears the router cache too — without it, server components
      // keep rendering the signed-in view after sign-out.
      router.push("/");
      router.refresh();
    },
  });

  return {
    signOut: () => mutation.mutate(undefined as never),
    isSigningOut: mutation.isLoading,
  };
}

/** Requests a magic link. Returns to the caller which address it was sent to. */
export function useMagicLink(redirectTo?: string) {
  const [sentTo, setSentTo] = React.useState<string | null>(null);

  const mutation = useMutation(
    (email: string) => authApi.requestMagicLink(email, redirectTo),
    { onSuccess: (_result, email) => setSentTo(email) },
  );

  return {
    requestLink: mutation.mutate,
    isSending: mutation.isLoading,
    error: mutation.message,
    sentTo,
    reset: () => {
      setSentTo(null);
      mutation.reset();
    },
  };
}
