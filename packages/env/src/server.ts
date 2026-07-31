import path from "node:path";
import { fileURLToPath } from "node:url";

import { createEnv } from "@t3-oss/env-core";
import dotenv from "dotenv";
import { z } from "zod";

/**
 * Load the workspace's env file by absolute path, resolved from this module.
 *
 * This used to be a bare `import "dotenv/config"`, which reads `.env` from
 * `process.cwd()`. That quietly made the whole config layer depend on which
 * directory you happened to launch from: `pnpm dev` inside apps/web found
 * apps/web/.env, and `pnpm dev` inside apps/worker found nothing at all.
 *
 * The failure that exposed it was a good one to avoid repeating. With no .env
 * loaded, DATABASE_URL was undefined; normally the schema below would catch that
 * and name the missing key, but with SKIP_ENV_VALIDATION set — as it is in any
 * shell where you've run a build — validation is skipped and `undefined` flows
 * straight through to the Postgres driver, which reports
 * "SASL: SCRAM-SERVER-FIRST-MESSAGE: client password must be a string". Nothing
 * about that names the actual problem.
 *
 * packages/db/prisma.config.ts already reached for apps/web/.env by relative
 * path for the same reason; this generalises that fix rather than leaving each
 * entry point to solve it again.
 *
 * Both locations are tried, root first, and dotenv never overwrites a variable
 * that's already set — so real environment variables (Docker, CI, your host)
 * always win over a file. In the container no .env exists at all and both calls
 * are silent no-ops, which is the intended behaviour there.
 */
const HERE = path.dirname(fileURLToPath(import.meta.url));
const WORKSPACE_ROOT = path.resolve(HERE, "../../..");

for (const candidate of [
  path.join(WORKSPACE_ROOT, ".env"),
  path.join(WORKSPACE_ROOT, "apps", "web", ".env"),
]) {
  dotenv.config({ path: candidate, quiet: true });
}

/**
 * Server environment. Validated at import time, so a missing key fails fast at
 * boot rather than at 2am inside a worker.
 */
export const env = createEnv({
  server: {
    DATABASE_URL: z.string().min(1),
    CORS_ORIGIN: z.url(),
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),

    /**
     * Public origin. Used for OAuth redirects, magic links, and email URLs.
     *
     * Refused when it points at localhost in production, because the failure it
     * causes doesn't look like a configuration error. Google is handed
     * `redirect_uri = APP_URL + /api/auth/google/callback`, so an unset value
     * sends real users to `http://localhost:3001/...` with a valid auth code
     * attached — the sign-in appears to work right up until the browser can't
     * reach the address. Magic links land in inboxes pointing at the
     * recipient's own machine, with the same result.
     *
     * Nothing downstream can detect this: from the server's side the redirect
     * was issued successfully. Catching it at boot turns a silent, unreportable
     * dead end into a container that won't start and says why.
     */
    APP_URL: z
      .url()
      .refine(
        (value) =>
          process.env.NODE_ENV !== "production" ||
          !/^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:|\/|$)/i.test(value),
        {
          message:
            "APP_URL points at localhost in production. Set it to the public origin (e.g. https://theseosaas.com) — OAuth redirects and magic links are built from it and would send users to their own machine.",
        },
      ),

    // --- Auth: Google OAuth (hand-rolled, no auth library) -----------------
    GOOGLE_CLIENT_ID: z.string().min(1),
    GOOGLE_CLIENT_SECRET: z.string().min(1),

    // --- Email: nodemailer over SMTP ---------------------------------------
    SMTP_HOST: z.string().min(1),
    SMTP_PORT: z.coerce.number().int().positive().default(587),
    SMTP_USER: z.string().min(1),
    SMTP_PASSWORD: z.string().min(1),
    /** RFC 5322 from-address, e.g. `TheSEOSaaS <hello@theseosaas.com>`. */
    MAIL_FROM: z.string().min(1),

    // --- Search: Serpex ----------------------------------------------------
    SERPEX_API_KEY: z.string().min(1),

    // --- AI: OpenRouter ----------------------------------------------------
    OPENROUTER_API_KEY: z.string().min(1),
    // OPENROUTER_MODEL removed deliberately — the model is pinned in code, in
    // `packages/core/src/ai/openrouter.ts`. Every prompt and the brand-voice
    // rules are written against one model's behaviour, so swapping it from a
    // hosting dashboard changed output quality with nothing in the diff to
    // explain why. One fewer env var to keep in sync across apps, too.

    // --- Payments: Dodo ----------------------------------------------------
    DODO_API_KEY: z.string().min(1).optional(),
    DODO_WEBHOOK_SECRET: z.string().min(1).optional(),
    DODO_ENVIRONMENT: z.enum(["test_mode", "live_mode"]).default("test_mode"),

    /**
     * Six Dodo products: three plans × monthly/yearly. Optional at the schema
     * level (same as DODO_API_KEY) so the app boots without billing configured;
     * `productIdFor` throws a clear error at call time if one is missing.
     */
    DODO_PRODUCT_STARTER_MONTHLY: z.string().min(1).optional(),
    DODO_PRODUCT_STARTER_YEARLY: z.string().min(1).optional(),
    DODO_PRODUCT_GROWTH_MONTHLY: z.string().min(1).optional(),
    DODO_PRODUCT_GROWTH_YEARLY: z.string().min(1).optional(),
    DODO_PRODUCT_SCALE_MONTHLY: z.string().min(1).optional(),
    DODO_PRODUCT_SCALE_YEARLY: z.string().min(1).optional(),
  },
  runtimeEnv: process.env,
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  emptyStringAsUndefined: true,
});
