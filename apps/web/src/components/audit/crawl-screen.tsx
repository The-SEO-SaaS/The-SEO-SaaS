"use client";

import * as React from "react";

import { CrawlChecklist } from "@/components/audit/crawl-checklist";
import { auditApi, type AuditProgress } from "@/lib/api";

/**
 * The crawl screen body.
 *
 * Design spec: body centred with 64px/40px padding, inner column capped at
 * 660px. Eyebrow 11px / 600 / 0.12em. Domain 26px / 500 / -0.025em with the
 * page count baseline-aligned opposite it. A 4px rail (track #F1F3F7, fill
 * #0B1220) at 16px offset. Checklist at 30px. Email card at 28px.
 *
 * The email card is inline here, as the design has it — non-blocking, "leave an
 * email and you can close the tab". That's a different thing from the gate
 * after completion, which stays: this one lets you leave, that one is the
 * hand-off into the report.
 */
export function CrawlScreen({
  publicId,
  domain,
  progress,
}: {
  publicId: string;
  domain: string;
  progress: AuditProgress | null;
}) {
  const pct = Math.max(0, Math.min(100, progress?.progress ?? 0));

  return (
    <div className="flex flex-1 items-center justify-center px-5 py-12 sm:px-10 sm:py-16">
      <div className="w-full max-w-[660px]">
        <div className="text-[11px] font-semibold tracking-[0.12em] text-[#6B7480]">
          CRAWL IN PROGRESS
        </div>

        <div className="mt-3.5 flex items-baseline justify-between gap-5">
          <div className="text-ink-900 truncate text-[22px] font-medium tracking-[-0.025em] sm:text-[26px]">
            {domain}
          </div>
          <div className="shrink-0 text-[13px] text-[#6B7480]">{pct}% complete</div>
        </div>

        <div className="mt-4 h-1 w-full overflow-hidden rounded-sm bg-[#F1F3F7]">
          <div
            className="bg-ink-900 h-full transition-[width] duration-500 ease-out"
            style={{ width: `${pct}%` }}
          />
        </div>

        <CrawlChecklist
          className="mt-[30px]"
          currentStep={progress?.currentStep ?? null}
          progress={pct}
        />

        <EmailCard publicId={publicId} />
      </div>
    </div>
  );
}

/**
 * Optional "email me when it's done" capture.
 *
 * Spec: 20px/22px padding, 1px #E2E6EC border, #F8F9FA fill, 12px radius.
 * Title 14px/500, sub 12.5px/#5B6472/1.55 at 5px offset, row at 14px.
 */
function EmailCard({ publicId }: { publicId: string }) {
  const [email, setEmail] = React.useState("");
  const [state, setState] = React.useState<"idle" | "saving" | "sent">("idle");

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!email.trim() || state === "saving") return;

    setState("saving");
    try {
      await auditApi.captureEmail(publicId, email.trim());
      setState("sent");
    } catch {
      // Never block the crawl on this — the report is reachable either way.
      setState("idle");
    }
  };

  if (state === "sent") {
    return (
      <div className="mt-7 rounded-xl border border-success-line bg-success-surface px-[22px] py-5">
        <div className="text-ink-900 text-[14px] font-medium">
          We&apos;ll email you the link
        </div>
        <p className="mt-1.5 text-[12.5px] leading-[1.55] text-[#5B6472]">
          Safe to close the tab now.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="mt-7 rounded-xl border border-[#E2E6EC] bg-[#F8F9FA] px-[22px] py-5"
    >
      <div className="text-ink-900 text-[14px] font-medium">
        Send me the report when it&apos;s ready
      </div>
      <p className="mt-1.5 text-[12.5px] leading-[1.55] text-[#5B6472]">
        Six to eight minutes on a site this size. Leave an email and you can close the tab.
      </p>

      <div className="mt-3.5 flex flex-col gap-2.5 sm:flex-row sm:items-center">
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@company.com"
          aria-label="Your email address"
          autoComplete="email"
          className="text-ink-900 min-w-0 flex-1 rounded-[10px] border border-[#DFE3EA] bg-white px-3.5 py-[11px] text-[13.5px] outline-none transition-colors placeholder:text-[#9AA2AE] focus-visible:border-ink-900"
        />
        <button
          type="submit"
          disabled={!email.trim() || state === "saving"}
          className="bg-ink-900 shrink-0 rounded-[10px] px-[18px] py-3 text-[13.5px] font-medium whitespace-nowrap text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {state === "saving" ? "Sending…" : "Email me the link"}
        </button>
      </div>
    </form>
  );
}
