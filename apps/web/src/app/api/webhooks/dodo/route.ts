import { billing, toAppError } from "@theseosaas/core";
import { NextResponse, type NextRequest } from "next/server";

/**
 * POST /api/webhooks/dodo
 *
 * Not wrapped in the usual `handler()`/`ok()` pair from route-helpers: Dodo
 * doesn't care about our `{ data }` / `{ error }` envelope, it only cares
 * about the status code, and retries anything outside 2xx. So this route
 * talks in plain NextResponses, same precedent as the magic-link consume
 * route.
 *
 * The raw body is read with `request.text()`, never `request.json()` — the
 * signature is computed over the exact bytes Dodo sent, and re-serialising a
 * parsed object would produce a different string and fail verification.
 */
export async function POST(request: NextRequest) {
  const rawBody = await request.text();

  const headers = {
    id: request.headers.get("webhook-id"),
    timestamp: request.headers.get("webhook-timestamp"),
    signature: request.headers.get("webhook-signature"),
  };

  try {
    const result = await billing.processWebhookEvent(rawBody, headers);
    return NextResponse.json({ received: true, type: result.type, skipped: result.skipped });
  } catch (error) {
    const appError = toAppError(error);

    // Bad signature / malformed payload: Dodo would just retry into the same
    // failure, so surface 400/401 as-is rather than masking it as a 500 that
    // implies "try again later".
    if (appError.code === "BAD_REQUEST" || appError.code === "UNAUTHORIZED") {
      console.error("[webhooks/dodo] rejected delivery:", appError.message);
      return NextResponse.json({ error: appError.message }, { status: appError.status });
    }

    // Anything else (DB hiccup, transient Dodo API call during processing) is
    // worth a retry — Dodo backs off automatically for up to 8 attempts.
    console.error("[webhooks/dodo] processing failed:", appError.cause ?? appError);
    return NextResponse.json({ error: "Processing failed." }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";
