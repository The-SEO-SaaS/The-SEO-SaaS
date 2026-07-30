import prisma from "@theseosaas/db";
import { env } from "@theseosaas/env/server";
import { z } from "zod";

import { AppError } from "../errors.js";
import { createCheckoutSession, createPortalSession, type DodoSubscription } from "./dodo.js";
import { PLANS, planFromProductId, productIdFor, type BillingInterval, type PlanId } from "./plans.js";
import { verifyWebhook, type WebhookHeaders } from "./webhook-verify.js";

/**
 * Ties the Dodo REST client and the Standard Webhooks verifier to our own
 * Subscription table. Route handlers call only what's exported here — neither
 * `dodo.ts` nor `webhook-verify.ts` is ever imported directly from apps/web.
 */

// --- Checkout ----------------------------------------------------------------

export const createCheckoutSchema = z.object({
  plan: z.enum(["STARTER", "GROWTH", "SCALE"]),
  interval: z.enum(["MONTHLY", "YEARLY"]).default("MONTHLY"),
  returnPath: z.string().startsWith("/").optional(),
  cancelPath: z.string().startsWith("/").optional(),
});

export interface CreateCheckoutParams {
  userId: string;
  email: string;
  name?: string | null;
  plan: PlanId;
  interval: BillingInterval;
  /** Defaults to the onboarding plan step; billing/account pages pass their own. */
  returnPath?: string;
  cancelPath?: string;
}

export async function createCheckout(
  params: CreateCheckoutParams,
): Promise<{ checkoutUrl: string }> {
  const { userId, email, name } = params;
  const { plan, interval, returnPath: parsedReturnPath, cancelPath: parsedCancelPath } =
    createCheckoutSchema.parse({
      plan: params.plan,
      interval: params.interval,
      returnPath: params.returnPath,
      cancelPath: params.cancelPath,
    });
  const productId = productIdFor(plan, interval);

  // Reuse the existing Dodo customer if this user has ever subscribed before,
  // so the portal shows one continuous billing history instead of a fresh
  // customer per plan change.
  const existing = await prisma.subscription.findUnique({
    where: { userId },
    select: { dodoCustomerId: true },
  });

  const returnPath = parsedReturnPath ?? "/onboarding/complete";
  const cancelPath = parsedCancelPath ?? "/onboarding";

  const { checkoutUrl } = await createCheckoutSession({
    productId,
    customerId: existing?.dodoCustomerId ?? null,
    email,
    name,
    returnUrl: new URL(returnPath, env.APP_URL).toString(),
    cancelUrl: new URL(cancelPath, env.APP_URL).toString(),
    // Echoed back on every webhook for this subscription — this is the only
    // reliable way to resolve a Dodo event back to our own user, since email
    // can change and Dodo's customer_id doesn't exist until checkout completes.
    metadata: { userId },
  });

  return { checkoutUrl };
}

// --- Portal --------------------------------------------------------------

export async function createPortalLink(userId: string): Promise<string> {
  const subscription = await prisma.subscription.findUnique({
    where: { userId },
    select: { dodoCustomerId: true },
  });

  if (!subscription?.dodoCustomerId) {
    throw AppError.badRequest("You don't have a billing account yet. Choose a plan first.");
  }

  return createPortalSession(subscription.dodoCustomerId);
}

// --- Reads -----------------------------------------------------------------

export async function getSubscriptionForUser(userId: string) {
  const subscription = await prisma.subscription.findUnique({ where: { userId } });
  if (!subscription) return null;

  return {
    ...subscription,
    planDetails: PLANS[subscription.plan as PlanId],
  };
}

// --- Webhooks ----------------------------------------------------------------

type SubscriptionStatusLiteral = "ACTIVE" | "PAST_DUE" | "CANCELED" | "PAUSED" | "INCOMPLETE";

interface DodoWebhookEnvelope {
  business_id: string;
  type: string;
  timestamp: string;
  data: DodoSubscription & { payload_type?: string; status?: string };
}

/**
 * Best-effort mapping from Dodo's free-text status string to our enum.
 *
 * Used only as a fallback for `subscription.updated`, where the event name
 * itself doesn't say what changed. Every other event type carries its own
 * unambiguous status via the event name, so this is intentionally lenient
 * rather than an exhaustive switch that breaks the moment Dodo adds a value.
 */
function mapDodoStatus(raw: string): SubscriptionStatusLiteral | null {
  const normalized = raw.toLowerCase();
  if (normalized.includes("active") || normalized.includes("renew")) return "ACTIVE";
  if (normalized.includes("hold") || normalized.includes("past")) return "PAST_DUE";
  if (normalized.includes("cancel") || normalized.includes("expired")) return "CANCELED";
  if (normalized.includes("pause")) return "PAUSED";
  if (normalized.includes("pending") || normalized.includes("incomplete") || normalized.includes("fail")) {
    return "INCOMPLETE";
  }
  return null;
}

/**
 * Creates or updates the local Subscription row from a Dodo subscription
 * payload. `status` is left undefined to mean "don't touch it" on an update —
 * used by subscription.update_payment_method-adjacent paths that carry no
 * reliable status signal.
 */
async function upsertSubscriptionFromWebhook(
  data: DodoSubscription,
  status: SubscriptionStatusLiteral | undefined,
): Promise<void> {
  const userId = data.metadata?.userId;
  if (!userId) {
    // Can't resolve to an account without the metadata we set at checkout.
    // Throwing here would just get retried into the same dead end 8 times, so
    // log and move on instead.
    console.error(
      `[billing] webhook for subscription ${data.subscription_id} has no metadata.userId — skipping`,
    );
    return;
  }

  const resolved = planFromProductId(data.product_id);

  await prisma.subscription.upsert({
    where: { userId },
    create: {
      userId,
      plan: resolved?.plan ?? "STARTER",
      interval: resolved?.interval ?? "MONTHLY",
      status: status ?? "INCOMPLETE",
      dodoCustomerId: data.customer?.customer_id ?? null,
      dodoSubscriptionId: data.subscription_id,
      dodoProductId: data.product_id,
      currentPeriodStart: data.previous_billing_date ? new Date(data.previous_billing_date) : null,
      currentPeriodEnd: data.next_billing_date ? new Date(data.next_billing_date) : null,
      cancelAtPeriodEnd: data.cancel_at_next_billing_date ?? false,
      canceledAt: data.cancelled_at ? new Date(data.cancelled_at) : null,
    },
    update: {
      ...(resolved ? { plan: resolved.plan, interval: resolved.interval } : {}),
      ...(status ? { status } : {}),
      dodoCustomerId: data.customer?.customer_id ?? undefined,
      dodoSubscriptionId: data.subscription_id,
      dodoProductId: data.product_id,
      currentPeriodStart: data.previous_billing_date ? new Date(data.previous_billing_date) : undefined,
      currentPeriodEnd: data.next_billing_date ? new Date(data.next_billing_date) : undefined,
      cancelAtPeriodEnd: data.cancel_at_next_billing_date ?? undefined,
      canceledAt: data.cancelled_at ? new Date(data.cancelled_at) : undefined,
    },
  });
}

/**
 * Applies one verified webhook event to our data model.
 *
 * Deliberately not exhaustive over every Dodo event type — payment, refund and
 * dispute events are accepted (and recorded, for idempotency) but don't touch
 * Subscription yet, since nothing in the product depends on them today.
 */
async function dispatch(envelope: DodoWebhookEnvelope): Promise<void> {
  const { type, data } = envelope;

  switch (type) {
    case "subscription.active":
    case "subscription.renewed":
    case "subscription.plan_changed":
      await upsertSubscriptionFromWebhook(data, "ACTIVE");
      break;

    case "subscription.on_hold":
      await upsertSubscriptionFromWebhook(data, "PAST_DUE");
      break;

    case "subscription.cancelled":
    case "subscription.expired":
      await upsertSubscriptionFromWebhook(data, "CANCELED");
      break;

    case "subscription.failed":
      // Mandate creation failed before the subscription ever went active —
      // there is usually no local row yet. If one somehow exists, correct it.
      if (data.metadata?.userId) {
        await prisma.subscription.updateMany({
          where: { userId: data.metadata.userId },
          data: { status: "INCOMPLETE" },
        });
      }
      break;

    case "subscription.updated":
      await upsertSubscriptionFromWebhook(data, data.status ? (mapDodoStatus(data.status) ?? undefined) : undefined);
      break;

    case "subscription.update_payment_method":
      // Card details live entirely on Dodo's side; nothing local to sync.
      break;

    default:
      // payment.*, refund.*, dispute.* etc. — no-op today.
      break;
  }
}

export interface ProcessWebhookResult {
  type: string;
  /** True when this delivery had already been fully processed (a retry). */
  skipped: boolean;
}

/**
 * Verifies, de-duplicates, and applies one webhook delivery.
 *
 * Idempotency: the `WebhookEvent` row is created (or found) *before* dispatch
 * runs. If dispatch throws, `failedAt`/`lastError` are recorded and the error
 * is rethrown so the route returns a non-2xx and Dodo retries the same
 * `webhook-id` — at which point this function finds the existing unprocessed
 * row and tries again, rather than treating the retry as a duplicate.
 */
export async function processWebhookEvent(
  rawBody: string,
  headers: WebhookHeaders,
): Promise<ProcessWebhookResult> {
  const payload = verifyWebhook<DodoWebhookEnvelope>(rawBody, headers);
  const eventId = headers.id as string; // verifyWebhook throws if this is null.

  const existing = await prisma.webhookEvent.findUnique({
    where: { provider_eventId: { provider: "dodo", eventId } },
    select: { id: true, processedAt: true },
  });

  if (existing?.processedAt) {
    return { type: payload.type, skipped: true };
  }

  const record = existing
    ? await prisma.webhookEvent.update({
        where: { id: existing.id },
        data: { type: payload.type, payload: JSON.parse(rawBody) },
      })
    : await prisma.webhookEvent.create({
        data: {
          provider: "dodo",
          eventId,
          type: payload.type,
          payload: JSON.parse(rawBody),
        },
      });

  try {
    await dispatch(payload);
    await prisma.webhookEvent.update({
      where: { id: record.id },
      data: { processedAt: new Date(), failedAt: null, lastError: null },
    });
  } catch (error) {
    await prisma.webhookEvent.update({
      where: { id: record.id },
      data: {
        failedAt: new Date(),
        lastError: error instanceof Error ? error.message.slice(0, 1000) : "Unknown error",
      },
    });
    throw error;
  }

  return { type: payload.type, skipped: false };
}
