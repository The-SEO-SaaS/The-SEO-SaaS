import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * Crypto primitives, built on node:crypto only — no auth library anywhere in
 * this codebase.
 */

/**
 * Cryptographically random, URL-safe token. 32 bytes = 256 bits of entropy,
 * which is the standard for a bearer-style session token.
 */
export function generateToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

/**
 * SHA-256 hex digest. Used for session and verification tokens.
 *
 * A plain hash is correct here (unlike for passwords): the input is already
 * high-entropy random, so there is nothing to brute-force, and we need the
 * lookup to be a fast indexed equality check on every request.
 */
export function hashToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

/** Constant-time string comparison, safe on length mismatch. */
export function safeCompare(a: string, b: string): boolean {
  const bufferA = Buffer.from(a, "utf8");
  const bufferB = Buffer.from(b, "utf8");
  if (bufferA.length !== bufferB.length) return false;
  return timingSafeEqual(bufferA, bufferB);
}

/** Short unguessable id, used for public shareable audit slugs. */
export function randomId(bytes = 12): string {
  return randomBytes(bytes).toString("base64url");
}
