"use client";

import { Badge } from "@theseosaas/ui/components/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@theseosaas/ui/components/card";
import { IconTile } from "@theseosaas/ui/components/icon-tile";
import { cn } from "@theseosaas/ui/lib/utils";
import type { LucideIcon } from "lucide-react";
import * as React from "react";

import type { IssueSeverity } from "@/lib/api";

/**
 * The workhorse of the audit report: one finding, why it matters, and what to
 * do about it.
 *
 * `whyItMatters` is a required prop rather than optional. The product rule is
 * that no finding ships without its rationale, and making it required means a
 * missing explanation is a type error instead of a silently worse report.
 */
interface FindingCardProps {
  title: React.ReactNode;
  whyItMatters: React.ReactNode;
  icon?: LucideIcon;
  severity?: IssueSeverity;
  /** Keyword tags, competitor names, page types. */
  tags?: string[];
  /** The generate/track button. Every finding should offer one. */
  action?: React.ReactNode;
  meta?: React.ReactNode;
  className?: string;
}

const SEVERITY_CONFIG = {
  CRITICAL: { tone: "critical", label: "Critical" },
  WARNING: { tone: "caution", label: "Worth fixing" },
  NOTICE: { tone: "neutral", label: "Minor" },
} as const;

export function FindingCard({
  title,
  whyItMatters,
  icon: Icon,
  severity,
  tags,
  action,
  meta,
  className,
}: FindingCardProps) {
  const severityConfig = severity ? SEVERITY_CONFIG[severity] : null;

  return (
    <Card className={cn("gap-3", className)}>
      <CardHeader>
        <div className="flex items-start gap-3">
          {Icon ? (
            <IconTile
              size="lg"
              tone={
                severity === "CRITICAL"
                  ? "critical"
                  : severity === "WARNING"
                    ? "caution"
                    : "neutral"
              }
            >
              <Icon />
            </IconTile>
          ) : null}

          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle className="text-md">{title}</CardTitle>
              {severityConfig ? (
                <Badge tone={severityConfig.tone}>{severityConfig.label}</Badge>
              ) : null}
            </div>

            <p className="why-line">{whyItMatters}</p>
          </div>
        </div>
      </CardHeader>

      {tags?.length || action || meta ? (
        <CardContent className="space-y-3">
          {tags?.length ? (
            <div className="flex flex-wrap gap-1.5">
              {tags.map((tag) => (
                <Badge key={tag} tone="neutral" shape="pill" className="font-medium">
                  {tag}
                </Badge>
              ))}
            </div>
          ) : null}

          {meta ? <div className="text-ink-300 text-xs-plus">{meta}</div> : null}

          {action ? <div className="pt-1">{action}</div> : null}
        </CardContent>
      ) : null}
    </Card>
  );
}
