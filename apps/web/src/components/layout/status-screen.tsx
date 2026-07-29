"use client";

import { IconTile } from "@theseosaas/ui/components/icon-tile";
import { FadeIn } from "@theseosaas/ui/components/motion";
import { cn } from "@theseosaas/ui/lib/utils";
import type { LucideIcon } from "lucide-react";
import * as React from "react";

/**
 * Shared shell for the full-page status states — 404, error, loading.
 *
 * The design has no screens for these, so they're built from the same tokens
 * as everything else. The tone matters: this product sells relief, so a dead
 * end should read as calm and recoverable, never as an alarm. No red banners,
 * no stack traces, always a way forward.
 */
interface StatusScreenProps {
  icon: LucideIcon;
  tone?: "neutral" | "critical" | "caution";
  title: string;
  description: React.ReactNode;
  actions?: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}

export function StatusScreen({
  icon: Icon,
  tone = "neutral",
  title,
  description,
  actions,
  footer,
  className,
}: StatusScreenProps) {
  return (
    <main
      className={cn(
        "flex min-h-svh items-center justify-center px-4 py-16 sm:px-6",
        className,
      )}
    >
      <FadeIn className="w-full max-w-md text-center">
        <IconTile tone={tone} size="xl" className="mx-auto mb-6">
          <Icon />
        </IconTile>

        <h1 className="font-display text-ink-900 text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
          {title}
        </h1>

        <div className="text-ink-400 mt-3 text-base leading-relaxed text-pretty">
          {description}
        </div>

        {actions ? (
          <div className="mt-7 flex flex-col justify-center gap-2 sm:flex-row">{actions}</div>
        ) : null}

        {footer ? <div className="text-ink-300 mt-8 text-sm">{footer}</div> : null}
      </FadeIn>
    </main>
  );
}
