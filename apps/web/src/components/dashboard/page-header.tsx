"use client";

import { cn } from "@theseosaas/ui/lib/utils";

/**
 * The app top bar.
 *
 * Spec: 20px/40px padding, 1px #EDEFF3 bottom rule, breadcrumb left and meta
 * right. The breadcrumb is 13px #6B7480 with a #D3D8E0 slash at 6px side
 * padding and the current item in #0B1220 — not a bold page title, which is
 * what this was before.
 *
 * `meta` is the muted line ("Last crawl 4 hours ago"), `action` the button or
 * chip group. Both stack under the breadcrumb below `sm`, where a breadcrumb,
 * a status line and a button can't share a phone row without truncating the
 * part that matters.
 */
export function PageHeader({
  section,
  current,
  meta,
  action,
  className,
}: {
  /** First crumb, e.g. "Keywords". */
  section: string;
  /** Second crumb — usually the site's domain. */
  current?: string | null;
  meta?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 border-b border-[#EDEFF3] px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:px-10 sm:py-5",
        className,
      )}
    >
      <div className="min-w-0 text-[13px] text-[#6B7480]">
        <span>{section}</span>
        {current ? (
          <>
            <span className="px-1.5 text-[#D3D8E0]">/</span>
            <span className="text-ink-900">{current}</span>
          </>
        ) : null}
      </div>

      {meta || action ? (
        <div className="flex flex-wrap items-center gap-x-[18px] gap-y-2">
          {meta ? <span className="text-[12.5px] text-[#6B7480]">{meta}</span> : null}
          {action}
        </div>
      ) : null}
    </div>
  );
}

/** The bordered chip in the design's top bar, e.g. the month selector. */
export function HeaderChip({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-ink-900 rounded-md border border-[#E6E9EF] px-[11px] py-[5px] text-[12.5px] font-medium">
      {children}
    </span>
  );
}
