import "dotenv/config";
import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

/**
 * Server environment. Validated at import time, so a missing key fails fast at
 * boot rather than at 2am inside a worker.
 */
export const env = createEnv({
  server: {
    DATABASE_URL: z.string().min(1),
    CORS_ORIGIN: z.url(),
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),

    /** Public origin. Used for OAuth redirects, magic links, and email URLs. */
    APP_URL: z.url(),

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
    OPENROUTER_MODEL: z.string().min(1).default("openai/gpt-4.1-mini"),

    // --- Payments: Dodo ----------------------------------------------------
    DODO_API_KEY: z.string().min(1).optional(),
    DODO_WEBHOOK_SECRET: z.string().min(1).optional(),
    DODO_ENVIRONMENT: z.enum(["test_mode", "live_mode"]).default("test_mode"),
  },
  runtimeEnv: process.env,
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  emptyStringAsUndefined: true,
});
