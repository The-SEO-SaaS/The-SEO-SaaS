import { health } from "@theseosaas/core";
import { Card, CardContent } from "@theseosaas/ui/components/card";
import { FadeIn, Stagger, StaggerItem } from "@theseosaas/ui/components/motion";
import { cn } from "@theseosaas/ui/lib/utils";
import { AlertTriangle, Check, X } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { MarketingFooter, MarketingHeader } from "@/components/marketing/site-chrome";

export const metadata: Metadata = {
  title: "Status — TheSEOSaaS",
  description:
    "Live status for the audit engine, search data, content generation, email and the database.",
};

/**
 * Public status page.
 *
 * Every row is a real check performed when this page renders — see
 * `packages/core/src/health`. Nothing here is hardcoded, which is the entire
 * point: a status page that can't go red is decoration, and the first time
 * someone relies on it during an outage is the last time they believe anything
 * else on the site.
 *
 * `dynamic = "force-dynamic"` plus a 20-second revalidate: it must never be
 * served from the build, and it must not run five network probes per visitor
 * when something is on fire and everyone is refreshing.
 */
export const dynamic = "force-dynamic";
export const revalidate = 20;

const TONE = {
  operational: {
    label: "Operational",
    icon: Check,
    dot: "bg-[#16A34A]",
    text: "text-[#15803D]",
    chip: "bg-[#EAF7EF] text-[#15803D]",
  },
  degraded: {
    label: "Degraded",
    icon: AlertTriangle,
    dot: "bg-[#EA580C]",
    text: "text-[#B45309]",
    chip: "bg-[#FEF3E7] text-[#B45309]",
  },
  down: {
    label: "Down",
    icon: X,
    dot: "bg-[#DC2626]",
    text: "text-[#B91C1C]",
    chip: "bg-[#FEF2F2] text-[#B91C1C]",
  },
} as const;

const HEADLINE = {
  operational: "All systems operational",
  degraded: "Some systems are degraded",
  down: "We're having problems",
} as const;

const SUBHEAD = {
  operational: "Every dependency responded normally on the last check.",
  degraded: "Things are working, but slower than they should be. Audits may take longer.",
  down: "At least one dependency isn't responding. We're on it.",
} as const;

export default async function StatusPage() {
  const report = await health.getHealthReport();
  const overall = TONE[report.state];

  return (
    <>
      <MarketingHeader />

      <main>
        <section className="mx-auto max-w-4xl px-5 pt-14 pb-8 sm:px-6 sm:pt-20">
          <FadeIn className="space-y-4">
            <div className="text-[11px] font-semibold tracking-[0.12em] text-[#6B7480]">
              STATUS
            </div>

            <div className="flex items-center gap-3">
              {/*
                A pulse, but only when everything is fine. During an incident an
                animated dot reads as "actively broken" and adds urgency to a
                page whose job is to remove it.
              */}
              <span className="relative flex size-3 shrink-0">
                {report.state === "operational" ? (
                  <span
                    className={cn(
                      "absolute inline-flex size-full animate-ping rounded-full opacity-60",
                      overall.dot,
                    )}
                  />
                ) : null}
                <span
                  className={cn("relative inline-flex size-3 rounded-full", overall.dot)}
                />
              </span>

              <h1 className="font-display text-ink-900 text-[28px] leading-[1.16] font-semibold tracking-[-0.033em] sm:text-[36px]">
                {HEADLINE[report.state]}
              </h1>
            </div>

            <p className="max-w-[56ch] text-[15px] leading-[1.7] text-[#5B6472]">
              {SUBHEAD[report.state]}
            </p>
          </FadeIn>
        </section>

        <section className="mx-auto max-w-4xl px-5 pb-10 sm:px-6">
          <Stagger className="space-y-3">
            {report.services.map((service) => {
              const tone = TONE[service.state];

              return (
                <StaggerItem key={service.key}>
                  <Card variant="panel">
                    <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
                      <div className="flex min-w-0 items-start gap-3">
                        <span
                          className={cn(
                            "mt-[3px] inline-flex size-5 shrink-0 items-center justify-center rounded-full",
                            tone.chip,
                          )}
                        >
                          <tone.icon className="size-[11px]" strokeWidth={2.8} />
                        </span>

                        <div className="min-w-0">
                          <div className="text-ink-900 text-[15px] font-semibold tracking-[-0.015em]">
                            {service.name}
                          </div>
                          <p className="mt-0.5 text-[13px] leading-[1.6] text-[#5B6472]">
                            {service.description}
                          </p>
                          {service.detail ? (
                            <p className={cn("mt-1.5 text-[12.5px]", tone.text)}>
                              {service.detail}
                            </p>
                          ) : null}
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center gap-3 pl-8 sm:pl-0">
                        {service.latencyMs !== null ? (
                          <span className="text-[12px] text-[#6B7480] tabular-nums">
                            {service.latencyMs}ms
                          </span>
                        ) : null}
                        <span
                          className={cn(
                            "rounded-full px-2.5 py-[3px] text-[11.5px] font-semibold",
                            tone.chip,
                          )}
                        >
                          {tone.label}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </StaggerItem>
              );
            })}
          </Stagger>
        </section>

        <section className="mx-auto max-w-4xl px-5 pb-16 sm:px-6 sm:pb-20">
          <FadeIn whenInView>
            <div className="flex flex-col gap-3 border-t border-[#EDEFF3] pt-5 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-[12.5px] text-[#6B7480]">
                Checked{" "}
                <time dateTime={report.checkedAt}>
                  {new Date(report.checkedAt).toUTCString()}
                </time>
                . This page re-checks every 20 seconds.
              </p>
              <p className="text-[12.5px] text-[#6B7480]">
                Something wrong that isn&apos;t listed?{" "}
                <Link href="/contact">Tell us</Link>.
              </p>
            </div>

            {/*
              Said plainly rather than buried. A status page with no history is
              a weaker product than one with 90 days of bars, and pretending
              otherwise by omission is the kind of small dishonesty this page
              exists to avoid.
            */}
            <p className="mt-4 text-[12px] leading-[1.6] text-[#9AA2AF]">
              These are live checks, not recorded history — each one runs when the page loads.
              Uptime history is coming.
            </p>
          </FadeIn>
        </section>
      </main>

      <MarketingFooter />
    </>
  );
}
