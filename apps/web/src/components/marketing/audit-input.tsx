"use client";

import { Button } from "@theseosaas/ui/components/button";
import { cn } from "@theseosaas/ui/lib/utils";
import { ArrowRight } from "lucide-react";
import * as React from "react";

import { useStartAudit } from "@/hooks/use-audit";

/**
 * The hero audit input — the only conversion point on the marketing site.
 *
 * The `https://` prefix is rendered as a static adornment rather than typed:
 * founders paste URLs in every shape, and showing the scheme makes it obvious
 * they don't need to include it. Normalisation still happens server-side.
 */
export function AuditInput({
  size = "hero",
  className,
}: {
  size?: "hero" | "compact";
  className?: string;
}) {
  const [domain, setDomain] = React.useState("");
  const { startAudit, isStarting, error } = useStartAudit();

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const value = domain.trim();
    if (!value) return;
    void startAudit(value);
  };

  const isHero = size === "hero";

  return (
    <div className={cn("w-full", className)}>
      <form
        onSubmit={handleSubmit}
        className={cn(
          "bg-surface border-line focus-within:border-ink-900 focus-within:ring-ring/10 flex items-center gap-2 border transition-colors focus-within:ring-2",
          isHero ? "rounded-xl p-1.5 pl-4" : "rounded-lg p-1 pl-3",
        )}
      >
        <span className={cn("text-ink-300 shrink-0", isHero ? "text-lg" : "text-base")}>
          https://
        </span>

        <input
          value={domain}
          onChange={(event) => setDomain(event.target.value)}
          placeholder="yoursaas.com"
          aria-label="Your website URL"
          autoComplete="url"
          spellCheck={false}
          className={cn(
            "text-ink-900 placeholder:text-ink-300 min-w-0 flex-1 bg-transparent outline-none",
            isHero ? "text-lg" : "text-base",
          )}
        />

        <Button
          type="submit"
          size={isHero ? "default" : "sm"}
          disabled={isStarting || !domain.trim()}
          className="shrink-0"
        >
          {isStarting ? "Starting…" : "Run free audit"}
          {!isStarting ? <ArrowRight /> : null}
        </Button>
      </form>

      {error ? <p className="text-critical mt-2 text-sm-plus">{error}</p> : null}
    </div>
  );
}
