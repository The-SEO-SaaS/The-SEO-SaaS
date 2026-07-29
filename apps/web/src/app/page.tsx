import { Badge } from "@theseosaas/ui/components/badge";
import { Card, CardContent } from "@theseosaas/ui/components/card";
import { IconTile } from "@theseosaas/ui/components/icon-tile";
import { SectionHeading } from "@theseosaas/ui/components/section-heading";
import {
  BarChart3,
  FileSearch,
  KeyRound,
  PenLine,
  Search,
  TrendingDown,
  Wrench,
} from "lucide-react";

import { AuditInput } from "@/components/marketing/audit-input";
import { PricingTable } from "@/components/marketing/pricing-table";
import { MarketingFooter, MarketingHeader } from "@/components/marketing/site-chrome";

/**
 * Landing page.
 *
 * A server component: everything except the audit input is static, so only
 * that one island ships JavaScript. The page's whole job is to get a domain
 * into that input.
 */

const PROBLEMS = [
  {
    eyebrow: "Data, not decisions",
    icon: TrendingDown,
    title: "Analytics tells you traffic fell",
    body: "It never says which page to fix first, or whether the fix is worth an afternoon.",
    answer: "We rank findings by impact",
  },
  {
    eyebrow: "Quiet losses",
    icon: BarChart3,
    title: "Competitors move silently",
    body: "They publish, add markup, take your terms. Most teams notice a quarter later.",
    answer: "We show you what they shipped",
  },
  {
    eyebrow: "Stalled work",
    icon: Wrench,
    title: "Finding a gap isn't closing it",
    body: "Every other tool hands you a keyword list and stops. Someone still has to write the page.",
    answer: "Briefs and drafts come with the finding",
  },
];

const STEPS = [
  {
    step: "Step 01",
    meta: "About two minutes",
    title: "Run the audit",
    body: "Point us at your domain. We crawl your pages, check the technical basics, and compare you against the competitors actually taking your traffic.",
  },
  {
    step: "Step 02",
    meta: "Ranked by impact",
    title: "See what it's costing you",
    body: "Every finding comes with a plain-English reason it matters and the pages affected. The first three are always the right three.",
  },
  {
    step: "Step 03",
    meta: "Brief → draft → publish",
    title: "Publish the fix",
    body: "Full articles generated from those gaps, targeted at the keywords you're missing, ready to publish or export as markdown.",
  },
];

const SURFACES = [
  {
    icon: FileSearch,
    title: "Audits that prioritise themselves",
    body: "Findings ordered by what each one costs you, so you never have to guess where to start.",
  },
  {
    icon: BarChart3,
    title: "Competitor watch",
    body: "Who outranks you on which terms, and the content that got them there.",
  },
  {
    icon: KeyRound,
    title: "Keyword tracking with movement",
    body: "Positions, trend over time, and the gaps your rivals hold — one table you read in a minute.",
  },
  {
    icon: PenLine,
    title: "Drafts sourced from findings",
    body: "Every asset says which gap or competitor move triggered it, so generated copy stays targeted.",
  },
];

export default function LandingPage() {
  return (
    <>
      <MarketingHeader />

      {/* --- Hero ---------------------------------------------------------- */}
      <section id="hero" className="border-line border-b">
        <div className="mx-auto max-w-3xl px-6 py-24 text-center">
          <Badge tone="opportunity" shape="pill" className="mb-6">
            Free audit, no account needed
          </Badge>

          <h1 className="font-display text-ink-900 text-5xl leading-[1.1] font-semibold tracking-tight">
            An SEO lead for your site, not another dashboard
          </h1>

          <p className="text-ink-400 mx-auto mt-5 max-w-xl text-lg leading-relaxed">
            We crawl your site, tell you plainly what&apos;s costing you search traffic, then
            write the pages that close the gap.
          </p>

          <div className="mx-auto mt-9 max-w-xl">
            <AuditInput />
          </div>

          <p className="text-ink-300 mt-3 text-sm">
            Around two minutes. You get a shareable report link.
          </p>
        </div>
      </section>

      {/* --- Problem ------------------------------------------------------- */}
      <section className="mx-auto max-w-6xl space-y-10 px-6 py-24">
        <SectionHeading
          eyebrow="Why teams switch"
          title="Knowing your traffic dropped isn't the same as knowing what to do on Monday"
          size="lg"
          className="max-w-3xl"
        />

        <div className="grid gap-4 md:grid-cols-3">
          {PROBLEMS.map((problem) => (
            <Card key={problem.title} variant="panel">
              <CardContent className="space-y-3">
                <IconTile tone="neutral" size="lg">
                  <problem.icon />
                </IconTile>
                <div className="eyebrow text-ink-300">{problem.eyebrow}</div>
                <h3 className="font-display text-ink-900 text-lg font-semibold">
                  {problem.title}
                </h3>
                <p className="why-line">{problem.body}</p>
                <p className="text-opportunity text-sm font-medium">→ {problem.answer}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* --- How it works -------------------------------------------------- */}
      <section id="how-it-works" className="bg-surface-subtle border-line border-y">
        <div className="mx-auto max-w-6xl space-y-10 px-6 py-24">
          <SectionHeading
            eyebrow="How it works"
            title="Audit, then act — in one loop"
            subtitle="No dead ends. Every finding ends in something you can publish."
            size="lg"
          />

          <div className="grid gap-4 md:grid-cols-3">
            {STEPS.map((step) => (
              <Card key={step.step} variant="panel">
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="eyebrow text-ink-900">{step.step}</span>
                    <Badge tone="neutral" shape="pill">
                      {step.meta}
                    </Badge>
                  </div>
                  <h3 className="font-display text-ink-900 text-lg font-semibold">
                    {step.title}
                  </h3>
                  <p className="why-line">{step.body}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* --- Surfaces ------------------------------------------------------ */}
      <section id="features" className="mx-auto max-w-6xl space-y-10 px-6 py-24">
        <SectionHeading
          eyebrow="What you get"
          title="Four surfaces, one loop"
          subtitle="Each one feeds the next, so work never stops at a recommendation."
          size="lg"
        />

        <div className="grid gap-4 sm:grid-cols-2">
          {SURFACES.map((surface) => (
            <Card key={surface.title} variant="panel">
              <CardContent className="flex items-start gap-4">
                <IconTile tone="ink" size="lg">
                  <surface.icon />
                </IconTile>
                <div className="space-y-1.5">
                  <h3 className="font-display text-ink-900 text-lg font-semibold">
                    {surface.title}
                  </h3>
                  <p className="why-line">{surface.body}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* --- Pricing ------------------------------------------------------- */}
      <section id="pricing" className="bg-surface-subtle border-line border-y">
        <div className="mx-auto max-w-6xl space-y-10 px-6 py-24">
          <SectionHeading
            eyebrow="Pricing"
            title="The audit is free. You pay to publish."
            subtitle="Every plan includes every feature — plans differ only by how much you can generate and track."
            size="lg"
          />

          <PricingTable />

          <p className="text-ink-300 text-center text-sm">
            Cancel any time. Unused article quota doesn&apos;t roll over.
          </p>
        </div>
      </section>

      {/* --- Closing CTA --------------------------------------------------- */}
      <section className="mx-auto max-w-3xl px-6 py-24 text-center">
        <IconTile tone="ink" size="xl" className="mx-auto mb-6">
          <Search />
        </IconTile>

        <h2 className="font-display text-ink-900 text-4xl leading-tight font-semibold tracking-tight">
          Find out what your site is losing, before your competitor does
        </h2>

        <p className="text-ink-400 mx-auto mt-4 max-w-xl text-lg leading-relaxed">
          Run the free audit. If the findings aren&apos;t worth acting on, you&apos;ve lost two
          minutes and gained a shareable report.
        </p>

        <div className="mx-auto mt-8 max-w-xl">
          <AuditInput />
        </div>
      </section>

      <MarketingFooter />
    </>
  );
}
