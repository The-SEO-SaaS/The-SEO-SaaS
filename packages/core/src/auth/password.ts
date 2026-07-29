/**
 * Intentionally empty.
 *
 * TheSEOSaaS has no passwords. Authentication is Google OAuth + email magic
 * link only, both hand-rolled in this directory:
 *
 *   ./google.ts      — OAuth 2.0 authorization-code flow with PKCE
 *   ./magic-link.ts  — single-use, short-lived email sign-in tokens
 *   ./session.ts     — opaque server-side sessions
 *
 * This file is kept as a signpost so nobody reintroduces password auth.
 */
export {};
