import { Card, CardContent } from "@theseosaas/ui/components/card";
import { FadeIn, Stagger, StaggerItem } from "@theseosaas/ui/components/motion";
import { ArrowUpRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { AuditInput } from "@/components/marketing/audit-input";
import { MarketingFooter, MarketingHeader } from "@/components/marketing/site-chrome";

export const metadata: Metadata = {
  title: "About — TheSEOSaaS",
  description:
    "Why TheSEOSaaS exists: most SEO tools stop at the diagnosis. We finish the job by writing the pages that close the gap.",
};

/**
 * About.
 *
 * Linked from the nav and the footer, and previously a 404 — which is a bad
 * look on a product asking founders to hand over their domain.
 *
 * Written as an argument rather than a company history, because there isn't a
 * company history worth telling yet and pretending otherwise is the fastest way
 * to lose a sceptical reader. What a SaaS founder actually wants to know before
 * pasting their URL is: what does this do that the tool I already ignore
 * doesn't, and who is behind it. Those are the two sections.
 *
 * Deliberately no team photos, no "our mission is to democratise", no founding
 * date. One person builds this; saying so plainly is more credible than the
 * alternative.
 */

const BELIEFS = [
  {
    title: "A finding you can't act on is trivia",
    body: "Every tool in this category can tell you a title tag is too long. Almost none will tell you which of your forty problems is worth an afternoon, and none of them will write the page. Ranking findings by traffic at risk is the whole product; the crawl is just how we get there.",
  },
  {
    title: "The gap is the unit of work, not the keyword",
    body: "A keyword list is a research artefact. What actually moves a ranking is a page that answers something a competitor already answers and you don't. So we look at who outranks you, find what they cover, and produce the article — not a row in a spreadsheet that becomes someone's Monday problem.",
  },
  {
    title: "Say what we measured, and what we didn't",
    body: "The audit reports a Speed score derived from server response time, and labels it as exactly that rather than implying a rendering benchmark we don't run. Keyword difficulty is our own estimate from search-result composition, and it says so. An SEO tool that overstates its precision is the norm; it's also the reason most founders stopped trusting them.",
  },
];

const NUMBERS = [
  { value: "~8 min", label: "A full audit on a 400-page site" },
  { value: "3", label: "Competitors checked against you, every run" },
  { value: "$0", label: "Cost of the audit — no account needed" },
];

export default function AboutPage() {
  return (
    <>
      <MarketingHeader />

      <main>
        <section className="mx-auto max-w-4xl px-5 pt-14 pb-10 sm:px-6 sm:pt-20">
          <FadeIn className="space-y-5">
            <div className="text-[11px] font-semibold tracking-[0.12em] text-[#6B7480]">
              ABOUT
            </div>
            <h1 className="font-display text-ink-900 text-[32px] leading-[1.14] font-semibold tracking-[-0.035em] text-pretty sm:text-[42px]">
              Most SEO tools stop at the diagnosis.
            </h1>
            <p className="max-w-[60ch] text-[16px] leading-[1.7] text-[#5B6472]">
              You already know your traffic is flat. What you don&apos;t know is which of the
              forty things a crawler flagged is actually costing you signups, or what to
              publish instead. TheSEOSaaS exists to answer the second question, because the
              first one has been solved for a decade and it never made anyone any money.
            </p>
          </FadeIn>
        </section>

        <section className="mx-auto max-w-4xl px-5 pb-4 sm:px-6">
          <Stagger className="grid gap-[18px] sm:grid-cols-3">
            {NUMBERS.map((item) => (
              <StaggerItem key={item.label}>
                <div className="rounded-2xl border border-[#E2E6EC] bg-white p-[22px]">
                  <div className="font-display text-ink-900 text-[26px] font-semibold tracking-[-0.03em]">
                    {item.value}
                  </div>
                  <div className="mt-1.5 text-[13px] leading-[1.55] text-[#5B6472]">
                    {item.label}
                  </div>
                </div>
              </StaggerItem>
            ))}
          </Stagger>
        </section>

        <section className="mx-auto max-w-4xl space-y-6 px-5 py-12 sm:px-6 sm:py-16">
          <FadeIn whenInView className="max-w-[640px]">
            <div className="text-[11px] font-semibold tracking-[0.12em] text-[#6B7480]">
              HOW WE THINK ABOUT IT
            </div>
            <h2 className="font-display text-ink-900 mt-3.5 text-[26px] leading-[1.22] font-semibold tracking-[-0.032em] sm:text-[31px]">
              Three opinions the product is built on
            </h2>
          </FadeIn>

          <Stagger className="space-y-4">
            {BELIEFS.map((belief, index) => (
              <StaggerItem key={belief.title}>
                <Card variant="panel">
                  <CardContent className="grid gap-4 sm:grid-cols-[44px_minmax(0,1fr)] sm:gap-6">
                    <div className="font-display text-[22px] font-semibold text-[#C6CDD8] tabular-nums">
                      {String(index + 1).padStart(2, "0")}
                    </div>
                    <div>
                      <h3 className="text-ink-900 text-[17.5px] font-semibold tracking-[-0.018em]">
                        {belief.title}
                      </h3>
                      <p className="mt-2 max-w-[62ch] text-[14px] leading-[1.7] text-[#5B6472]">
                        {belief.body}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </StaggerItem>
            ))}
          </Stagger>
        </section>

        <section className="mx-auto max-w-4xl px-5 pb-12 sm:px-6 sm:pb-16">
          <FadeIn whenInView>
            <Card variant="panel">
              <CardContent className="space-y-4">
                <div className="text-[11px] font-semibold tracking-[0.12em] text-[#6B7480]">
                  WHO BUILDS IT
                </div>
                <h2 className="font-display text-ink-900 text-[22px] font-semibold tracking-[-0.025em]">
                  One developer, in the open
                </h2>
                <p className="max-w-[62ch] text-[14.5px] leading-[1.7] text-[#5B6472]">
                  TheSEOSaaS is built and run by Kin. There&apos;s no support rota and no
                  sales team — email goes to the person who wrote the code, which is
                  occasionally slower and always more useful. If something in a report looks
                  wrong, say so; that feedback changes the product within the week.
                </p>
                <div className="flex flex-wrap items-center gap-3.5 pt-1">
                  <Link
                    href="/contact"
                    className="bg-ink-900 rounded-[10px] px-[18px] py-[11px] text-[13.5px] font-medium text-white no-underline transition-opacity hover:opacity-90 hover:no-underline"
                  >
                    Get in touch
                  </Link>
                  <Link
                    href="/blog"
                    className="inline-flex items-center gap-1 text-[13.5px] text-[#5B6472] no-underline"
                  >
                    Read the field notes
                    <ArrowUpRight className="size-3.5" strokeWidth={1.8} />
                  </Link>
                </div>
              </CardContent>
            </Card>
          </FadeIn>
        </section>

        {/*
          The page ends in the same input the landing page opens with. Someone
          who read this far is deciding, and the worst thing to give them at that
          moment is a link back to the homepage to find the field again.
        */}
        <section className="mx-auto max-w-4xl px-5 pb-16 sm:px-6 sm:pb-20">
          <FadeIn whenInView className="mx-auto max-w-[620px] text-center">
            <h2 className="font-display text-ink-900 text-[24px] font-semibold tracking-[-0.03em] sm:text-[28px]">
              See what your site is losing
            </h2>
            <p className="mx-auto mt-2.5 max-w-[48ch] text-[14.5px] leading-[1.65] text-[#5B6472]">
              The audit is free and needs no account. About eight minutes for a 400-page site.
            </p>
            <div className="mt-6">
              <AuditInput />
            </div>
          </FadeIn>
        </section>
      </main>

      <MarketingFooter />
    </>
  );
}
