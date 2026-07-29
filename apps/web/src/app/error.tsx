"use client";

import { Button } from "@theseosaas/ui/components/button";
import { RefreshCw } from "lucide-react";
import Link from "next/link";
import * as React from "react";

import { StatusScreen } from "@/components/layout/status-screen";

/**
 * Route-level error boundary.
 *
 * Next requires this to be a client component with `reset`. We never render
 * `error.message` — in production it's a redacted digest, and in development
 * it's a stack trace that would alarm a user without helping them.
 */
export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    // Surfaces in the browser console and in server logs for the digest.
    console.error("[app] route error:", error);
  }, [error]);

  return (
    <StatusScreen
      icon={RefreshCw}
      tone="caution"
      title="Something went wrong on our side"
      description="This is our problem, not yours. Trying again usually clears it — if it doesn't, the issue is one we need to fix."
      actions={
        <>
          <Button onClick={reset}>Try again</Button>
          <Button variant="outline" render={<Link href="/" />}>
            Back to home
          </Button>
        </>
      }
      footer={
        error.digest ? (
          <>
            Reference: <span className="font-mono">{error.digest}</span>
          </>
        ) : null
      }
    />
  );
}
