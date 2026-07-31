"use client";

import { toParagraphs } from "@theseosaas/core/text";
import { BrandGlyph } from "@theseosaas/ui/components/brand-mark";
import { Button } from "@theseosaas/ui/components/button";
import { IconTile } from "@theseosaas/ui/components/icon-tile";
import { cn } from "@theseosaas/ui/lib/utils";
import { Check, FileDown, Link2 } from "lucide-react";
import Link from "next/link";
import * as React from "react";

/**
 * Audit chrome, matched to the design.
 *
 * Spec: 20px/40px padding, 1px #EDEFF3 bottom rule, no sticky and no backdrop
 * blur. Left is a 30px/9px ink tile holding the 15px brand glyph, gap 10px,
 * with the wordmark in Instrument Sans 17px / 600 / -0.03em.
 *
 * The right side differs by phase, which is why this takes a variant rather
 * than branching on `shareUrl`:
 *   crawling — "Auditing {domain}", 13px #6B7480, nothing interactive
 *   report   — "Audit your own site" plus the primary CTA
 */
export function AuditHeader({
  variant = "report",
  domain,
  className,
}: {
  variant?: "crawling" | "report";
  domain?: string;
  className?: string;
}) {
  return (
    <header className={cn("border-b border-[#EDEFF3] bg-surface", className)}>
      <div className="flex items-center justify-between gap-6 px-5 py-4 sm:px-10 sm:py-5">
        <Link href="/" className="flex items-center gap-2.5 no-underline hover:no-underline">
          <IconTile tone="ink" size="md">
            <BrandGlyph />
          </IconTile>
          <span className="font-display text-ink-900 text-[17px] font-semibold tracking-[-0.03em]">
            TheSEOSaaS
          </span>
        </Link>

        {variant === "crawling" ? (
          <span className="truncate text-[13px] text-[#6B7480]">
            {domain ? `Auditing ${domain}` : "Auditing"}
          </span>
        ) : (
          <div className="flex items-center gap-3.5">
            <span className="hidden text-[12.5px] text-[#6B7480] sm:inline">
              Audit your own site
            </span>
            <Button size="sm" render={<Link href="/" />}>
              Run a free audit
            </Button>
          </div>
        )}
      </div>
    </header>
  );
}

/**
 * The report head's left column.
 *
 * Spec: eyebrow 11px / 600 / 0.12em, domain Instrument Sans 35px / 600 /
 * -0.032em at 14px offset, verdict 15px / 1.6 / #5B6472 capped at 58ch, then a
 * share row of a bordered URL chip, a Copy link action, and the visibility
 * note.
 */
export function ReportMeta({
  domain,
  completedAt,
  pagesCrawled,
  summary,
  shareUrl,
  publicId,
  className,
}: {
  domain: string;
  completedAt: string | null;
  pagesCrawled: number;
  summary?: string | null;
  shareUrl?: string;
  /** Needed for the PDF link; the share URL isn't parsed for it. */
  publicId: string;
  className?: string;
}) {
  const [copied, setCopied] = React.useState(false);

  const date = completedAt
    ? new Date(completedAt)
        .toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
        .toUpperCase()
    : null;

  const copy = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard can be blocked by permissions — the URL is visible anyway.
    }
  };

  // Shown without the scheme, as in the design.
  const displayUrl = shareUrl?.replace(/^https?:\/\//, "") ?? null;

  return (
    <div className={cn("min-w-0", className)}>
      <div className="text-[11px] font-semibold tracking-[0.12em] text-[#6B7480]">
        PUBLIC AUDIT REPORT{date ? ` · ${date}` : ""}
      </div>

      <h1 className="font-display text-ink-900 mt-3.5 text-[26px] font-semibold tracking-[-0.032em] break-words sm:text-[35px]">
        {domain}
      </h1>

      {/*
        Only the opening paragraph here. The full verdict appears in the panel
        further down, and repeating sixty words directly under the domain name
        pushes the score card and the first finding below the fold — the two
        things someone opening a shared link came to see.
      */}
      <div className="mt-3 space-y-2.5">
        {toParagraphs(
          summary ??
            `${pagesCrawled} ${pagesCrawled === 1 ? "page" : "pages"} crawled. The findings below are ordered by the traffic they put at risk.`,
        )
          .slice(0, 1)
          .map((paragraph, index) => (
            <p
              key={index}
              className="max-w-[62ch] text-[15px] leading-[1.7] text-[#5B6472]"
            >
              {paragraph}
            </p>
          ))}
      </div>

      {displayUrl ? (
        <div className="mt-[22px] flex flex-wrap items-center gap-2.5">
          <div className="flex min-w-0 items-center gap-2 rounded-lg border border-[#DFE3EA] px-3.5 py-2 text-[12.5px] text-[#3F4854]">
            <Link2 className="size-[13px] shrink-0" strokeWidth={1.6} />
            <span className="truncate">{displayUrl}</span>
          </div>

          <button
            type="button"
            onClick={copy}
            className="text-ink-900 text-[12.5px] font-medium"
          >
            {copied ? (
              <span className="inline-flex items-center gap-1.5">
                <Check className="size-3.5" /> Copied
              </span>
            ) : (
              "Copy link"
            )}
          </button>

          {/*
            A plain <a>, not a fetch-and-blob. The route sets
            Content-Disposition, so the browser's own viewer handles it —
            which is what people expect from a PDF link and avoids holding a
            multi-megabyte buffer in memory on a phone.

            `target="_blank"` because the report page is the thing they were
            reading; replacing it with a PDF viewer loses their place.
          */}
          <a
            href={`/api/audit/${publicId}/pdf`}
            target="_blank"
            rel="noreferrer"
            className="text-ink-900 inline-flex items-center gap-1.5 text-[12.5px] font-medium no-underline hover:no-underline"
          >
            <FileDown className="size-3.5" strokeWidth={1.8} />
            PDF
          </a>

          <span className="text-[12.5px] text-[#6B7480]">·</span>
          <span className="text-[12.5px] text-[#6B7480]">
            Anyone with the link can view this report
          </span>
        </div>
      ) : null}
    </div>
  );
}
