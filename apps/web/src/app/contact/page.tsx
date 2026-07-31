import { Card, CardContent } from "@theseosaas/ui/components/card";
import { FadeIn, Stagger, StaggerItem } from "@theseosaas/ui/components/motion";
import { XIcon } from "@theseosaas/ui/components/x-icon";
import { ArrowUpRight, Mail } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { MarketingFooter, MarketingHeader } from "@/components/marketing/site-chrome";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Contact",
  description:
    "Email kin@theseosaas.com or find us on X. Questions about a report, a bug, or a plan all go to the person who wrote the code.",
  path: "/contact",
});

const EMAIL = "kin@theseosaas.com";
const X_HANDLE = "codewithkin";

/**
 * Contact.
 *
 * A mailto and an X link rather than a contact form, deliberately. A form on a
 * one-person product is a worse experience in both directions: the sender loses
 * their own copy of what they wrote and can't attach the screenshot that would
 * have explained the whole problem, and it needs a spam story, a delivery story
 * and a database table to do a job the user's mail client already does well.
 *
 * The "what to include" list exists because most support threads on a tool like
 * this die on a missing report link. Asking for it up front turns a three-mail
 * exchange into one.
 */

const CHANNELS = [
  {
    icon: Mail,
    label: "Email",
    value: EMAIL,
    href: `mailto:${EMAIL}`,
    note: "Best for anything with detail — a report that looks wrong, billing, or a bug. Replies usually land within a day.",
  },
  {
    icon: XIcon,
    label: "X",
    value: `@${X_HANDLE}`,
    href: `https://x.com/${X_HANDLE}`,
    note: "Quick questions, feature arguments, and whatever's being built this week.",
    external: true,
  },
];

const INCLUDE = [
  "The report link, if it's about an audit — every audit has a shareable URL.",
  "Your site's domain, so the crawl can be checked against what you're seeing.",
  "What you expected, and what actually happened. A screenshot beats a paragraph.",
];

export default function ContactPage() {
  return (
    <>
      <MarketingHeader />

      <main>
        <section className="mx-auto max-w-4xl px-5 pt-14 pb-8 sm:px-6 sm:pt-20">
          <FadeIn className="space-y-4">
            <div className="text-[11px] font-semibold tracking-[0.12em] text-[#6B7480]">
              CONTACT
            </div>
            <h1 className="font-display text-ink-900 text-[32px] leading-[1.14] font-semibold tracking-[-0.035em] sm:text-[40px]">
              Talk to the person who built it
            </h1>
            <p className="max-w-[56ch] text-[16px] leading-[1.7] text-[#5B6472]">
              There&apos;s no support queue and no first-line triage. Whatever you send goes
              straight to Kin, which is occasionally slower than a help desk and considerably
              more useful.
            </p>
          </FadeIn>
        </section>

        <section className="mx-auto max-w-4xl px-5 pb-10 sm:px-6">
          <Stagger className="grid gap-[18px] sm:grid-cols-2">
            {CHANNELS.map((channel) => (
              <StaggerItem key={channel.label} className="h-full">
                <a
                  href={channel.href}
                  {...(channel.external
                    ? { target: "_blank", rel: "noreferrer noopener" }
                    : {})}
                  className="flex h-full flex-col rounded-2xl border border-[#E2E6EC] bg-white p-[26px] no-underline transition-colors hover:border-[#DFE3EA] hover:bg-[#FAFBFC] hover:no-underline"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="inline-flex size-9 items-center justify-center rounded-[10px] bg-[#E7E9ED]">
                      <channel.icon className="text-ink-900 size-[16px]" />
                    </span>
                    <ArrowUpRight className="size-4 text-[#9AA2AF]" strokeWidth={1.8} />
                  </div>

                  <div className="text-ink-900 mt-4 text-[11px] font-semibold tracking-[0.08em]">
                    {channel.label.toUpperCase()}
                  </div>
                  <div className="text-ink-900 mt-1 text-[16px] font-semibold tracking-[-0.018em] break-all">
                    {channel.value}
                  </div>
                  <p className="mt-2.5 text-[13.5px] leading-[1.65] text-[#5B6472]">
                    {channel.note}
                  </p>
                </a>
              </StaggerItem>
            ))}
          </Stagger>
        </section>

        <section className="mx-auto max-w-4xl px-5 pb-16 sm:px-6 sm:pb-20">
          <FadeIn whenInView>
            <Card variant="panel">
              <CardContent className="space-y-4">
                <h2 className="font-display text-ink-900 text-[19px] font-semibold tracking-[-0.022em]">
                  What to include
                </h2>
                <ul className="space-y-2.5">
                  {INCLUDE.map((item) => (
                    <li key={item} className="flex items-start gap-2.5">
                      <span className="bg-ink-900 mt-[7px] size-[5px] shrink-0 rounded-full" />
                      <span className="text-[14px] leading-[1.65] text-[#5B6472]">{item}</span>
                    </li>
                  ))}
                </ul>
                <p className="border-t border-[#EDEFF3] pt-4 text-[13px] leading-[1.65] text-[#6B7480]">
                  Chasing a report that never arrived? Check{" "}
                  <Link href="/status">the status page</Link> first — if a crawl is queued
                  behind an incident, that page will say so before an email can.
                </p>
              </CardContent>
            </Card>
          </FadeIn>
        </section>
      </main>

      <MarketingFooter />
    </>
  );
}
