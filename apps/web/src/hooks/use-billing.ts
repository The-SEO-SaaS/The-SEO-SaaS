"use client";

import { useMutation } from "@/hooks/use-request";
import { billingApi, type BillingInterval, type PlanId } from "@/lib/api";

/**
 * Billing hooks.
 *
 * Both checkout and the portal are full-page redirects to Dodo's hosted UI —
 * we never render a card form ourselves. Success here means "we got a URL",
 * not "the user paid"; the Subscription row only exists once the webhook
 * lands, which is why onboarding completion (`/onboarding/complete`) polls
 * rather than trusting the redirect alone.
 */
export function useCheckoutRedirect() {
  const mutation = useMutation(
    (input: {
      plan: PlanId;
      interval?: BillingInterval;
      returnPath?: string;
      cancelPath?: string;
    }) => billingApi.checkout(input),
    {
      onSuccess: (result) => {
        window.location.href = result.checkoutUrl;
      },
    },
  );

  return {
    startCheckout: mutation.mutate,
    isRedirecting: mutation.isLoading,
    error: mutation.message,
  };
}

/** Opens Dodo's hosted portal for card changes, invoices, and cancellation. */
export function usePortalRedirect() {
  const mutation = useMutation(() => billingApi.portal(), {
    onSuccess: (result) => {
      window.location.href = result.url;
    },
  });

  return {
    openPortal: () => mutation.mutate(undefined as never),
    isRedirecting: mutation.isLoading,
    error: mutation.message,
  };
}
