"use client";

import { Button } from "@theseosaas/ui/components/button";
import { IconTile } from "@theseosaas/ui/components/icon-tile";
import { Input } from "@theseosaas/ui/components/input";
import { FadeIn, PhaseTransition } from "@theseosaas/ui/components/motion";
import { CheckCircle2, Mail, Search } from "lucide-react";
import Link from "next/link";
import * as React from "react";

import { useMagicLink } from "@/hooks/use-session";
import { authApi } from "@/lib/api";

/**
 * Sign-in.
 *
 * There is no password field and no separate sign-up — both providers create
 * the account on first use. That's why the copy says "Continue" rather than
 * "Log in": a new user and a returning one take exactly the same path, and
 * asking someone to pick between two doors that lead to the same room is pure
 * friction.
 */
export function LoginForm({
  redirectTo,
  error,
}: {
  redirectTo?: string;
  error?: string;
}) {
  const [email, setEmail] = React.useState("");
  const { requestLink, isSending, error: sendError, sentTo, reset } = useMagicLink(redirectTo);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const value = email.trim();
    if (!value) return;
    void requestLink(value);
  };

  if (sentTo) {
    return (
      <PhaseTransition phaseKey="sent">
        <div className="space-y-5 text-center">
          <IconTile tone="success" size="xl" className="mx-auto">
            <CheckCircle2 />
          </IconTile>

          <div className="space-y-2">
            <h1 className="font-display text-ink-900 text-2xl font-semibold tracking-tight">
              Check your inbox
            </h1>
            <p className="text-ink-400 text-base leading-relaxed text-pretty">
              We sent a sign-in link to <span className="text-ink-900 font-medium">{sentTo}</span>.
              It works once and expires in 15 minutes.
            </p>
          </div>

          <button
            type="button"
            onClick={reset}
            className="text-ink-400 hover:text-ink-900 text-base font-medium underline underline-offset-4"
          >
            Use a different email
          </button>
        </div>
      </PhaseTransition>
    );
  }

  return (
    <PhaseTransition phaseKey="form">
      <FadeIn className="space-y-7">
        <div className="space-y-2 text-center">
          <IconTile tone="ink" size="xl" className="mx-auto mb-2">
            <Search />
          </IconTile>
          <h1 className="font-display text-ink-900 text-2xl font-semibold tracking-tight sm:text-3xl">
            Continue to TheSEOSaaS
          </h1>
          <p className="text-ink-400 text-base leading-relaxed">
            No password needed. We&apos;ll create your account if you don&apos;t have one.
          </p>
        </div>

        {error ? (
          <div className="border-critical/20 bg-critical/5 text-critical-strong rounded-lg border px-3.5 py-2.5 text-sm">
            {error}
          </div>
        ) : null}

        {/* Google first — it's one click versus a round trip through email. */}
        <Button
          variant="outline"
          size="block"
          render={<a href={authApi.googleUrl(redirectTo)} />}
        >
          <GoogleMark />
          Continue with Google
        </Button>

        <div className="flex items-center gap-3">
          <span className="bg-line h-px flex-1" />
          <span className="text-ink-300 text-xs-plus">or</span>
          <span className="bg-line h-px flex-1" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-2.5">
          <Input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@yourcompany.com"
            autoComplete="email"
            aria-label="Email address"
            aria-invalid={Boolean(sendError) || undefined}
          />

          {sendError ? <p className="text-critical text-sm-plus">{sendError}</p> : null}

          <Button type="submit" size="block" disabled={isSending || !email.trim()}>
            <Mail />
            {isSending ? "Sending…" : "Email me a sign-in link"}
          </Button>
        </form>

        <p className="text-ink-300 text-center text-xs leading-relaxed">
          By continuing you agree to our{" "}
          <Link href="/terms" className="text-ink-400 text-xs">
            Terms
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="text-ink-400 text-xs">
            Privacy Policy
          </Link>
          .
        </p>
      </FadeIn>
    </PhaseTransition>
  );
}

/** Inline rather than an image, so it can't fail to load or flash. */
function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
      <path
        fill="#4285F4"
        d="M23.06 12.25c0-.85-.08-1.67-.22-2.45H12v4.63h6.2a5.3 5.3 0 0 1-2.3 3.48v2.89h3.72c2.18-2 3.44-4.96 3.44-8.55Z"
      />
      <path
        fill="#34A853"
        d="M12 23.5c3.11 0 5.72-1.03 7.62-2.8l-3.72-2.88c-1.03.69-2.35 1.1-3.9 1.1-3 0-5.54-2.02-6.45-4.74H1.7v2.98A11.5 11.5 0 0 0 12 23.5Z"
      />
      <path
        fill="#FBBC05"
        d="M5.55 14.18a6.9 6.9 0 0 1 0-4.36V6.84H1.7a11.5 11.5 0 0 0 0 10.32l3.85-2.98Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.69 0 3.21.58 4.4 1.72l3.3-3.3C17.72 1.3 15.11.25 12 .25A11.5 11.5 0 0 0 1.7 6.84l3.85 2.98C6.46 7.1 9 4.75 12 4.75Z"
      />
    </svg>
  );
}
