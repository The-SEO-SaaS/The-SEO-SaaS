import type { Metadata } from "next";

import { LegalPage, type LegalSection } from "@/components/marketing/legal-page";
import { MarketingFooter } from "@/components/marketing/site-chrome";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Privacy Policy",
  description:
    "What we collect, why, and how long we keep it. No passwords are ever stored, sessions are hashed, and audit data belongs to the account that claimed it.",
  path: "/privacy",
});

/**
 * The design notes this screen shares the /terms template, so it does — only
 * the sections differ.
 *
 * Content is written against what the app genuinely does: no passwords exist
 * (Google OAuth and magic links only), sessions are stored as SHA-256 hashes,
 * and audits run before any account exists. Saying otherwise would be a
 * privacy policy that misdescribes its own system.
 */
const SECTIONS: LegalSection[] = [
  {
    num: "01",
    title: "What we collect",
    body: (
      <>
        Your email address, and a name and avatar if Google supplies them. Everything else we
        hold is about websites: the pages we crawled, the findings we produced, and the
        keywords you asked us to track.
      </>
    ),
  },
  {
    num: "02",
    title: "There are no passwords",
    body: (
      <>
        Sign-in is Google OAuth or an emailed link, so we never receive or store a password.
        Sessions are kept as a SHA-256 hash of a random token — a copy of our database cannot
        be replayed as a login.
      </>
    ),
  },
  {
    num: "03",
    title: "Audits run before you have an account",
    body: (
      <>
        A free audit needs no sign-up, so at that point the only thing tied to it is the
        domain you entered and the IP that requested it, which we use for rate limiting. Give
        us an email for the report link and we&apos;ll use it for that, and to tell you the
        audit finished.
      </>
    ),
  },
  {
    num: "04",
    title: "Who we share it with",
    body: (
      <>
        Processors only, and only what they need: Serpex for search results, OpenRouter for
        generation, Dodo Payments for billing, and our email provider for delivery. We do not
        sell data and we run no advertising trackers.
      </>
    ),
  },
  {
    num: "05",
    title: "How long we keep it",
    body: (
      <>
        Crawl and ranking history stays while your account is active, because trend charts
        are worthless without it. Thirty days after you close your account we delete it.
        Public reports are removed within one business day of you asking.
      </>
    ),
  },
  {
    num: "06",
    title: "Your rights",
    body: (
      <>
        Ask us for a copy of your data, a correction, or deletion, and we&apos;ll action it
        within thirty days. Email privacy@theseosaas.com — no form, no ticket queue.
      </>
    ),
  },
];

export default function PrivacyPage() {
  return (
    <>
      <LegalPage
        activeLink="privacy"
        title="Privacy Policy"
        intro={
          <>
            What we collect, why we collect it, and how long we keep it. If anything here is
            unclear, email privacy@theseosaas.com and we&apos;ll explain it in normal words.
          </>
        }
        sections={SECTIONS}
        lastUpdated="Last updated 12 June 2026. Earlier versions on request."
      />
      <MarketingFooter />
    </>
  );
}
