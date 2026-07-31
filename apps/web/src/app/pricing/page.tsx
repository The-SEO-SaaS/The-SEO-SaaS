import { INCLUDED_IN_EVERY_PLAN } from "@theseosaas/core/plans";
import { Card, CardContent } from "@theseosaas/ui/components/card";
import { FadeIn } from "@theseosaas/ui/components/motion";
import { Check } from "lucide-react";
import type { Metadata } from "next";

import { MarketingFooter, MarketingHeader } from "@/components/marketing/site-chrome";
import { PricingTable } from "@/components/marketing/pricing-table";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Pricing",
  description:
    "Every plan includes every feature. Pick the limits that match how much you plan to publish. From $19.99 a month, cancel any time.",
  path: "/pricing",
});

/**
 * Standalone pricing route.
 *
 * The landing page already has a pricing section, but a dedicated URL is worth
 * having on its own: it's what gets linked from Reddit, from the in-app upgrade
 * prompts, and from any comparison post. All the numbers come from
 * `@theseosaas/core/plans`, so this page and the section on `/` can never
 * disagree.
 */
const FAQ = [
  {
    question: "What counts as a site?",
    answer:
      "One domain you're growing. Each site gets its own audits, competitors, keywords and content. Starter covers one; Growth covers three; Scale covers ten.",
  },
  {
    question: "What happens when I hit a limit?",
    answer:
      "Nothing breaks and nothing is deleted. You're told which limit you've reached and offered the choice to free up room or move up a plan. Untracking a keyword keeps its ranking history, so you can put it back later without losing anything.",
  },
  {
    question: "Are the audits really unlimited?",
    answer:
      "Yes, on every plan. Audits are how the product earns trust, so metering them would be self-defeating. What's metered is AI generation, because each article has a real model cost behind it.",
  },
  {
    question: "Do I need a card for the free audit?",
    answer:
      "No. The free audit needs no account at all — paste a URL and you get the full score, your top issues, competitors and keyword gaps. A plan is only needed once you want us to act on those findings.",
  },
  {
    question: "Can I change or cancel later?",
    answer:
      "Any time, from your settings. Switching plans takes effect immediately and is prorated by our payment provider. Cancelling leaves your data in place until the end of the period you've paid for.",
  },
];

export default function PricingPage() {
  return (
    <>
      <MarketingHeader />

      <main>
        <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
          <FadeIn className="mx-auto max-w-2xl space-y-3 text-center">
            <div className="eyebrow text-ink-300">Pricing</div>
            <h1 className="font-display text-ink-900 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
              Every plan includes every feature
            </h1>
            <p className="text-ink-400 text-lg leading-relaxed text-pretty">
              There are no locked features to hunt for. Plans differ only by how much you can
              track and generate, so the only question is how much you plan to publish.
            </p>
          </FadeIn>

          <div className="mt-10 sm:mt-12">
            <PricingTable />
          </div>
        </section>

        <section className="bg-surface-subtle border-line border-y">
          <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
            <FadeIn whenInView className="space-y-6">
              <div className="eyebrow text-ink-300">In every plan</div>
              <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {INCLUDED_IN_EVERY_PLAN.map((item) => (
                  <li key={item} className="flex items-start gap-2.5">
                    <Check className="text-success mt-0.5 size-4 shrink-0" strokeWidth={3} />
                    <span className="text-ink-500 text-base leading-relaxed">{item}</span>
                  </li>
                ))}
              </ul>
            </FadeIn>
          </div>
        </section>

        <section className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
          <FadeIn whenInView className="space-y-6">
            <h2 className="font-display text-ink-900 text-2xl font-semibold tracking-tight">
              Questions
            </h2>

            <div className="space-y-3">
              {FAQ.map((entry) => (
                <Card key={entry.question} variant="default">
                  <CardContent className="space-y-1.5">
                    <h3 className="text-ink-900 text-base font-medium">{entry.question}</h3>
                    <p className="text-ink-400 text-sm leading-relaxed">{entry.answer}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </FadeIn>
        </section>
      </main>

      <MarketingFooter />
    </>
  );
}
