"use client";

import { Button } from "@theseosaas/ui/components/button";
import { cn } from "@theseosaas/ui/lib/utils";
import { Lock } from "lucide-react";
import * as React from "react";

/**
 * Paywall affordance.
 *
 * Per the design system rules, a gated action must look like an upgrade, never
 * like a broken or disabled feature — so this renders the real content
 * underneath at reduced contrast with an unlock prompt over it, rather than
 * greying the control out or hiding it.
 *
 * `reason` should state what the user gets, not what they're missing:
 * "Your first 3 articles are ready to write" beats "Upgrade required".
 */
interface LockedOverlayProps extends React.ComponentProps<"div"> {
  locked?: boolean;
  reason: React.ReactNode;
  actionLabel?: string;
  onUnlock?: () => void;
  /** Blur intensity for the content behind the prompt. */
  intensity?: "light" | "strong";
}

function LockedOverlay({
  className,
  locked = true,
  reason,
  actionLabel = "Unlock",
  onUnlock,
  intensity = "light",
  children,
  ...props
}: LockedOverlayProps) {
  if (!locked) return <>{children}</>;

  return (
    <div data-slot="locked-overlay" className={cn("relative", className)} {...props}>
      <div
        aria-hidden
        className={cn(
          "pointer-events-none select-none",
          intensity === "strong" ? "opacity-35 blur-[3px]" : "opacity-60 blur-[1.5px]",
        )}
      >
        {children}
      </div>

      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="bg-surface border-line flex max-w-sm flex-col items-center gap-3 rounded-xl border px-5 py-4 text-center shadow-[0_8px_24px_-8px_rgba(11,18,32,0.16)]">
          <div className="bg-opportunity-surface text-opportunity inline-flex size-8 items-center justify-center rounded-[9px]">
            <Lock className="size-4" />
          </div>

          <p className="text-ink-700 text-sm leading-relaxed">{reason}</p>

          <Button size="sm" onClick={onUnlock}>
            {actionLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

export { LockedOverlay };
