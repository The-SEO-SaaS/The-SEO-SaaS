import { env } from "@theseosaas/env/server";

import { AppError } from "../errors.ts";
import { request } from "../http/index.ts";

/**
 * Dodo Payments client.
 *
 * Hand-rolled against the REST API rather than using the `dodopayments` SDK,
 * consistent with the rest of this codebase — it's three endpoints, and it
 * keeps the retry/timeout behaviour identical to every other provider call.
 *
 * Uses Checkout Sessions (`POST /checkouts`), not `POST /subscriptions`: the
 * latter is deprecated in Dodo's own docs.
 */

const BASE_URL: Record<string, string> = {
  test_mode: "https://test.dodopayments.com",
  live_mode: "https://live.dodopayments.com",
};

function baseUrl(): string {
  return BASE_URL[env.DODO_ENVIRONMENT] ?? BASE_URL.test_mode!;
}

function apiKey(): string {
  if (!env.DODO_API_KEY) {
    throw AppError.internal("Billing isn't configured. DODO_API_KEY is missing.");
  }
  // Trimmed because the usual way this key arrives is a copy-paste into a
  // hosting dashboard, and a trailing newline or space rides along invisibly.
  // The header then carries it verbatim and Dodo rejects the whole request as
  // a 401 — indistinguishable, from the outside, from a genuinely wrong key.
  return env.DODO_API_KEY.trim();
}

function headers(): Record<string, string> {
  return { authorization: `Bearer ${apiKey()}` };
}

/**
 * Turns Dodo's bare 401 into something that names the two things that
 * actually cause it.
 *
 * A 401 means the key was rejected before Dodo looked at anything else — so
 * it is never a product problem, however much it looks like one when all six
 * products fail at once. It is either the wrong key, or the right key pointed
 * at the wrong environment: test and live keys are not interchangeable across
 * `test.dodopayments.com` and `live.dodopayments.com`.
 */
function explainAuthFailure(error: unknown): unknown {
  if (error instanceof AppError && error.details?.status === 401) {
    const key = env.DODO_API_KEY ?? "";
    // Dodo's own error body is already captured by the http layer; it names
    // the reason far better than we can infer it.
    const body = typeof error.details.body === "string" ? error.details.body : "";

    return AppError.internal(
      `Dodo rejected the API key (401) at ${baseUrl()}. ` +
        `DODO_ENVIRONMENT is "${env.DODO_ENVIRONMENT}", so this must be a ` +
        `${env.DODO_ENVIRONMENT === "live_mode" ? "live" : "test"}-mode key from ` +
        `Developer → API Keys with write access enabled. ` +
        `Key: ${key.length} chars, starts "${key.trim().slice(0, 6)}…"` +
        `${key.length !== key.trim().length ? ", HAS SURROUNDING WHITESPACE" : ""}.` +
        (body ? ` Dodo said: ${body}` : ""),
      { cause: error },
    );
  }
  return error;
}

// --- Checkout --------------------------------------------------------------

export interface CreateCheckoutInput {
  productId: string;
  /** Existing Dodo customer, when we've seen this user before. */
  customerId?: string | null;
  email: string;
  name?: string | null;
  returnUrl: string;
  cancelUrl: string;
  /**
   * Echoed back on every webhook for this subscription. We put our own userId
   * here so a webhook can be resolved to an account without depending on email
   * matching, which breaks the moment someone changes their address.
   */
  metadata: Record<string, string>;
}

interface CheckoutSessionResponse {
  session_id: string;
  checkout_url: string | null;
}

export async function createCheckoutSession(
  input: CreateCheckoutInput,
): Promise<{ sessionId: string; checkoutUrl: string }> {
  const { data } = await request<CheckoutSessionResponse>(`${baseUrl()}/checkouts`, {
    method: "POST",
    provider: "dodo",
    headers: headers(),
    body: {
      product_cart: [{ product_id: input.productId.trim(), quantity: 1 }],
      // Attach to an existing customer when known, so Dodo doesn't create a
      // duplicate and the customer portal keeps one billing history.
      customer: input.customerId
        ? { customer_id: input.customerId }
        : { email: input.email, name: input.name ?? undefined },
      return_url: input.returnUrl,
      cancel_url: input.cancelUrl,
      metadata: input.metadata,
      feature_flags: {
        // The email is already verified on our side; letting them edit it here
        // would decouple the Dodo customer from the account.
        allow_customer_editing_email: false,
        allow_discount_code: true,
      },
    },
    // Creating a checkout twice would show the user two payment pages, so a
    // blind retry is worse than surfacing the failure.
    retries: 0,
    timeoutMs: 20_000,
  }).catch((error: unknown) => {
    throw explainAuthFailure(error);
  });

  if (!data.checkout_url) {
    throw AppError.upstream("Dodo didn't return a checkout URL.");
  }

  return { sessionId: data.session_id, checkoutUrl: data.checkout_url };
}

// --- Customer portal -------------------------------------------------------

interface PortalSessionResponse {
  link: string;
}

/**
 * Hosted portal for changing card details, downloading invoices and cancelling.
 *
 * Using Dodo's portal rather than building our own billing UI: they're the
 * merchant of record, so invoices and tax documents live on their side anyway.
 */
export async function createPortalSession(customerId: string): Promise<string> {
  const { data } = await request<PortalSessionResponse>(
    `${baseUrl()}/customers/${customerId}/customer-portal/session`,
    { method: "POST", provider: "dodo", headers: headers(), retries: 1 },
  );

  if (!data.link) throw AppError.upstream("Dodo didn't return a portal link.");
  return data.link;
}

// --- Subscription read -----------------------------------------------------

export interface DodoSubscription {
  subscription_id: string;
  product_id: string;
  status: string;
  customer: { customer_id: string; email: string; name?: string | null };
  previous_billing_date?: string | null;
  next_billing_date?: string | null;
  cancel_at_next_billing_date?: boolean | null;
  cancelled_at?: string | null;
  metadata?: Record<string, string> | null;
}

/**
 * Fetches current state from Dodo.
 *
 * Used as the reconciliation path: webhooks can arrive out of order, so when a
 * payload looks stale we re-read the authoritative record instead of trusting
 * event sequence.
 */
export async function getSubscription(subscriptionId: string): Promise<DodoSubscription> {
  const { data } = await request<DodoSubscription>(
    `${baseUrl()}/subscriptions/${subscriptionId}`,
    { method: "GET", provider: "dodo", headers: headers(), retries: 2 },
  );
  return data;
}
