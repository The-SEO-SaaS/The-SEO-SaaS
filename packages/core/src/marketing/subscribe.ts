import prisma from "@theseosaas/db";
import { z } from "zod";

import { emailSchema } from "../auth/magic-link.ts";
import { consumeRateLimit } from "../ratelimit.ts";

/**
 * Newsletter capture for the marketing footer.
 *
 * The form has always been there and has always thrown away what people typed —
 * `onSubmit={(event) => event.preventDefault()}` and nothing else. Asking for
 * an address and discarding it is worse than not asking.
 *
 * Nothing sends to this list yet, and the UI doesn't claim otherwise. It says
 * "monthly field notes", which is a statement of intent rather than a promise
 * of a message tomorrow.
 */

export const subscribeSchema = z.object({
  email: emailSchema,
  /** Where the capture happened. Free-form so a new form needs no migration. */
  source: z.string().min(1).max(40).default("footer"),
});

/** Per-IP ceiling. A public unauthenticated write needs one. */
const RATE_LIMIT = { limit: 5, windowMs: 1000 * 60 * 60 };

export async function subscribe(
  input: { email: string; source?: string },
  meta: { ipAddress?: string | null } = {},
): Promise<{ ok: true }> {
  const parsed = subscribeSchema.parse(input);

  if (meta.ipAddress) {
    await consumeRateLimit(
      `subscribe:ip:${meta.ipAddress}`,
      RATE_LIMIT,
      "That's a few sign-ups from here already. Try again a bit later.",
    );
  }

  /**
   * Idempotent by design. Submitting twice is a normal thing for a person to
   * do — they don't remember, or the first click didn't visibly succeed — and
   * it should never surface as an error.
   *
   * The update is deliberately empty rather than refreshing `createdAt` or
   * clearing `unsubscribedAt`: re-entering an address in a footer form is not
   * informed consent to restart mail to someone who previously opted out. That
   * has to be an explicit action.
   */
  await prisma.subscriber.upsert({
    where: { email: parsed.email },
    create: { email: parsed.email, source: parsed.source },
    update: {},
  });

  return { ok: true };
}
