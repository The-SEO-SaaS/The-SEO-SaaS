import { Badge } from "@theseosaas/ui/components/badge";
import { Card, CardContent } from "@theseosaas/ui/components/card";
import { IconTile } from "@theseosaas/ui/components/icon-tile";
import { FadeIn, HoverLift, Stagger, StaggerItem } from "@theseosaas/ui/components/motion";
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
import { ProofCard } from "@/components/marketing/proof-card";
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
      {/*
        Hero. Design spec: full width, 180px top padding and zero bottom, no
        border. Headline 56px / 600 / -0.04em / 1.06. Sub 17px / #5B6472/ 1.6.
        Input row capped at 620px, note 12.5px #6B7480.

        The four proof cards are absolutely positioned in the design's 1280px
        canvas. They're hidden below `xl`, where they would sit on top of the
        headline — the design has no mobile view, so that's an adaptation.
      */}
      <section
        id="hero"
        className="relative flex flex-col items-center px-5 pt-16 sm:px-10 sm:pt-24 xl:pt-[180px]"
      >
        <ProofCard
          className="left-6 top-[148px]"
          eyebrow="RANKINGS"
          delta={{ label: "+37", tone: "up" }}
          title="Keywords on page one"
          footer="Six months, one site"
          spark="M0,34 L38,30 L76,24 L114,17 L152,11 L190,5"
        />
        <ProofCard
          className="left-6 top-[368px]"
          eyebrow="SEO SCORE"
          title="68 → 74"
          footer="After the first three fixes"
        />
        <ProofCard
          className="right-6 top-[148px]"
          eyebrow="COMPETITORS"
          delta={{ label: "4 tracked", tone: "neutral" }}
          title="Who takes your terms"
          footer="Checked every day"
        />
        <ProofCard
          className="right-6 top-[368px]"
          eyebrow="GAP CLOSED"
          title="9 keywords recovered"
          footer="3 articles published"
          footerCheck
        />

        <FadeIn from="none" className="max-w-[760px] text-center">
          <span className="border-line bg-surface inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 whitespace-nowrap shadow-[0_1px_2px_rgba(11,18,32,0.04)]">
            <span className="bg-ink-900 size-[5px] rounded-full" />
            <span className="text-ink-900 text-[12px] font-medium">
              Free audit, no account needed
            </span>
          </span>

          <h1 className="font-display text-ink-900 mt-[26px] text-[34px] leading-[1.06] font-semibold tracking-[-0.04em] text-pretty sm:text-[44px] lg:text-[56px]">
            An SEO lead for your site, not another dashboard
          </h1>

          <p className="mx-auto mt-[18px] max-w-[60ch] text-[15px] leading-[1.6] text-[#5B6472] sm:text-[17px]">
            We crawl your site, tell you plainly what is costing you search traffic, then write
            the pages that close the gap. Audit, opportunities, drafts, published.
          </p>
        </FadeIn>

        <FadeIn delay={0.1} className="w-full max-w-[620px]">
          <div className="mt-[34px]">
            <AuditInput />
          </div>
          <p className="mt-[13px] text-center text-[12.5px] text-[#6B7480]">
            About eight minutes for a 400-page site. You get a shareable report link.
          </p>
        </FadeIn>
      </section>

      {/* --- Problem ------------------------------------------------------- */}
      <section className="mx-auto max-w-6xl space-y-8 px-4 py-16 sm:space-y-10 sm:px-6 sm:py-24">
        <FadeIn whenInView>
          <SectionHeading
            eyebrow="Why teams switch"
            title="Knowing your traffic dropped isn't the same as knowing what to do on Monday"
            size="lg"
            className="max-w-3xl"
          />
        </FadeIn>

        <Stagger className="grid gap-4 md:grid-cols-3">
          {PROBLEMS.map((problem) => (
            <StaggerItem key={problem.title}>
              <HoverLift className="h-full">
                <Card variant="panel" className="h-full">
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
              </HoverLift>
            </StaggerItem>
          ))}
        </Stagger>
      </section>

      {/* --- How it works -------------------------------------------------- */}
      <section id="how-it-works" className="bg-surface-subtle border-line border-y">
        <div className="mx-auto max-w-6xl space-y-8 px-4 py-16 sm:space-y-10 sm:px-6 sm:py-24">
          <FadeIn whenInView>
            <SectionHeading
              eyebrow="How it works"
              title="Audit, then act — in one loop"
              subtitle="No dead ends. Every finding ends in something you can publish."
              size="lg"
            />
          </FadeIn>

          <Stagger className="grid gap-4 md:grid-cols-3">
            {STEPS.map((step) => (
              <StaggerItem key={step.step}>
                <HoverLift className="h-full">
                  <Card variant="panel" className="h-full">
                    <CardContent className="space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
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
                </HoverLift>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>

      {/* --- Surfaces ------------------------------------------------------ */}
      <section
        id="features"
        className="mx-auto max-w-6xl space-y-8 px-4 py-16 sm:space-y-10 sm:px-6 sm:py-24"
      >
        <FadeIn whenInView>
          <SectionHeading
            eyebrow="What you get"
            title="Four surfaces, one loop"
            subtitle="Each one feeds the next, so work never stops at a recommendation."
            size="lg"
          />
        </FadeIn>

        <Stagger className="grid gap-4 sm:grid-cols-2">
          {SURFACES.map((surface) => (
            <StaggerItem key={surface.title}>
              <HoverLift className="h-full">
                <Card variant="panel" className="h-full">
                  <CardContent className="flex items-start gap-3 sm:gap-4">
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
              </HoverLift>
            </StaggerItem>
          ))}
        </Stagger>
      </section>

      {/* --- Pricing ------------------------------------------------------- */}
      <section id="pricing" className="bg-surface-subtle border-line border-y">
        <div className="mx-auto max-w-6xl space-y-8 px-4 py-16 sm:space-y-10 sm:px-6 sm:py-24">
          <FadeIn whenInView>
            <SectionHeading
              eyebrow="Pricing"
              title="The audit is free. You pay to publish."
              subtitle="Every plan includes every feature — plans differ only by how much you can generate and track."
              size="lg"
            />
          </FadeIn>

          <PricingTable />

          <p className="text-ink-300 text-center text-sm">
            Cancel any time. Unused article quota doesn&apos;t roll over.
          </p>
        </div>
      </section>

      {/* --- Closing CTA --------------------------------------------------- */}
      <section className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6 sm:py-24">
        <FadeIn whenInView>
          <IconTile tone="ink" size="xl" className="mx-auto mb-5 sm:mb-6">
            <Search />
          </IconTile>

          <h2 className="font-display text-ink-900 text-2xl leading-tight font-semibold tracking-tight text-balance sm:text-3xl md:text-4xl">
            Find out what your site is losing, before your competitor does
          </h2>

          <p className="text-ink-400 mx-auto mt-4 max-w-xl text-base leading-relaxed text-pretty sm:text-lg">
            Run the free audit. If the findings aren&apos;t worth acting on, you&apos;ve lost two
            minutes and gained a shareable report.
          </p>

          <div className="mx-auto mt-7 max-w-xl sm:mt-8">
            <AuditInput />
          </div>
        </FadeIn>
      </section>

      <MarketingFooter />
    </>
  );
}
