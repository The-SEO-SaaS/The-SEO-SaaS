"use client";

import { Button } from "@theseosaas/ui/components/button";
import { FadeIn, Stagger, StaggerItem } from "@theseosaas/ui/components/motion";
import { cn } from "@theseosaas/ui/lib/utils";
import { ArrowRight, BarChart3, FileSearch, KeyRound, PenLine } from "lucide-react";
import Link from "next/link";

/**
 * The dashboard with no site connected.
 *
 * `/dashboard` used to redirect straight to `/dashboard/sites/new` when the
 * account had no projects. That's a reasonable shortcut and a poor first
 * impression: a magic-link sign-in dropped the user into a wizard with no idea
 * what they'd signed into, no sense of what the product does once set up, and
 * nothing to orient against. It also meant the dashboard — the thing they came
 * for — was a URL they had never seen.
 *
 * So this renders the real dashboard shape, at zero. Same cards, same layout,
 * same chart, all reading 0 with a flat line. It's honest (nothing is
 * fabricated), it teaches the layout before there's data to read, and the
 * single call to action is unmissable because it's the only coloured thing on
 * screen.
 */

const METRICS = [
  {
    label: "Open issues",
    value: "0",
    note: "Nothing crawled yet",
    icon: FileSearch,
  },
  {
    label: "Avg. position",
    value: "—",
    note: "No keywords tracked",
    icon: KeyRound,
  },
  {
    label: "Competitors watched",
    value: "0",
    note: "Found during your first audit",
    icon: BarChart3,
  },
  {
    label: "Articles published",
    value: "0",
    note: "Written from your gaps",
    icon: PenLine,
  },
];

/**
 * A flat line at the vertical centre, with the same grid the real chart uses.
 *
 * Deliberately not an illustration or a blurred screenshot of fake data. A
 * flatline is what zero actually looks like on this chart, so nothing has to be
 * unlearned when real points arrive — and a chart showing invented numbers on
 * an empty account is exactly the dishonesty the audit copy avoids elsewhere.
 */
function Flatline() {
  return (
    <div className="relative h-[180px] w-full">
      <svg
        viewBox="0 0 600 180"
        width="100%"
        height="180"
        preserveAspectRatio="none"
        className="block"
        role="img"
        aria-label="No ranking history yet"
      >
        {[36, 72, 108, 144].map((y) => (
          <line
            key={y}
            x1={0}
            y1={y}
            x2={600}
            y2={y}
            stroke="#F1F3F7"
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
          />
        ))}

        {/* Dashed, because a solid line would read as a real measurement of nothing. */}
        <line
          x1={0}
          y1={90}
          x2={600}
          y2={90}
          stroke="#C6CDD8"
          strokeWidth={2}
          strokeDasharray="5 6"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>

      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <span className="bg-surface rounded-full border border-[#E2E6EC] px-3 py-1 text-[12px] text-[#6B7480]">
          Ranking history starts after your first crawl
        </span>
      </div>
    </div>
  );
}

export function DashboardEmpty({ className }: { className?: string }) {
  return (
    <main className={cn("min-w-0 flex-1 px-5 py-8 sm:px-8 sm:py-10", className)}>
      <FadeIn className="max-w-[640px]">
        <div className="text-[11px] font-semibold tracking-[0.12em] text-[#6B7480]">
          DASHBOARD
        </div>
        <h1 className="font-display text-ink-900 mt-3 text-[26px] font-semibold tracking-[-0.032em] sm:text-[31px]">
          Nothing to show yet
        </h1>
        <p className="mt-2.5 max-w-[56ch] text-[15px] leading-[1.65] text-[#5B6472]">
          Add your site and we&apos;ll crawl it, find the three competitors ranking above you,
          and fill everything below in. It takes about eight minutes.
        </p>

        <div className="mt-6 flex flex-wrap items-center gap-3.5">
          <Button render={<Link href="/dashboard/sites/new" />}>
            Add your site
            <ArrowRight className="size-4" strokeWidth={1.9} />
          </Button>
          <Link href="/" className="text-[13.5px] text-[#5B6472] no-underline">
            Or run a free audit first
          </Link>
        </div>
      </FadeIn>

      {/*
        Everything below is the live dashboard's own layout, at zero. Muted
        rather than hidden, so the shape is learnable before there's data in it.
      */}
      <Stagger className="mt-9 grid gap-[18px] sm:grid-cols-2 xl:grid-cols-4">
        {METRICS.map((metric) => (
          <StaggerItem key={metric.label}>
            <div className="rounded-2xl border border-[#E2E6EC] bg-white p-[22px]">
              <div className="flex items-center justify-between gap-3">
                <span className="text-[12.5px] text-[#6B7480]">{metric.label}</span>
                <span className="inline-flex size-7 items-center justify-center rounded-lg bg-[#F1F3F7]">
                  <metric.icon className="size-[14px] text-[#9AA2AF]" strokeWidth={1.8} />
                </span>
              </div>
              <div className="mt-3 text-[26px] font-medium tracking-[-0.025em] text-[#C6CDD8] tabular-nums">
                {metric.value}
              </div>
              <div className="mt-1 text-[11.5px] text-[#9AA2AF]">{metric.note}</div>
            </div>
          </StaggerItem>
        ))}
      </Stagger>

      <FadeIn delay={0.12} className="mt-[18px]">
        <div className="rounded-2xl border border-[#E2E6EC] bg-white p-[22px]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-ink-900 text-[15px] font-semibold tracking-[-0.015em]">
                Average position
              </h2>
              <p className="mt-0.5 text-[12.5px] text-[#6B7480]">
                Across every keyword we track for you, checked daily.
              </p>
            </div>
            <span className="rounded-full bg-[#F1F3F7] px-2.5 py-[3px] text-[11px] font-semibold text-[#6B7480]">
              NO DATA
            </span>
          </div>

          <div className="mt-5">
            <Flatline />
          </div>
        </div>
      </FadeIn>
    </main>
  );
}
