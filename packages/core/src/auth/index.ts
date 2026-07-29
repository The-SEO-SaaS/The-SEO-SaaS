/**
 * Auth surface. Google OAuth + email magic link, hand-rolled on node:crypto.
 * There are no passwords and no auth library anywhere behind this barrel.
 */

export {
  SESSION_COOKIE_NAME,
  createSession,
  validateSessionToken,
  invalidateSession,
  invalidateAllSessions,
  deleteExpiredSessions,
  sessionCookieOptions,
  clearedSessionCookieOptions,
  type ActiveSession,
  type CreatedSession,
  type SessionMeta,
} from "./session.js";

export {
  OAUTH_STATE_COOKIE,
  OAUTH_VERIFIER_COOKIE,
  OAUTH_REDIRECT_COOKIE,
  OAUTH_COOKIE_MAX_AGE_SECONDS,
  buildAuthorizationUrl,
  exchangeCodeForProfile,
  oauthCookieOptions,
  type AuthorizationRequest,
  type GoogleProfile,
} from "./google.js";

export {
  emailSchema,
  requestMagicLinkSchema,
  requestMagicLink,
  consumeMagicLink,
  sanitizeRedirect,
  deleteExpiredAuthTokens,
  type RequestMagicLinkInput,
  type RequestMagicLinkResult,
  type MagicLinkResult,
} from "./magic-link.js";

export {
  signInWithGoogle,
  getUserById,
  updateProfile,
  claimAudit,
  type AuthResult,
} from "./service.js";
