"use client";

import { Badge } from "@theseosaas/ui/components/badge";
import { Button } from "@theseosaas/ui/components/button";
import { Card, CardContent } from "@theseosaas/ui/components/card";
import { IconTile } from "@theseosaas/ui/components/icon-tile";
import { FadeIn, HoverLift, Stagger, StaggerItem } from "@theseosaas/ui/components/motion";
import { SectionHeading } from "@theseosaas/ui/components/section-heading";
import { ArrowUpRight, Check, FileText, Lock, Sparkles } from "lucide-react";

import type {
  AuditIssue,
  CompetitorSummary,
  KeywordGap,
  OpportunitySummary,
} from "@/lib/api";

/**
 * The report's content sections.
 *
 * Each one leads with a consultant sentence rather than a label, per the UX
 * philosophy: the heading says what the section means, and the items underneath
 * are the evidence.
 */

const SEVERITY = {
  CRITICAL: { tone: "critical", label: "Critical" },
  WARNING: { tone: "caution", label: "Worth fixing" },
  NOTICE: { tone: "neutral", label: "Notice" },
} as const;

export function FindingsSection({ issues }: { issues: AuditIssue[] }) {
  if (issues.length === 0) return null;

  return (
    <section className="space-y-5">
      <FadeIn whenInView>
        <SectionHeading
          eyebrow="What I'd fix first"
          title="Ordered by impact, not by category"
          subtitle="The first three are the ones costing you traffic today. Everything below them can wait a week without hurting."
        />
      </FadeIn>

      <Stagger className="space-y-2.5">
        {issues.map((issue) => {
          const severity = SEVERITY[issue.severity];

          return (
            <StaggerItem key={issue.id}>
              <Card variant="default" className="gap-2.5">
                <CardContent className="space-y-2.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-display text-ink-900 text-md font-semibold">
                      {issue.title}
                    </h3>
                    <Badge tone={severity.tone}>{severity.label}</Badge>
                  </div>

                  <p className="why-line">{issue.whyItMatters}</p>

                  {issue.howToFix ? (
                    <p className="text-ink-500 text-sm">
                      <span className="text-ink-700 font-medium">Fix:</span> {issue.howToFix}
                    </p>
                  ) : null}

                  {issue.affectedUrls.length > 0 ? (
                    // break-all so a long URL wraps instead of forcing the
                    // whole card to scroll horizontally on a phone.
                    <div className="text-ink-300 font-mono text-xs break-all">
                      {issue.affectedUrls[0]}
                      {issue.affectedUrls.length > 1
                        ? ` +${issue.affectedUrls.length - 1} more`
                        : ""}
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            </StaggerItem>
          );
        })}
      </Stagger>
    </section>
  );
}

export function HealthySection({ healthy }: { healthy: string[] }) {
  if (healthy.length === 0) return null;

  return (
    <Card variant="well">
      <CardContent className="space-y-3">
        <h3 className="text-ink-700 text-base font-semibold">What&apos;s already healthy</h3>
        <ul className="grid gap-2 sm:grid-cols-2">
          {healthy.map((item) => (
            <li key={item} className="flex items-start gap-2">
              <IconTile tone="success-solid" size="xs" className="mt-0.5">
                <Check strokeWidth={3} />
              </IconTile>
              <span className="text-ink-500 text-sm leading-relaxed">{item}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

export function CompetitorsSection({
  competitors,
  domain,
}: {
  competitors: CompetitorSummary[];
  domain: string;
}) {
  if (competitors.length === 0) return null;

  return (
    <section className="space-y-5">
      <FadeIn whenInView>
        <SectionHeading
          eyebrow="Competitors"
          eyebrowTone="opportunity"
          title="These sites are winning traffic you want"
          subtitle={`They rank for the same searches ${domain} should own. Here's the strongest piece of content each one has published.`}
        />
      </FadeIn>

      <Stagger className="grid gap-2.5 sm:grid-cols-2 md:grid-cols-3">
        {competitors.map((competitor) => (
          <StaggerItem key={competitor.id} className="h-full">
          <Card variant="default" className="h-full gap-3">
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2.5">
                <IconTile tone="neutral" size="sm">
                  <span className="text-2xs font-semibold uppercase">
                    {competitor.domain.slice(0, 2)}
                  </span>
                </IconTile>
                <span className="text-ink-900 truncate text-base font-medium">
                  {competitor.name ?? competitor.domain}
                </span>
              </div>

              {competitor.bestPage ? (
                <div className="space-y-1.5">
                  <div className="eyebrow text-ink-300">Their best post</div>
                  <a
                    href={competitor.bestPage.url}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    className="text-ink-700 hover:text-ink-900 group flex items-start gap-1 text-sm leading-relaxed font-medium"
                  >
                    <span className="line-clamp-3">{competitor.bestPage.title}</span>
                    <ArrowUpRight className="mt-0.5 size-3.5 shrink-0" />
                  </a>
                </div>
              ) : (
                <p className="text-ink-300 text-sm">No standout content found.</p>
              )}
            </CardContent>
          </Card>
          </StaggerItem>
        ))}
      </Stagger>
    </section>
  );
}

export function KeywordsSection({
  keywords,
  headline,
}: {
  keywords: KeywordGap[];
  headline: string | null;
}) {
  if (keywords.length === 0) return null;

  return (
    <section className="space-y-5">
      <FadeIn whenInView>
        <SectionHeading
          eyebrow="Missing keywords"
          eyebrowTone="opportunity"
          title={headline ?? `You're missing ${keywords.length} buying-intent searches`}
          subtitle="People looking for software like yours are searching these terms and finding your competitors instead."
        />
      </FadeIn>

      <Card variant="default">
        <CardContent className="divide-line divide-y">
          {keywords.map((keyword) => (
            <div
              key={keyword.term}
              className="flex flex-wrap items-baseline gap-x-3 gap-y-1 py-2.5 first:pt-0 last:pb-0"
            >
              <span className="text-ink-900 text-base font-medium">{keyword.term}</span>
              <Badge
                tone={
                  keyword.intent === "TRANSACTIONAL"
                    ? "opportunity"
                    : keyword.intent === "COMMERCIAL"
                      ? "caution"
                      : "neutral"
                }
              >
                {keyword.intent.toLowerCase()}
              </Badge>
              {keyword.rationale ? (
                <p className="text-ink-400 w-full text-sm">{keyword.rationale}</p>
              ) : null}
            </div>
          ))}
        </CardContent>
      </Card>
    </section>
  );
}

const OPPORTUNITY_LABEL: Record<string, string> = {
  BLOG_POST: "Blog post",
  FEATURE_PAGE: "Feature page",
  LANDING_PAGE: "Landing page",
  COMPARISON_PAGE: "Comparison page",
  INTEGRATION_PAGE: "Integration page",
  USE_CASE_PAGE: "Use-case page",
  INDUSTRY_PAGE: "Industry page",
};

export function OpportunitiesSection({
  opportunities,
  onGenerate,
}: {
  opportunities: OpportunitySummary[];
  onGenerate?: (id: string) => void;
}) {
  if (opportunities.length === 0) return null;

  return (
    <section className="space-y-5">
      <FadeIn whenInView>
        <SectionHeading
          eyebrow="What to build"
          eyebrowTone="opportunity"
          title="Pages that would close the gap"
          subtitle="Each of these targets a search your competitors currently own. We can write them for you."
        />
      </FadeIn>

      <Stagger className="space-y-2.5">
        {opportunities.map((opportunity) => (
          <StaggerItem key={opportunity.id}>
          <Card variant="default" className="gap-3">
            <CardContent className="space-y-3">
              {/* Stacks below sm — a title and a Generate button side by side
                  squeezes both on a phone. */}
              <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:gap-4">
                <div className="min-w-0 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <IconTile tone="opportunity" size="sm">
                      <FileText />
                    </IconTile>
                    <span className="eyebrow text-ink-300">
                      {OPPORTUNITY_LABEL[opportunity.type] ?? "Page"}
                    </span>
                  </div>

                  <h3 className="font-display text-ink-900 text-md font-semibold">
                    {opportunity.title}
                  </h3>
                  <p className="why-line">{opportunity.rationale}</p>
                </div>

                {onGenerate ? (
                  <Button
                    size="sm"
                    variant="opportunity"
                    onClick={() => onGenerate(opportunity.id)}
                    className="w-full shrink-0 sm:w-auto"
                  >
                    <Sparkles />
                    Generate
                  </Button>
                ) : null}
              </div>

              {opportunity.keywords.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {opportunity.keywords.map((keyword) => (
                    <Badge key={keyword} tone="neutral" shape="pill" className="font-medium">
                      {keyword}
                    </Badge>
                  ))}
                </div>
              ) : null}
            </CardContent>
          </Card>
          </StaggerItem>
        ))}
      </Stagger>
    </section>
  );
}

/**
 * The paywall block.
 *
 * States exactly what's held back and in what quantity. Vague gates ("upgrade
 * for more") convert worse than specific ones, and we have the real numbers.
 */
export function UnlockSection({
  domain,
  locked,
  onSeePlans,
}: {
  domain: string;
  locked: { issues: number; opportunities: number; keywords: number };
  onSeePlans?: () => void;
}) {
  const parts = [
    locked.issues > 0 ? `${locked.issues} more findings` : null,
    locked.opportunities > 0 ? `${locked.opportunities} more page ideas` : null,
    locked.keywords > 0 ? `${locked.keywords} more keywords` : null,
  ].filter(Boolean);

  if (parts.length === 0) return null;

  return (
    <FadeIn whenInView>
      <Card variant="opportunity" elevated>
        <CardContent className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1.5">
            <div className="flex items-start gap-2">
              <IconTile tone="opportunity" size="sm" className="mt-0.5">
                <Lock />
              </IconTile>
              <h3 className="font-display text-ink-900 text-md font-semibold text-balance">
                {parts.join(", ")}
              </h3>
            </div>
            <p className="text-ink-500 max-w-[60ch] text-sm leading-relaxed">
              A plan unlocks the full list for {domain}, the complete competitor breakdown, and
              article drafts generated from every gap above. From $49.99 a month.
            </p>
          </div>

          <Button onClick={onSeePlans} className="w-full shrink-0 sm:w-auto">
            See plans
          </Button>
        </CardContent>
      </Card>
    </FadeIn>
  );
}
