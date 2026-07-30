import { IconTile } from "@theseosaas/ui/components/icon-tile";
import { FadeIn, Stagger, StaggerItem } from "@theseosaas/ui/components/motion";
import { cn } from "@theseosaas/ui/lib/utils";
import {
  ArrowRight,
  ArrowUp,
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
import { ProductShot } from "@/components/marketing/product-shot";
import { ProofCard } from "@/components/marketing/proof-card";
import { MarketingFooter, MarketingHeader } from "@/components/marketing/site-chrome";

/**
 * Landing page.
 *
 * A server component: everything except the audit input is static, so only
 * that one island ships JavaScript. The page's whole job is to get a domain
 * into that input.
 */

/**
 * Each problem card carries its own tone. The design tints the icon tile and
 * the status chip with the same fill, and colours the answer line to match —
 * neutral, caution, then info, left to right.
 */
const PROBLEMS = [
  {
    eyebrow: "DATA, NOT DECISIONS",
    icon: TrendingDown,
    tileBg: "bg-[#E7E9ED]",
    accent: "text-ink-900",
    title: "Analytics says traffic fell",
    body: "It never says which page to fix first, or whether the fix is worth an afternoon.",
    answer: "We rank findings by traffic at risk",
  },
  {
    eyebrow: "QUIET LOSSES",
    icon: BarChart3,
    tileBg: "bg-[#FEEFDC]",
    accent: "text-[#B45309]",
    title: "Competitors move silently",
    body: "They publish, add markup, take your terms. Most teams notice a quarter later.",
    answer: "We log what they shipped, weekly",
  },
  {
    eyebrow: "STALLED WORK",
    icon: Wrench,
    tileBg: "bg-[#D8F3E4]",
    accent: "text-[#0F766E]",
    title: "Finding a gap isn't closing it",
    body: "Every other tool hands you a keyword list and stops. Someone still writes the page.",
    answer: "Briefs and drafts come with the finding",
  },
];

const STEPS = [
  {
    step: "STEP 01",
    meta: "~8 minutes",
    icon: Search,
    tileBg: "bg-ink-900",
    tileText: "text-white",
    chipBg: "bg-[#F1F3F7]",
    accent: "text-ink-900",
    title: "Run the audit",
    body: "Point us at your domain. We crawl every page, check vitals, and compare you against three competitors.",
  },
  {
    step: "STEP 02",
    meta: "42 findings, 3 that matter",
    icon: FileSearch,
    tileBg: "bg-[#FEEFDC]",
    tileText: "text-[#B45309]",
    chipBg: "bg-[#FFFBF5]",
    accent: "text-[#B45309]",
    title: "See what it's costing you",
    body: "Findings ranked by traffic at risk, each with a plain-English reason it matters and the pages affected.",
  },
  {
    step: "STEP 03",
    meta: "Brief → draft → publish",
    icon: PenLine,
    tileBg: "bg-[#D8F3E4]",
    tileText: "text-[#0F766E]",
    chipBg: "bg-[#F5FCF8]",
    accent: "text-[#0F766E]",
    title: "Publish the fix",
    body: "Briefs and full articles generated from those gaps, on-brand and ready to publish or export as markdown.",
  },
];

/**
 * Illustrative figures inside the surfaces cards.
 *
 * These are the design's sample values, not live data — this is a signed-out
 * marketing page with no project to read from. They stay static rather than
 * being wired to anything, which is also why the cards are decorative.
 */
const SHARE_OF_VOICE = [
  { label: "darkroast", value: 82, bar: "bg-[#EA580C]", text: "text-[#9A3412]" },
  { label: "you", value: 74, bar: "bg-ink-900", text: "text-ink-900" },
  { label: "brewline", value: 61, bar: "bg-[#C6CDD8]", text: "text-[#6B7480]" },
];

const CONTENT_ROWS = [
  {
    title: "Cold brew recipes for summer",
    status: "Published",
    dot: "bg-[#16A34A]",
    text: "text-[#15803D]",
  },
  {
    title: "Cold brew vs iced coffee, explained",
    status: "Drafting",
    dot: "bg-[#EA580C]",
    text: "text-[#9A3412]",
  },
  {
    title: "Subscription box comparison 2026",
    status: "Queued",
    dot: "bg-[#C6CDD8]",
    text: "text-[#6B7480]",
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

      {/*
        Problem. Spec: 72px top padding, 48px sides. Heading block capped at
        640px, eyebrow 11px/600/0.12em, title 33px/600/-0.032em/1.22. Three
        cards at 18px gap, each 26px padding / 16px radius, with the icon tile
        and status chip on one row, a 17.5px title, 13.5px/1.65 body, and a
        tinted answer line above a 1px rule.
      */}
      <section className="px-5 pt-16 sm:px-12 sm:pt-[72px]">
        <FadeIn whenInView className="max-w-[640px]">
          <div className="text-[11px] font-semibold tracking-[0.12em] text-[#6B7480]">
            WHY TEAMS SWITCH
          </div>
          <h2 className="font-display text-ink-900 mt-3.5 text-[26px] leading-[1.22] font-semibold tracking-[-0.032em] text-pretty sm:text-[33px]">
            Knowing your traffic dropped is not the same as knowing what to do on Monday.
          </h2>
        </FadeIn>

        <Stagger className="mt-8 grid gap-[18px] md:grid-cols-3">
          {PROBLEMS.map((problem) => (
            <StaggerItem key={problem.title} className="h-full">
              <div className="h-full rounded-2xl border border-[#E2E6EC] bg-white p-[26px]">
                <div className="flex items-center justify-between gap-3">
                  <span
                    className={cn(
                      "inline-flex size-9 items-center justify-center rounded-[10px]",
                      problem.tileBg,
                      problem.accent,
                    )}
                  >
                    <problem.icon className="size-[17px]" strokeWidth={1.8} />
                  </span>
                  <span
                    className={cn(
                      "rounded-full px-2.5 py-[3px] text-[10.5px] font-semibold tracking-[0.08em]",
                      problem.tileBg,
                      problem.accent,
                    )}
                  >
                    {problem.eyebrow}
                  </span>
                </div>

                <h3 className="text-ink-900 mt-4 text-[17.5px] font-semibold tracking-[-0.015em]">
                  {problem.title}
                </h3>
                <p className="mt-2 text-[13.5px] leading-[1.65] text-[#5B6472]">
                  {problem.body}
                </p>

                <div className="mt-[18px] flex items-center gap-2 border-t border-[#EDEFF3] pt-4">
                  <ArrowRight className={cn("size-3.5 shrink-0", problem.accent)} />
                  <span className={cn("text-[12.5px] font-medium", problem.accent)}>
                    {problem.answer}
                  </span>
                </div>
              </div>
            </StaggerItem>
          ))}
        </Stagger>
      </section>

      {/*
        How it works. Spec: 76px top padding, centred heading block capped at
        560px, then a `480px minmax(0,1fr)` grid at 56px gap — product shot left,
        a stepped rail right. Each step is a `40px minmax(0,1fr)` grid whose
        left column holds a 40px tile above a 2px gradient connector.
      */}
      <section id="how-it-works" className="px-5 pt-16 sm:px-12 sm:pt-[76px]">
        <FadeIn whenInView className="mx-auto max-w-[560px] text-center">
          <div className="text-[11px] font-semibold tracking-[0.12em] text-[#6B7480]">
            HOW IT WORKS
          </div>
          <h2 className="font-display text-ink-900 mt-3 text-[26px] font-semibold tracking-[-0.032em] sm:text-[33px]">
            Audit, then act — in one loop
          </h2>
          <p className="mt-2.5 text-[15px] leading-[1.6] text-[#5B6472]">
            No dead ends. Every finding ends in something you can publish.
          </p>
        </FadeIn>

        <div className="mt-10 grid items-center gap-10 lg:grid-cols-[480px_minmax(0,1fr)] lg:gap-14">
          <ProductShot label="product shot — audit findings, 960×800" className="h-[400px]" />

          <Stagger className="flex flex-col gap-1">
            {STEPS.map((step, index) => (
              <StaggerItem key={step.step}>
                <div className="grid grid-cols-[40px_minmax(0,1fr)] gap-[18px]">
                  <div className="flex flex-col items-center">
                    <span
                      className={cn(
                        "inline-flex size-10 items-center justify-center rounded-xl",
                        step.tileBg,
                        step.tileText,
                      )}
                    >
                      <step.icon className="size-[18px]" strokeWidth={1.9} />
                    </span>
                    {index < STEPS.length - 1 ? (
                      <span className="my-2 w-0.5 flex-1 bg-gradient-to-b from-[#D3D8E0] to-[#DDE6F4]" />
                    ) : null}
                  </div>

                  <div className={cn("min-w-0", index < STEPS.length - 1 && "pb-3.5")}>
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span
                        className={cn(
                          "text-[10.5px] font-semibold tracking-[0.09em]",
                          step.accent,
                        )}
                      >
                        {step.step}
                      </span>
                      <span
                        className={cn(
                          "rounded-full px-2 py-[2px] text-[11px] font-medium",
                          step.chipBg,
                          step.accent,
                        )}
                      >
                        {step.meta}
                      </span>
                    </div>
                    <h3 className="text-ink-900 mt-[7px] text-[18px] font-semibold tracking-[-0.018em]">
                      {step.title}
                    </h3>
                    <p className="mt-1.5 max-w-[52ch] text-[14px] leading-[1.65] text-[#5B6472]">
                      {step.body}
                    </p>
                  </div>
                </div>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>

      {/*
        Surfaces. A bento grid, not four equal cards: a 3-column track where the
        audits card and the content card each span 2. Spec: 76px top padding,
        620px heading block, 18px gap, cards at 16px radius / 1px #E2E6EC.

        Below `md` everything stacks to one column — the spans would otherwise
        leave a half-width orphan on a phone.
      */}
      <section id="features" className="px-5 pt-16 sm:px-12 sm:pt-[76px]">
        <FadeIn whenInView className="max-w-[620px]">
          <div className="text-[11px] font-semibold tracking-[0.12em] text-[#6B7480]">
            WHAT YOU GET
          </div>
          <h2 className="font-display text-ink-900 mt-3 text-[26px] font-semibold tracking-[-0.032em] sm:text-[33px]">
            Four surfaces, one loop
          </h2>
        </FadeIn>

        <Stagger className="mt-8 grid gap-[18px] md:grid-cols-3">
          {/* Audits — spans 2, header block over a hatched shot. */}
          <StaggerItem className="md:col-span-2">
            <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-[#E2E6EC] bg-white">
              <div className="flex flex-col justify-between gap-4 px-[26px] pt-6 pb-5 sm:flex-row sm:items-start sm:gap-5">
                <div className="min-w-0">
                  <div className="flex items-center gap-2.5">
                    <span className="inline-flex size-[30px] items-center justify-center rounded-[9px] bg-[#E7E9ED]">
                      <FileSearch className="size-4" strokeWidth={1.8} />
                    </span>
                    <span className="text-ink-900 text-[18px] font-semibold tracking-[-0.018em]">
                      Audits that prioritise themselves
                    </span>
                  </div>
                  <p className="mt-2.5 max-w-[58ch] text-[13.5px] leading-[1.65] text-[#5B6472]">
                    Forty findings ordered by the traffic each one puts at risk, so the first
                    three are always the right three.
                  </p>
                </div>

                <div className="flex shrink-0 gap-[7px]">
                  <span className="inline-flex items-center rounded-full border border-[#F6CFCF] bg-[#FEF2F2] px-2.5 py-[3px] text-[11px] font-semibold text-[#B91C1C]">
                    3 critical
                  </span>
                  <span className="inline-flex items-center rounded-full border border-[#F5DFB4] bg-[#FFFBEB] px-2.5 py-[3px] text-[11px] font-semibold text-[#B45309]">
                    9 to fix
                  </span>
                </div>
              </div>

              <ProductShot
                label="product shot — audit findings"
                className="min-h-[210px] flex-1 rounded-none border-0 border-t border-[#EDEFF3]"
              />
            </div>
          </StaggerItem>

          {/* Competitor watch — share-of-voice bars. */}
          <StaggerItem>
            <div className="flex h-full flex-col rounded-2xl border border-[#E2E6EC] bg-white p-[26px]">
              <span className="inline-flex size-[30px] items-center justify-center rounded-[9px] bg-[#FEEFDC]">
                <BarChart3 className="size-4 text-[#B45309]" strokeWidth={1.8} />
              </span>
              <h3 className="text-ink-900 mt-3.5 text-[17px] font-semibold tracking-[-0.018em]">
                Competitor watch
              </h3>
              <p className="mt-2 text-[13.5px] leading-[1.65] text-[#5B6472]">
                Who outranks you on which terms, and what they shipped this month that caused
                it.
              </p>

              <div className="mt-5 flex flex-1 flex-col justify-end gap-[9px]">
                {SHARE_OF_VOICE.map((row) => (
                  <div key={row.label} className="flex items-center gap-2.5">
                    <span className="w-[74px] shrink-0 text-[12px] text-[#5B6472]">
                      {row.label}
                    </span>
                    <span className="h-[5px] flex-1 overflow-hidden rounded-[3px] bg-[#F1F3F7]">
                      <span
                        className={cn("block h-full", row.bar)}
                        style={{ width: `${row.value}%` }}
                      />
                    </span>
                    <span className={cn("text-[12px] font-semibold", row.text)}>
                      {row.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </StaggerItem>

          {/* Keyword tracking — trend line with a movement footer. */}
          <StaggerItem>
            <div className="flex h-full flex-col rounded-2xl border border-[#E2E6EC] bg-white p-[26px]">
              <span className="inline-flex size-[30px] items-center justify-center rounded-[9px] bg-[#E7E9ED]">
                <KeyRound className="size-4" strokeWidth={1.8} />
              </span>
              <h3 className="text-ink-900 mt-3.5 text-[17px] font-semibold tracking-[-0.018em]">
                Keyword tracking with movement
              </h3>
              <p className="mt-2 text-[13.5px] leading-[1.65] text-[#5B6472]">
                Positions, ninety-day trend and the gaps your rivals hold — one table you read
                in a minute.
              </p>

              <div className="mt-5 flex flex-1 flex-col justify-end">
                <svg viewBox="0 0 200 48" width="100%" height="48" preserveAspectRatio="none">
                  <path
                    d="M0,42 L40,38 L80,30 L120,24 L160,14 L200,8"
                    fill="none"
                    stroke="#0B1220"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    vectorEffect="non-scaling-stroke"
                  />
                </svg>
                <div className="mt-2 flex items-center justify-between gap-3">
                  <span className="text-[11.5px] text-[#6B7480]">avg. position 22 → 14.2</span>
                  <span className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-[#15803D]">
                    <ArrowUp className="size-3" strokeWidth={2.4} />
                    +37 on page one
                  </span>
                </div>
              </div>
            </div>
          </StaggerItem>

          {/* Content library — spans 2, copy beside a 300px status list. */}
          <StaggerItem className="md:col-span-2">
            <div className="grid h-full items-center gap-6 rounded-2xl border border-[#E2E6EC] bg-white p-[26px] lg:grid-cols-[minmax(0,1fr)_300px]">
              <div className="min-w-0">
                <span className="inline-flex size-[30px] items-center justify-center rounded-[9px] bg-[#D8F3E4]">
                  <PenLine className="size-4 text-[#0F766E]" strokeWidth={1.8} />
                </span>
                <h3 className="text-ink-900 mt-3.5 text-[18px] font-semibold tracking-[-0.018em]">
                  Briefs and drafts, sourced from findings
                </h3>
                <p className="mt-2 max-w-[52ch] text-[13.5px] leading-[1.65] text-[#5B6472]">
                  Every asset says which keyword gap or competitor move triggered it, so
                  generated copy stays targeted — and exports as clean markdown.
                </p>
              </div>

              <div className="flex flex-col gap-2">
                {CONTENT_ROWS.map((row) => (
                  <div
                    key={row.title}
                    className="flex items-center gap-2.5 rounded-[10px] border border-[#E2E6EC] bg-white px-3.5 py-[11px]"
                  >
                    <span className={cn("size-1.5 shrink-0 rounded-full", row.dot)} />
                    <span className="text-ink-900 min-w-0 flex-1 truncate text-[12.5px]">
                      {row.title}
                    </span>
                    <span className={cn("shrink-0 text-[11px] font-semibold", row.text)}>
                      {row.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </StaggerItem>
        </Stagger>
      </section>

      {/* Pricing. Centred heading block, then the shared table. */}
      <section id="pricing" className="px-5 pt-16 sm:px-12 sm:pt-[76px]">
        <FadeIn whenInView className="mx-auto max-w-[560px] text-center">
          <div className="text-[11px] font-semibold tracking-[0.12em] text-[#6B7480]">
            PRICING
          </div>
          <h2 className="font-display text-ink-900 mt-3 text-[26px] font-semibold tracking-[-0.032em] sm:text-[33px]">
            The audit is free. You pay to publish.
          </h2>
          <p className="mt-2.5 text-[15px] leading-[1.6] text-[#5B6472]">
            Audits are unlimited on every plan. The monthly quota covers billable generation.
          </p>
        </FadeIn>

        <div className="mt-9">
          <PricingTable />
        </div>

        <p className="mt-6 text-center text-[12.5px] text-[#6B7480]">
          Cards and wallets via Dodo Payments. Unused article quota doesn&apos;t roll over.
        </p>
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
