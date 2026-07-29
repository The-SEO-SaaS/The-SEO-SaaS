import prisma from "@theseosaas/db";

import { generateToken, hashToken } from "../util/crypto.js";

/**
 * Session management, hand-rolled.
 *
 * Design:
 *  - The token is opaque random bytes, not a JWT. That means sessions are
 *    revocable instantly (delete the row), which a stateless JWT can't do.
 *  - Only SHA-256(token) is stored. A read-only DB leak yields nothing
 *    replayable.
 *  - Sessions slide: any use within the refresh window extends expiry, so
 *    active users aren't logged out mid-work.
 */

export const SESSION_COOKIE_NAME = "seo_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 days
/** Extend expiry once a session is more than halfway to expiring. */
const SESSION_REFRESH_THRESHOLD_MS = SESSION_TTL_MS / 2;

export interface SessionMeta {
  ipAddress?: string | null;
  userAgent?: string | null;
}

export interface CreatedSession {
  /** Raw token — returned once, set as a cookie, never retrievable again. */
  token: string;
  sessionId: string;
  expiresAt: Date;
}

export async function createSession(
  userId: string,
  meta: SessionMeta = {},
): Promise<CreatedSession> {
  const token = generateToken();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  const session = await prisma.session.create({
    data: {
      tokenHash: hashToken(token),
      userId,
      expiresAt,
      ipAddress: meta.ipAddress ?? null,
      userAgent: meta.userAgent?.slice(0, 512) ?? null,
    },
    select: { id: true },
  });

  return { token, sessionId: session.id, expiresAt };
}

export interface ActiveSession {
  sessionId: string;
  expiresAt: Date;
  user: {
    id: string;
    email: string;
    name: string | null;
    emailVerifiedAt: Date | null;
  };
}

/**
 * Validates a raw token. Returns null for missing, unknown, or expired
 * sessions — callers should treat all three identically.
 */
export async function validateSessionToken(
  token: string | undefined | null,
): Promise<ActiveSession | null> {
  if (!token) return null;

  const session = await prisma.session.findUnique({
    where: { tokenHash: hashToken(token) },
    select: {
      id: true,
      expiresAt: true,
      user: {
        select: { id: true, email: true, name: true, emailVerifiedAt: true },
      },
    },
  });

  if (!session) return null;

  if (session.expiresAt.getTime() <= Date.now()) {
    // Opportunistic cleanup so expired rows don't accumulate between sweeps.
    await prisma.session.delete({ where: { id: session.id } }).catch(() => {});
    return null;
  }

  let expiresAt = session.expiresAt;
  const remaining = expiresAt.getTime() - Date.now();

  if (remaining < SESSION_REFRESH_THRESHOLD_MS) {
    expiresAt = new Date(Date.now() + SESSION_TTL_MS);
    await prisma.session
      .update({
        where: { id: session.id },
        data: { expiresAt, lastUsedAt: new Date() },
      })
      .catch(() => {});
  }

  return { sessionId: session.id, expiresAt, user: session.user };
}

/** Sign out of one device. */
export async function invalidateSession(sessionId: string): Promise<void> {
  await prisma.session.deleteMany({ where: { id: sessionId } });
}

/** Sign out everywhere — used after a password change or reset. */
export async function invalidateAllSessions(userId: string): Promise<void> {
  await prisma.session.deleteMany({ where: { userId } });
}

/** Housekeeping, safe to run on a schedule. */
export async function deleteExpiredSessions(): Promise<number> {
  const { count } = await prisma.session.deleteMany({
    where: { expiresAt: { lte: new Date() } },
  });
  return count;
}

/**
 * Cookie attributes. Returned as plain data so this module stays free of any
 * framework import — apps/web applies them, and a Hono server could too.
 */
export function sessionCookieOptions(expiresAt: Date, isProduction: boolean) {
  return {
    name: SESSION_COOKIE_NAME,
    httpOnly: true,
    // `lax` still sends the cookie on top-level navigation, which matters
    // because users arrive from shared audit links and email.
    sameSite: "lax" as const,
    secure: isProduction,
    path: "/",
    expires: expiresAt,
  };
}

export function clearedSessionCookieOptions(isProduction: boolean) {
  return {
    name: SESSION_COOKIE_NAME,
    value: "",
    httpOnly: true,
    sameSite: "lax" as const,
    secure: isProduction,
    path: "/",
    maxAge: 0,
  };
}
