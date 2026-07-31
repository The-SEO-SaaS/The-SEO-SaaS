import type { Metadata } from "next";

import { LegalPage, type LegalSection } from "@/components/marketing/legal-page";
import { MarketingFooter } from "@/components/marketing/site-chrome";

export const metadata: Metadata = {
  title: "Terms of Service — TheSEOSaaS",
  description:
    "Plain terms for a tool that crawls websites and writes about them.",
};

/**
 * Section copy follows the design's voice: short, concrete, and specific to
 * what this product actually does. Anything that states a commitment — refund
 * window, retention period, liability cap — is written as a real number rather
 * than boilerplate, because vague legal text is worse than none.
 */
const SECTIONS: LegalSection[] = [
  {
    num: "01",
    title: "Who we are",
    body: (
      <>
        TheSEOSaaS is operated by Field Notes Software Ltd, registered in England. When these
        terms say &ldquo;we&rdquo;, that&apos;s who you&apos;re dealing with.
      </>
    ),
  },
  {
    num: "02",
    title: "Using the service",
    body: (
      <>
        You may crawl and analyse sites you own or have permission to audit. You may not use
        the service to attack or scrape abusive rates, or resell raw crawl data as your own
        product.
      </>
    ),
  },
  {
    num: "03",
    title: "Free audits and public reports",
    body: (
      <>
        Reports created at <code className="text-[13.5px]">/audit</code> are reachable by
        anyone holding the link, because that&apos;s the point. You can ask us to unpublish a
        report at any time and we will remove it within one business day.
      </>
    ),
  },
  {
    num: "04",
    title: "Subscriptions and quotas",
    body: (
      <>
        Plans include a monthly allowance of generated content — five on Starter, twenty on
        Growth, fifty on Scale. Unused allowance does not carry over. Audits and rank checks
        are not metered.
      </>
    ),
  },
  {
    num: "05",
    title: "Your content and data",
    body: (
      <>
        Copy generated for you is yours to publish, edit or delete. We keep crawl data for as
        long as your account is active so trend charts stay meaningful, and delete it 30 days
        after closure.
      </>
    ),
  },
  {
    num: "06",
    title: "Cancellation and refunds",
    body: (
      <>
        Cancel whenever you like and the plan runs to the end of the paid period. If you
        cancel within seven days of a first payment and have generated nothing, we refund in
        full.
      </>
    ),
  },
  {
    num: "07",
    title: "Liability",
    body: (
      <>
        We give you findings and recommendations, not guaranteed rankings. Search engines
        change, and our liability is limited to the fees you paid us in the previous three
        months.
      </>
    ),
  },
  {
    num: "08",
    title: "Changes to these terms",
    body: (
      <>
        If we change anything material we email account holders at least fourteen days before
        it takes effect, with a plain summary of what moved.
      </>
    ),
  },
];

export default function TermsPage() {
  return (
    <>
      <LegalPage
        activeLink="terms"
        title="Terms of Service"
        intro={
          <>
            Plain terms for a tool that crawls websites and writes about them. If something
            here is unclear, email legal@theseosaas.com and we&apos;ll explain it in normal
            words.
          </>
        }
        sections={SECTIONS}
        lastUpdated="Last updated 12 June 2026. Earlier versions on request."
      />
      <MarketingFooter />
    </>
  );
}
