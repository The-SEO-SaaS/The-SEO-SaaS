import { Card, CardContent } from "@theseosaas/ui/components/card";
import { FadeIn, Stagger, StaggerItem } from "@theseosaas/ui/components/motion";
import { cn } from "@theseosaas/ui/lib/utils";
import { Check, Minus, X } from "lucide-react";

import type { CrawlFacts } from "@/lib/api";

/**
 * What the crawl actually found, stated as facts rather than as findings.
 *
 * The rest of the report is derived: issues are what went wrong, `healthy` is a
 * curated list of what went right. Neither tells you whether we *checked* a
 * thing. A reader with no sitemap issue can't distinguish "you have one" from
 * "we never looked", and that ambiguity undermines the report's whole claim to
 * have crawled their site.
 *
 * So this section is deliberately dumb: every check we ran, with its answer,
 * including the boring passes. It also surfaces the average response time —
 * the one hard number under the Speed category, which otherwise shows a score
 * with nothing behind it.
 *
 * Tone is the tricky part. A red X on "no structured data" would be wrong;
 * these are observations, not failures, and the ones that genuinely matter have
 * already been raised as issues with a fix attached. Only `blocksIndexing` gets
 * alarm colour, because a site telling Google to stay out is the single finding
 * that makes every other number in this report irrelevant.
 */

interface Fact {
  label: string;
  value: boolean | null;
  /** Inverts the colour: true is bad for "blocking indexing". */
  alarmWhenTrue?: boolean;
  note?: string;
}

function FactRow({ fact }: { fact: Fact }) {
  const unknown = fact.value === null;
  const bad = fact.alarmWhenTrue ? fact.value === true : false;

  return (
    <div className="flex items-start gap-2.5 py-2">
      <span
        className={cn(
          "mt-[1px] inline-flex size-[18px] shrink-0 items-center justify-center rounded-full",
          unknown
            ? "bg-[#F1F3F7] text-[#9AA2AF]"
            : bad
              ? "bg-[#FEF2F2] text-[#B91C1C]"
              : fact.value
                ? "bg-[#EAF7EF] text-[#15803D]"
                : "bg-[#F1F3F7] text-[#6B7480]",
        )}
      >
        {unknown ? (
          <Minus className="size-[11px]" strokeWidth={2.4} />
        ) : bad ? (
          <X className="size-[11px]" strokeWidth={2.8} />
        ) : fact.value ? (
          <Check className="size-[11px]" strokeWidth={2.8} />
        ) : (
          <Minus className="size-[11px]" strokeWidth={2.4} />
        )}
      </span>

      {/*
        The label carries the answer's colour too, not just the icon. At an
        18px tick a skimmer reading down the column can't tell pass from
        not-found without stopping to look — the whole point of this section is
        that it should be readable at a glance.

        Green for a pass, plain ink for "we checked and it isn't there" (an
        observation, not a failure), red only for actively blocking indexing.
      */}
      <span className="min-w-0">
        <span
          className={cn(
            "text-[13.5px]",
            unknown
              ? "text-[#9AA2AF]"
              : bad
                ? "font-semibold text-[#B91C1C]"
                : fact.value
                  ? "font-medium text-[#15803D]"
                  : "text-ink-900",
          )}
        >
          {fact.label}
        </span>
        {fact.note ? (
          <span className="mt-0.5 block text-[12px] text-[#B91C1C]">{fact.note}</span>
        ) : null}
      </span>
    </div>
  );
}

/** `1.2s` reads faster than `1243ms` at a glance; under a second stays in ms. */
function formatResponseTime(ms: number): string {
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${Math.round(ms)}ms`;
}

export function CrawlFactsSection({
  crawl,
  pagesCrawled,
  pagesDiscovered,
}: {
  crawl: CrawlFacts | null;
  pagesCrawled: number;
  pagesDiscovered: number;
}) {
  // Audits from before these were persisted have nothing to show. Rendering an
  // empty shell would be worse than omitting the section.
  if (!crawl) return null;

  const facts: Fact[] = [
    { label: "Served over HTTPS", value: crawl.isHttps },
    { label: "robots.txt found", value: crawl.hasRobotsTxt },
    { label: "XML sitemap found", value: crawl.hasSitemap },
    {
      label: "Blocking search engines",
      value: crawl.blocksIndexing,
      alarmWhenTrue: true,
      note: crawl.blocksIndexing
        ? "A noindex directive is keeping this site out of search results."
        : undefined,
    },
    { label: "Structured data on the homepage", value: crawl.hasStructuredData },
    { label: "Open Graph tags for link previews", value: crawl.hasOpenGraph },
  ];

  return (
    <section className="space-y-4">
      <FadeIn whenInView>
        <h2 className="font-display text-ink-900 text-[20px] font-semibold tracking-[-0.02em]">
          What we found on your site
        </h2>
        <p className="mt-1.5 text-[13.5px] leading-[1.6] text-[#5B6472]">
          Every check this crawl ran, including the ones that passed.
        </p>
      </FadeIn>

      <Stagger className="space-y-4">
        <StaggerItem>
      <Card variant="panel">
        <CardContent className="grid gap-x-10 gap-y-1 sm:grid-cols-2">
          <div>
            {facts.slice(0, 3).map((fact) => (
              <FactRow key={fact.label} fact={fact} />
            ))}
          </div>
          <div>
            {facts.slice(3).map((fact) => (
              <FactRow key={fact.label} fact={fact} />
            ))}
          </div>
        </CardContent>
      </Card>
        </StaggerItem>

        <StaggerItem>
      {/*
        Measurements, kept apart from the pass/fail list — a number with no
        threshold attached isn't a check, and dressing it up as one would imply
        a judgement this audit doesn't make.
      */}
      <Card variant="panel">
        <CardContent className="grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-4">
          <Measure label="Pages crawled" value={String(pagesCrawled)} />
          <Measure
            label="Pages found"
            value={String(Math.max(pagesDiscovered, pagesCrawled))}
            note={
              pagesDiscovered > pagesCrawled
                ? `${pagesCrawled} sampled`
                : undefined
            }
          />
          <Measure
            label="Avg. response"
            value={
              crawl.avgResponseTimeMs === null
                ? "—"
                : formatResponseTime(crawl.avgResponseTimeMs)
            }
            // Rough, and labelled as such. Server response time is one input to
            // page speed, not page speed itself — this audit never runs a real
            // rendering benchmark, and implying otherwise would be dishonest.
            note="server time only"
          />
          <Measure
            label="Homepage words"
            value={crawl.homepageWordCount === null ? "—" : String(crawl.homepageWordCount)}
          />
        </CardContent>
      </Card>
        </StaggerItem>
      </Stagger>

      {crawl.finalUrl ? (
        <p className="text-[12px] text-[#6B7480]">
          Crawled from <span className="text-ink-900">{crawl.finalUrl}</span>
          {crawl.title ? <> — “{crawl.title}”</> : null}
        </p>
      ) : null}
    </section>
  );
}

function Measure({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note?: string;
}) {
  return (
    <div>
      <div className="text-[11px] font-semibold tracking-[0.08em] text-[#6B7480] uppercase">
        {label}
      </div>
      <div className="text-ink-900 mt-1 text-[22px] font-semibold tracking-[-0.02em] tabular-nums">
        {value}
      </div>
      {note ? <div className="mt-0.5 text-[11.5px] text-[#6B7480]">{note}</div> : null}
    </div>
  );
}
