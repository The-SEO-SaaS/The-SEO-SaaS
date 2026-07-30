import { createHash, randomBytes } from "node:crypto";

import { env } from "@theseosaas/env/server";

import { AppError } from "../errors.ts";
import { request } from "../http/index.ts";

/**
 * Google OAuth 2.0 — hand-rolled authorization-code flow with PKCE.
 *
 * No auth library. The whole flow is three steps:
 *   1. buildAuthorizationUrl()  → redirect the user to Google
 *   2. Google redirects back with ?code&state
 *   3. exchangeCodeForProfile() → verify state, swap code for an ID token
 *
 * `state` (CSRF) and the PKCE `code_verifier` are handed back to the caller as
 * plain values to store in short-lived httpOnly cookies. Keeping them in
 * cookies rather than the DB means no server state and no cleanup job.
 */

const GOOGLE_AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const GOOGLE_ISSUERS = new Set(["https://accounts.google.com", "accounts.google.com"]);

export const OAUTH_STATE_COOKIE = "seo_oauth_state";
export const OAUTH_VERIFIER_COOKIE = "seo_oauth_verifier";
export const OAUTH_REDIRECT_COOKIE = "seo_oauth_redirect";
/** The round trip to Google should take seconds, not minutes. */
export const OAUTH_COOKIE_MAX_AGE_SECONDS = 600;

export interface AuthorizationRequest {
  url: string;
  /** Store in an httpOnly cookie; compared against the `state` Google returns. */
  state: string;
  /** Store in an httpOnly cookie; sent to the token endpoint as proof. */
  codeVerifier: string;
}

function base64UrlEncode(buffer: Buffer): string {
  return buffer.toString("base64url");
}

/** PKCE S256 challenge: BASE64URL(SHA256(verifier)). */
function deriveCodeChallenge(verifier: string): string {
  return base64UrlEncode(createHash("sha256").update(verifier).digest());
}

export function buildAuthorizationUrl(options: { redirectUri: string; loginHint?: string }): AuthorizationRequest {
  const state = base64UrlEncode(randomBytes(32));
  const codeVerifier = base64UrlEncode(randomBytes(32));

  const url = new URL(GOOGLE_AUTH_ENDPOINT);
  url.searchParams.set("client_id", env.GOOGLE_CLIENT_ID);
  url.searchParams.set("redirect_uri", options.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("state", state);
  url.searchParams.set("code_challenge", deriveCodeChallenge(codeVerifier));
  url.searchParams.set("code_challenge_method", "S256");
  // We only need identity, so there's no refresh token to manage and no
  // consent screen on repeat sign-ins.
  url.searchParams.set("prompt", "select_account");
  if (options.loginHint) url.searchParams.set("login_hint", options.loginHint);

  return { url: url.toString(), state, codeVerifier };
}

interface GoogleTokenResponse {
  access_token: string;
  expires_in: number;
  id_token: string;
  scope: string;
  token_type: string;
}

interface GoogleIdTokenClaims {
  iss: string;
  aud: string;
  sub: string;
  exp: number;
  iat: number;
  email?: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
}

/**
 * Decodes the ID token payload.
 *
 * We deliberately do NOT verify the RS256 signature here. Per OpenID Connect
 * Core §3.1.3.7, an ID token received directly from the token endpoint over a
 * TLS-authenticated channel may be trusted without signature validation — the
 * TLS connection to oauth2.googleapis.com is itself the proof of origin. We
 * still validate issuer, audience, and expiry below, which is what actually
 * guards against a token minted for a different client.
 */
function decodeIdToken(idToken: string): GoogleIdTokenClaims {
  const segments = idToken.split(".");
  if (segments.length !== 3) {
    throw AppError.upstream("Google returned a malformed ID token.");
  }

  try {
    const payload = Buffer.from(segments[1]!, "base64url").toString("utf8");
    return JSON.parse(payload) as GoogleIdTokenClaims;
  } catch (cause) {
    throw AppError.upstream("Could not read Google's ID token.", { cause });
  }
}

function assertValidClaims(claims: GoogleIdTokenClaims): void {
  if (!GOOGLE_ISSUERS.has(claims.iss)) {
    throw AppError.upstream("Unexpected token issuer.");
  }
  if (claims.aud !== env.GOOGLE_CLIENT_ID) {
    throw AppError.upstream("This token was issued for a different application.");
  }
  if (claims.exp * 1000 <= Date.now()) {
    throw AppError.badRequest("Your Google sign-in expired. Please try again.");
  }
}

export interface GoogleProfile {
  providerAccountId: string;
  email: string;
  emailVerified: boolean;
  name: string | null;
  image: string | null;
}

export interface ExchangeInput {
  code: string;
  /** `state` from the callback query string. */
  returnedState: string;
  /** `state` read back out of the cookie we set before redirecting. */
  expectedState: string | undefined;
  codeVerifier: string | undefined;
  redirectUri: string;
}

export async function exchangeCodeForProfile(input: ExchangeInput): Promise<GoogleProfile> {
  const { code, returnedState, expectedState, codeVerifier, redirectUri } = input;

  // CSRF check. A mismatch means the callback didn't originate from a flow we
  // started, so the code must not be redeemed.
  if (!expectedState || !returnedState || expectedState !== returnedState) {
    throw AppError.badRequest("Your sign-in link expired. Please try again.");
  }
  if (!codeVerifier) {
    throw AppError.badRequest("Your sign-in session expired. Please try again.");
  }

  const { data } = await request<GoogleTokenResponse>(GOOGLE_TOKEN_ENDPOINT, {
    method: "POST",
    provider: "google",
    // Google's token endpoint requires form encoding and rejects JSON.
    form: {
      code,
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
      code_verifier: codeVerifier,
    },
    // An auth code is single-use: a blind retry would fail as invalid_grant
    // and could mask the real error.
    retries: 0,
  });

  const claims = decodeIdToken(data.id_token);
  assertValidClaims(claims);

  if (!claims.email) {
    throw AppError.badRequest("Your Google account didn't share an email address.");
  }

  return {
    providerAccountId: claims.sub,
    email: claims.email.toLowerCase(),
    emailVerified: claims.email_verified === true,
    name: claims.name ?? null,
    image: claims.picture ?? null,
  };
}

/** Attributes for the short-lived cookies that carry state across the redirect. */
export function oauthCookieOptions(isProduction: boolean) {
  return {
    httpOnly: true,
    // `lax` is required: Google's redirect back to us is a top-level GET
    // navigation, and `strict` would withhold the cookie on arrival.
    sameSite: "lax" as const,
    secure: isProduction,
    path: "/",
    maxAge: OAUTH_COOKIE_MAX_AGE_SECONDS,
  };
}
