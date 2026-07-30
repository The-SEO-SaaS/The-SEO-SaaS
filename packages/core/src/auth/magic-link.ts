import prisma from "@theseosaas/db";
import { env } from "@theseosaas/env/server";
import { z } from "zod";

import { AppError } from "../errors.ts";
import { sendMagicLinkEmail } from "../mail/index.ts";
import { consumeRateLimit } from "../ratelimit.ts";
import { generateToken, hashToken } from "../util/crypto.ts";
import { createSession, type CreatedSession, type SessionMeta } from "./session.ts";

/**
 * Passwordless email sign-in.
 *
 * Properties we care about:
 *  - Single use. Consumption is an atomic conditional update, so a link
 *    forwarded or prefetched twice can't mint two sessions.
 *  - Short-lived (15 min).
 *  - Only one outstanding link per address — requesting a new one voids the old.
 *  - Stored hashed, so a DB leak yields no usable links.
 *  - Enumeration-safe: the request endpoint responds identically whether or
 *    not an account exists.
 */

const MAGIC_LINK_TTL_MS = 1000 * 60 * 15;

/** Email is cheap to send but expensive to be blamed for. Keep this tight. */
const RATE_LIMIT_PER_EMAIL = { limit: 5, windowMs: 1000 * 60 * 60 };
const RATE_LIMIT_PER_IP = { limit: 15, windowMs: 1000 * 60 * 60 };

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3)
  .max(254)
  .email("Enter a valid email address.");

export const requestMagicLinkSchema = z.object({
  email: emailSchema,
  /**
   * Path to return to after sign-in, e.g. the audit report the user was
   * reading when they hit the paywall. Validated as a relative path so this
   * can't be turned into an open redirect.
   */
  redirectTo: z.string().max(512).optional(),
});

export type RequestMagicLinkInput = z.infer<typeof requestMagicLinkSchema>;

/** Only same-origin, non-protocol-relative paths survive this. */
export function sanitizeRedirect(redirectTo: string | undefined | null): string | null {
  if (!redirectTo) return null;
  if (!redirectTo.startsWith("/")) return null;
  if (redirectTo.startsWith("//")) return null;
  return redirectTo;
}

export interface RequestMagicLinkResult {
  /** Always true. Never reveals whether the address has an account. */
  sent: boolean;
  expiresAt: Date;
}

export async function requestMagicLink(
  input: RequestMagicLinkInput,
  meta: { ipAddress?: string | null } = {},
): Promise<RequestMagicLinkResult> {
  const { email, redirectTo } = requestMagicLinkSchema.parse(input);

  await consumeRateLimit(`magic-link:email:${email}`, RATE_LIMIT_PER_EMAIL);
  if (meta.ipAddress) {
    await consumeRateLimit(`magic-link:ip:${meta.ipAddress}`, RATE_LIMIT_PER_IP);
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, name: true },
  });

  const token = generateToken();
  const expiresAt = new Date(Date.now() + MAGIC_LINK_TTL_MS);

  // Void any outstanding link for this address before issuing a new one.
  await prisma.authToken.deleteMany({
    where: { email, type: "MAGIC_LINK", consumedAt: null },
  });

  await prisma.authToken.create({
    data: {
      tokenHash: hashToken(token),
      type: "MAGIC_LINK",
      email,
      userId: user?.id ?? null,
      expiresAt,
      redirectTo: sanitizeRedirect(redirectTo),
      requestIp: meta.ipAddress ?? null,
    },
  });

  // Points straight at the API route, which consumes the token and redirects.
  // A visible page in between would only add a hop for the user to watch.
  const url = new URL("/api/auth/magic-link/consume", env.APP_URL);
  url.searchParams.set("token", token);

  await sendMagicLinkEmail({
    to: email,
    url: url.toString(),
    isNewUser: !user,
    expiresInMinutes: Math.round(MAGIC_LINK_TTL_MS / 60_000),
  });

  return { sent: true, expiresAt };
}

export interface MagicLinkResult {
  user: { id: string; email: string; name: string | null };
  session: CreatedSession;
  isNewUser: boolean;
  redirectTo: string | null;
}

export async function consumeMagicLink(
  token: string,
  meta: SessionMeta = {},
): Promise<MagicLinkResult> {
  const tokenHash = hashToken(token);

  // Atomic single-use claim: `consumedAt: null` in the WHERE means a second
  // concurrent request matches zero rows and gets rejected. This is what stops
  // an email client's link prefetcher from burning the link before the user
  // clicks, or two tabs from both succeeding.
  const { count } = await prisma.authToken.updateMany({
    where: {
      tokenHash,
      type: "MAGIC_LINK",
      consumedAt: null,
      expiresAt: { gt: new Date() },
    },
    data: { consumedAt: new Date() },
  });

  if (count === 0) {
    throw AppError.badRequest("This sign-in link is invalid, expired, or already used.");
  }

  const record = await prisma.authToken.findUnique({
    where: { tokenHash },
    select: { email: true, userId: true, redirectTo: true },
  });

  if (!record) {
    throw AppError.badRequest("This sign-in link is no longer valid.");
  }

  // Clicking a magic link proves control of the address, so the account is
  // created here if it doesn't exist yet and is marked verified either way.
  const user = await prisma.user.upsert({
    where: { email: record.email },
    create: { email: record.email, emailVerifiedAt: new Date() },
    update: { emailVerifiedAt: new Date() },
    select: { id: true, email: true, name: true, createdAt: true },
  });

  return {
    user: { id: user.id, email: user.email, name: user.name },
    session: await createSession(user.id, meta),
    isNewUser: record.userId === null,
    redirectTo: record.redirectTo,
  };
}

/** Housekeeping, safe to run on a schedule alongside session cleanup. */
export async function deleteExpiredAuthTokens(): Promise<number> {
  const { count } = await prisma.authToken.deleteMany({
    where: { expiresAt: { lte: new Date() } },
  });
  return count;
}
