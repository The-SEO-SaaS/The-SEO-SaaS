import { FadeIn, Stagger, StaggerItem } from "@theseosaas/ui/components/motion";
import { WordCycle } from "@theseosaas/ui/components/word-cycle";
import { cn } from "@theseosaas/ui/lib/utils";
import {
  ArrowRight,
  ArrowUp,
  ArrowUpRight,
  BarChart3,
  CalendarClock,
  FileSearch,
  KeyRound,
  PenLine,
  Search,
  TrendingDown,
  Users,
  Wrench,
} from "lucide-react";
import Link from "next/link";

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
 * The engines the headline cycles through.
 *
 * Google leads because it's the one that matters; the rest are there to say
 * "search" rather than to claim equal weight. Marks live in
 * `apps/web/public/search-engines/`.
 *
 * Colours are each engine's own brand hue, darkened where the stock value fails
 * contrast against white at headline weight — Brave's #FB542B and DuckDuckGo's
 * #DE5833 both sit near 3:1, which is fine for a 56px display face but not
 * something to reuse at body size.
 *
 * "Brave Search" rather than "Brave": the browser and the engine are different
 * products, and only one of them is what this sentence is about.
 */
const ENGINES = [
  {
    label: "Google",
    // Six letters, three of the wordmark's own hues, two letters each — the
    // logo's colours are blue #4285F4, red #EA4335, yellow #FBBC05 and green
    // #34A853, taken here in the order they first appear.
    //
    // One caveat worth knowing: #FBBC05 on white is about 1.7:1, well under the
    // 4.5:1 body-text threshold. At 54px display weight it's legible, and it is
    // Google's actual yellow, so it stays — but say the word and I'll swap the
    // last run for the logo's green #34A853, which clears 3:1 and keeps the
    // colours authentic.
    segments: [
      { text: "Go", color: "#4285F4" },
      { text: "og", color: "#EA4335" },
      { text: "le", color: "#FBBC05" },
    ],
    icon: "/search-engines/google.png",
  },
  { label: "Bing", color: "#3298EE", icon: "/search-engines/bing.png" },
  { label: "DuckDuckGo", color: "#FF3D00", icon: "/search-engines/duckduckgo.png" },
  // "Brave Search", not "Brave": the browser and the engine are different
  // products, and only one of them is what this sentence is about.
  { label: "Brave Search", color: "#F4592B", icon: "/search-engines/brave.png" },
  { label: "Yahoo", color: "#5E35B1", icon: "/search-engines/yahoo.png" },
];

/**
 * The stakes section — why organic traffic, before any claim about our tool.
 *
 * This sits ahead of "why teams switch" on purpose. That section argues we're
 * the better way to do SEO; this one argues SEO is worth doing at all, which is
 * the prior question for a founder who has been buying ads and not thinking
 * about search. Same card treatment, so the two read as one argument.
 */
const STAKES = [
  {
    eyebrow: "NO VISITORS, NO TRIALS",
    icon: Users,
    tileBg: "bg-[#E7E9ED]",
    accent: "text-ink-900",
    body: "The best onboarding flow in the world converts zero people if zero people arrive. Traffic isn't a vanity metric here — it's the top of every funnel you've built.",
  },
  {
    eyebrow: "SOMEONE ALREADY RANKS FOR YOUR BUYER'S QUESTION",
    icon: TrendingDown,
    tileBg: "bg-[#FEEFDC]",
    accent: "text-[#B45309]",
    body: "Right now, that's a competitor. Not because their product is better — because they published first, or published more.",
  },
  {
    eyebrow: "IT'S THE ONLY CHANNEL THAT PAYS OUT LATER",
    icon: CalendarClock,
    tileBg: "bg-[#D8F3E4]",
    accent: "text-[#0F766E]",
    body: "An article you publish today can still be bringing in visitors a year from now. That's what makes it worth building on purpose instead of hoping for.",
  },
];

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
    body: "Every other tool hands you a keyword list and stops. Someone still has to write the page.",
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
    body: "Point us at your domain. We check you against three competitors and see who's beating you, and why.",
  },
  {
    step: "STEP 02",
    meta: "3 fixes that matter",
    icon: FileSearch,
    tileBg: "bg-[#FEEFDC]",
    tileText: "text-[#B45309]",
    chipBg: "bg-[#FFFBF5]",
    accent: "text-[#B45309]",
    title: "See what it's costing you",
    body: "Skip the 40-item to-do list. We tell you the three things to fix first, and how much traffic each one is worth.",
  },
  {
    step: "STEP 03",
    meta: "Ready to go",
    icon: PenLine,
    tileBg: "bg-[#D8F3E4]",
    tileText: "text-[#0F766E]",
    chipBg: "bg-[#F5FCF8]",
    accent: "text-[#0F766E]",
    title: "Publish the fix",
    body: "Get a finished, on-brand article for each gap — ready to publish today, not another task on your backlog.",
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
  // Orange for the competitor ahead of you, ink for you, grey for the one
  // behind. Three tones instead of one so the ranking is legible before you've
  // read a single label — the row that should worry you is the coloured one.
  { label: "darkroast", value: 82, bar: "bg-[#EA580C]", text: "text-[#9A3412]" },
  { label: "you", value: 74, bar: "bg-ink-900", text: "text-ink-900" },
  { label: "brewline", value: 61, bar: "bg-[#C6CDD8]", text: "text-[#6B7480]" },
];

const CTA_CARDS = [
  {
    title: "Need a sample report?",
    body: "See what a finished audit looks like before you run one on your own site.",
    href: "/blog",
  },
  {
    title: "Not ready to hand over a domain?",
    body: "Read the three steps first — from a URL to a published article, with nothing to install.",
    href: "/#how-it-works",
  },
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
      {/*
        Top padding was 180px at `xl`, traced from the design's canvas. On a
        1366×768 laptop — the most common desktop viewport there is — that put
        the audit input, the single thing this page exists to get a domain into,
        below the fold, with the top of the screen showing empty space above the
        headline. 72px keeps the design's airy proportions and puts the input
        back on the first screen.
      */}
      <section
        id="hero"
        className="relative flex flex-col items-center px-5 pt-12 sm:px-10 sm:pt-16 xl:pt-[72px]"
      >
        {/*
          The proof cards moved up with the headline and shrank a size. They're
          decorative, so they follow the hero rather than holding their traced
          offsets — left at 148/368 they'd have floated far below the copy they
          flank.
        */}
        <ProofCard
          className="left-8 top-[30px]"
          eyebrow="RANKINGS"
          delta={{ label: "+37", tone: "up" }}
          title="Keywords on page one"
          footer="Six months, one site"
          spark="M0,34 L38,30 L76,24 L114,17 L152,11 L190,5"
          sparkTone="up"
        />
        <ProofCard
          className="left-8 top-[212px]"
          eyebrow="SEO SCORE"
          title={
            <>
              <span className="text-[#B45309]">68</span>
              <span className="text-[#9AA2AF]"> → </span>
              <span className="text-[#15803D]">74</span>
            </>
          }
          footer="After the first three fixes"
        />
        <ProofCard
          className="right-8 top-[30px]"
          eyebrow="COMPETITORS"
          delta={{ label: "4 tracked", tone: "neutral" }}
          title="Who takes your terms"
          footer="Checked every day"
        />
        <ProofCard
          className="right-8 top-[212px]"
          eyebrow="GAP CLOSED"
          title={
            <>
              <span className="text-[#15803D]">9 keywords</span> recovered
            </>
          }
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

          {/*
            The engine gets its own line, hard-broken rather than left to wrap.
            Inline, a long name like "DuckDuckGo" or "Brave Search" would push
            the headline from two lines to three on some ticks and back on
            others, so the block below it jumped every few seconds. On a
            dedicated centred line the width change resolves symmetrically and
            nothing under it moves.

            No `text-balance` for the same reason: the balancer re-runs on every
            flip, and re-wrapping the first line is exactly the twitch this is
            avoiding.
          */}
          <h1 className="font-display text-ink-900 mt-[20px] text-[34px] leading-[1.08] font-semibold tracking-[-0.04em] sm:text-[44px] lg:text-[54px]">
            Get more traffic from
            <span className="mt-[2px] flex items-center justify-center">
              <WordCycle words={ENGINES} suffix="." />
            </span>
          </h1>

          <p className="mx-auto mt-[16px] max-w-[60ch] text-[15px] leading-[1.6] text-[#5B6472] sm:text-[17px]">
            We crawl your site and every competitor ranking above you, find the keywords they
            own and you don&apos;t, and generate the content to close that gap — prioritized by
            traffic potential, not alphabetical order.
          </p>
        </FadeIn>

        <FadeIn delay={0.1} className="w-full max-w-[620px]">
          <div className="mt-[26px]">
            <AuditInput />
          </div>
          <p className="mt-[11px] text-center text-[12.5px] text-[#6B7480]">
            About eight minutes for a 400-page site. You get a shareable report link.
          </p>
        </FadeIn>
      </section>

      {/*
        The hero screenshot slot.

        Deliberately reserved now rather than added when the capture exists: the
        proof cards flanking the hero are positioned against this section's top
        edge, so dropping a 520px block in later would move them. Holding the
        space keeps that layout settled.

        Sized on aspect ratio rather than a fixed height so it can't letterbox a
        real 16:10 capture, and capped at 1120px because a dashboard screenshot
        stretched past that stops being readable at the density it was taken.
        Swap `ProductShot` for an <Image> when the capture lands — nothing else
        here needs to change.
      */}
      <section className="px-5 pt-12 sm:px-12 sm:pt-16">
        <FadeIn whenInView delay={0.05} className="mx-auto w-full max-w-[1120px]">
          <ProductShot
            label="product shot — dashboard, 1440×900"
            className="aspect-[16/10] w-full shadow-[0_28px_70px_-40px_rgba(11,18,32,0.35)]"
          />
        </FadeIn>
      </section>

      {/*
        The stakes. Reuses the problem section's geometry exactly — same 72px
        top padding, same 640px heading block, same 18px card grid — because
        this and "why teams switch" are two halves of one argument and shouldn't
        look like two different templates.

        The cards carry no title line of their own: the eyebrow *is* the claim
        here ("NO VISITORS, NO TRIALS"), so a heading under it would only repeat
        it in longer words. That's why the chip sits on its own row rather than
        opposite the icon tile — a 40-character eyebrow won't fit beside one.
      */}
      <section className="px-5 pt-16 sm:px-12 sm:pt-[72px]">
        <FadeIn whenInView className="max-w-[640px]">
          <div className="text-[11px] font-semibold tracking-[0.12em] text-[#6B7480]">
            THE PROBLEM
          </div>
          <h2 className="font-display text-ink-900 mt-3.5 text-[26px] leading-[1.22] font-semibold tracking-[-0.032em] text-pretty sm:text-[33px]">
            A SaaS without traffic can&apos;t get sales
          </h2>
          <p className="mt-4 text-[15px] leading-[1.65] text-[#5B6472]">
            Every unread landing page says the same thing underneath the design: nobody found
            this. Ads buy attention for as long as you keep paying for it. Organic traffic buys
            attention for as long as the page exists.
          </p>
        </FadeIn>

        <Stagger className="mt-8 grid gap-[18px] md:grid-cols-3">
          {STAKES.map((stake) => (
            <StaggerItem key={stake.eyebrow} className="h-full">
              <div className="h-full rounded-2xl border border-[#E2E6EC] bg-white p-[26px]">
                <span
                  className={cn(
                    "inline-flex size-9 items-center justify-center rounded-[10px]",
                    stake.tileBg,
                    stake.accent,
                  )}
                >
                  <stake.icon className="size-[17px]" strokeWidth={1.8} />
                </span>

                <h3
                  className={cn(
                    "mt-4 text-[11px] font-semibold tracking-[0.08em] uppercase",
                    stake.accent,
                  )}
                >
                  {stake.eyebrow}
                </h3>
                <p className="mt-2.5 text-[13.5px] leading-[1.65] text-[#5B6472]">
                  {stake.body}
                </p>
              </div>
            </StaggerItem>
          ))}
        </Stagger>

        {/*
          Bridge. Centred and quiet — it exists to hand the reader from the
          stakes to the mechanism, so it shouldn't compete with either heading.
        */}
        <FadeIn whenInView className="mt-10 text-center">
          <p className="text-ink-900 text-[15px] font-medium">
            That&apos;s the traffic problem. Here&apos;s how we close it.
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
            No dead ends. Every step ends in something you can publish.
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
            Four ways we keep you moving
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
                      Know what to fix first
                    </span>
                  </div>
                  <p className="mt-2.5 max-w-[58ch] text-[13.5px] leading-[1.65] text-[#5B6472]">
                    No wall of data to sort through yourself — just the handful of fixes that
                    will actually move your rankings, in the order to do them.
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
                See what&apos;s working for competitors
              </h3>
              <p className="mt-2 text-[13.5px] leading-[1.65] text-[#5B6472]">
                Who&apos;s outranking you, on which terms, and what they did to get there —
                checked automatically so you&apos;re never caught off guard.
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
                Watch your rankings climb
              </h3>
              <p className="mt-2 text-[13.5px] leading-[1.65] text-[#5B6472]">
                Track your position for every keyword that matters, so you can see the payoff
                from every fix and every published post.
              </p>

              <div className="mt-5 flex flex-1 flex-col justify-end">
                {/*
                  Green, not ink. The line and the "+37" chip below it are the
                  same claim stated twice — colouring only one of them made the
                  chart read as neutral data sitting next to a good number,
                  rather than as the reason for it.
                */}
                <svg viewBox="0 0 200 48" width="100%" height="48" preserveAspectRatio="none">
                  <path
                    d="M0,42 L40,38 L80,30 L120,24 L160,14 L200,8"
                    fill="none"
                    stroke="#15803D"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    vectorEffect="non-scaling-stroke"
                  />
                </svg>
                <div className="mt-2 flex items-center justify-between gap-3">
                  <span className="text-[11.5px] text-[#6B7480]">
                    avg. position <span className="font-semibold text-[#B45309]">22</span> →{" "}
                    <span className="font-semibold text-[#15803D]">14.2</span>
                  </span>
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
                  Get the content, not just the plan
                </h3>
                <p className="mt-2 max-w-[52ch] text-[13.5px] leading-[1.65] text-[#5B6472]">
                  Every gap comes with a finished article, ready to publish — written around
                  the exact keyword or competitor move that&apos;s costing you traffic.
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

        <p className="mx-auto mt-6 max-w-[68ch] text-center text-[12.5px] leading-[1.6] text-[#6B7480]">
          Cards and wallets via Dodo Payments. Unused article quota doesn&apos;t roll over.
          Re-run an audit any time after you&apos;ve made changes — it&apos;s unlimited on every
          plan.
        </p>
      </section>

      {/*
        Closing CTA. Spec: 80px/48px/72px padding, a `minmax(0,1fr) 380px` grid
        at 56px gap, with a 44px-deep bottom rule closing the section. Copy left
        at 35px/-0.032em/1.22 capped to 26ch, two side-by-side actions; two
        bordered cards right, each with a 30px outlined arrow tile.
      */}
      <section className="px-5 pt-16 pb-14 sm:px-12 sm:pt-20 sm:pb-[72px]">
        <div className="grid items-start gap-10 border-b border-[#EDEFF3] pb-11 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-14">
          <FadeIn whenInView>
            <h2 className="font-display text-ink-900 max-w-[26ch] text-[26px] leading-[1.22] font-semibold tracking-[-0.032em] text-pretty sm:text-[35px]">
              Find out what your site is losing, before your competitor does.
            </h2>
            <p className="mt-3.5 max-w-[52ch] text-[15px] leading-[1.65] text-[#5B6472]">
              Run the free audit and see exactly which keywords are costing you traffic — and
              what to publish to win them back.
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-3.5">
              <Link
                href="/#hero"
                className="bg-ink-900 rounded-[10px] px-[22px] py-[13px] text-[14px] font-medium text-white no-underline transition-opacity hover:opacity-90 hover:no-underline"
              >
                Run free audit
              </Link>
              <Link
                href="/blog"
                className="text-[13.5px] text-[#5B6472] no-underline hover:no-underline"
              >
                See a sample report
              </Link>
            </div>
          </FadeIn>

          <Stagger className="flex flex-col gap-3.5">
            {CTA_CARDS.map((card) => (
              <StaggerItem key={card.title}>
                <Link
                  href={card.href}
                  className="flex items-start justify-between gap-4 rounded-2xl border border-[#E2E6EC] px-[22px] py-5 no-underline transition-colors hover:border-[#DFE3EA] hover:bg-[#FAFBFC] hover:no-underline"
                >
                  <div className="min-w-0">
                    <div className="text-ink-900 text-[14.5px] font-semibold tracking-[-0.01em]">
                      {card.title}
                    </div>
                    <p className="mt-1.5 text-[13px] leading-[1.55] text-[#5B6472]">
                      {card.body}
                    </p>
                  </div>
                  <span className="inline-flex size-[30px] shrink-0 items-center justify-center rounded-[10px] border border-[#DFE3EA]">
                    <ArrowUpRight className="size-3.5" strokeWidth={1.8} />
                  </span>
                </Link>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </section>

      <MarketingFooter />
    </>
  );
}
