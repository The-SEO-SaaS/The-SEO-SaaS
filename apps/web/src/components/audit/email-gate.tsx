"use client";

import { Button } from "@theseosaas/ui/components/button";
import { Input } from "@theseosaas/ui/components/input";
import { cn } from "@theseosaas/ui/lib/utils";
import * as React from "react";

import { useMutation } from "@/hooks/use-request";
import { auditApi } from "@/lib/api";

/**
 * The soft email gate shown once the audit finishes.
 *
 * Deliberately skippable. The spec is explicit that the user can continue
 * without giving an email, and gating the report behind it would destroy the
 * "try before you sign up" property that makes the free audit work as a lead
 * magnet in the first place. The ask is framed as a convenience — we'll send
 * you a copy — not as a toll.
 */
interface EmailGateProps {
  publicId: string;
  onContinue: () => void;
  className?: string;
}

export function EmailGate({ publicId, onContinue, className }: EmailGateProps) {
  const [email, setEmail] = React.useState("");

  const capture = useMutation(
    (value: string) => auditApi.captureEmail(publicId, value),
    { onSuccess: onContinue },
  );

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!email.trim()) return;
    void capture.mutate(email.trim());
  };

  return (
    <div className={cn("mx-auto w-full max-w-md space-y-5 text-center", className)}>
      <div className="space-y-2">
        <h2 className="font-display text-ink-900 text-3xl font-semibold tracking-tight">
          Your audit is ready
        </h2>
        <p className="text-ink-400 text-lg leading-relaxed">
          Want a copy in your inbox? We&apos;ll send the full report so you can come back to it
          or forward it to your team.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-2.5">
        <Input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@yourcompany.com"
          autoComplete="email"
          aria-invalid={capture.isError || undefined}
          aria-label="Email address"
        />

        {capture.isError ? (
          <p className="text-critical text-sm-plus text-left">{capture.message}</p>
        ) : null}

        <Button type="submit" size="block" disabled={capture.isLoading || !email.trim()}>
          {capture.isLoading ? "Sending…" : "Email me the report"}
        </Button>
      </form>

      <button
        type="button"
        onClick={onContinue}
        className="text-ink-400 hover:text-ink-700 text-base font-medium underline underline-offset-4"
      >
        Skip, just show me the report
      </button>
    </div>
  );
}
