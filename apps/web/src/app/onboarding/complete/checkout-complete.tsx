"use client";

import { BrandGlyph } from "@theseosaas/ui/components/brand-mark";
import { Button } from "@theseosaas/ui/components/button";
import { IconTile } from "@theseosaas/ui/components/icon-tile";
import { FadeIn } from "@theseosaas/ui/components/motion";
import { cn } from "@theseosaas/ui/lib/utils";
import { AlertTriangle, ArrowRight, Check, CreditCard } from "lucide-react";
import Link from "next/link";
import * as React from "react";

import { usePolling } from "@/hooks/use-request";
import {
  auditApi,
  AUDIT_STEPS,
  onboardingApi,
  type AuditProgress,
  type CompleteOnboardingResult,
} from "@/lib/api";
import { isApiError } from "@/lib/api-client";

/**
 * Setup complete — the design's `/onboarding done` screen.
 *
 * Two jobs in one component, because to the user they're one moment:
 *
 *  1. Landed here from Dodo's checkout `return_url`. Dodo has taken the
 *     payment, but our own Subscription row only exists once the
 *     `subscription.active` webhook lands, which can trail the redirect by a
 *     second or two. So this retries `completeOnboarding` rather than calling
 *     it once and showing a false error.
 *  2. Once that succeeds it no longer bounces to /dashboard — it renders the
 *     screen the design actually specifies: the first tracked crawl running,
 *     with what's waiting for them beside it. Dropping someone on a dashboard
 *     with no acknowledgement was the old behaviour and the reason this screen
 *     exists.
 *
 * Departures, both because the feature isn't built:
 *  - The design's "Two can be fixed automatically" under the findings count.
 *    There is no auto-fix, so the line says where to find them instead.
 *  - The briefs line doesn't promise generation; content generation is a stub.
 *
 * Responsive: the design is desktop-only. The two cards stack below `lg` and
 * the headline steps down from 33px.
 */
const MAX_ATTEMPTS = 8;
const RETRY_DELAY_MS = 1500;

export function CheckoutComplete() {
  const [result, setResult] = React.useState<CompleteOnboardingResult | null>(null);
  const [status, setStatus] = React.useState<"waiting" | "ready" | "failed">("waiting");
  const [attempt, setAttempt] = React.useState(0);

  React.useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout>;

    const tick = async (count: number) => {
      if (!active) return;
      setAttempt(count);

      try {
        const completed = await onboardingApi.complete();
        if (!active) return;
        setResult(completed);
        setStatus("ready");
        return;
      } catch (error) {
        if (!active) return;

        // Still waiting on the webhook — keep retrying up to the limit.
        const stillPending = isApiError(error) && error.code === "PAYMENT_REQUIRED";
        if (stillPending && count < MAX_ATTEMPTS) {
          timer = setTimeout(() => void tick(count + 1), RETRY_DELAY_MS);
          return;
        }

        setStatus("failed");
      }
    };

    void tick(1);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, []);

  if (status === "waiting") {
    return (
      <Shell>
        <div className="flex flex-1 items-center justify-center px-4 py-16">
          <div className="w-full max-w-md space-y-4 text-center">
            <IconTile tone="ink" size="xl" className="mx-auto animate-pulse">
              <CreditCard />
            </IconTile>
            <h1 className="font-display text-ink-900 text-2xl font-semibold">
              Confirming your subscription
            </h1>
            <p className="text-ink-400 text-base leading-relaxed">
              Just a moment while we hear back from our payment provider.
            </p>
            <span className="sr-only">Attempt {attempt}</span>
          </div>
        </div>
      </Shell>
    );
  }

  if (status === "failed" || !result) {
    return (
      <Shell>
        <div className="flex flex-1 items-center justify-center px-4 py-16">
          <div className="w-full max-w-md space-y-4 text-center">
            <IconTile tone="critical" size="xl" className="mx-auto">
              <AlertTriangle />
            </IconTile>
            <h1 className="font-display text-ink-900 text-2xl font-semibold">
              Still confirming your payment
            </h1>
            <p className="text-ink-400 text-base leading-relaxed">
              This is usually just a delayed notification from our payment provider. Give it a
              minute, then try again — you won&apos;t be charged twice.
            </p>
            <Button render={<Link href="/onboarding" />}>Back to setup</Button>
          </div>
        </div>
      </Shell>
    );
  }

  return (
    <Shell meta={`${result.plan.name} plan${result.project ? ` · ${result.project.domain}` : ""}`}>
      <SetupComplete result={result} />
    </Shell>
  );
}

/** 22px/40px brand row over a centred body, per the design's frame. */
function Shell({ children, meta }: { children: React.ReactNode; meta?: string }) {
  return (
    <div className="flex min-h-svh flex-col bg-white">
      <div className="flex items-center justify-between gap-6 px-4 py-5 sm:px-10 sm:py-[22px]">
        <div className="flex items-center gap-[11px]">
          <IconTile tone="ink" size="md">
            <BrandGlyph />
          </IconTile>
          <span className="font-display text-[17px] font-semibold tracking-[-0.03em] text-[#0B1220]">
            TheSEOSaaS
          </span>
        </div>
        {meta ? <span className="text-[13px] text-[#6B7480]">{meta}</span> : null}
      </div>

      {children}
    </div>
  );
}

function SetupComplete({ result }: { result: CompleteOnboardingResult }) {
  const publicId = result.firstCrawl?.publicId ?? null;
  const wasReused = result.firstCrawl?.reused ?? false;

  // Only poll a run that might still be moving. A reused audit is already
  // complete, so polling it would be pure noise.
  const progress = usePolling<AuditProgress>(
    (signal) => auditApi.progress(publicId!, signal),
    (data) => data.status === "COMPLETED" || data.status === "FAILED",
    { intervalMs: 2000, enabled: Boolean(publicId) && !wasReused },
  );

  const live = progress.data ?? null;
  const isRunning = Boolean(live && (live.status === "QUEUED" || live.status === "RUNNING"));
  const isDone = wasReused || live?.status === "COMPLETED";

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-10 sm:px-6 lg:p-10">
      <FadeIn className="w-full max-w-[840px]">
        <div className="flex items-center gap-2.5">
          <span className="flex size-[22px] items-center justify-center rounded-[7px] bg-[#16A34A]">
            <Check className="size-3 text-white" strokeWidth={2.8} />
          </span>
          <span className="text-[11px] font-semibold tracking-[0.12em] text-[#15803D] uppercase">
            Setup complete
          </span>
        </div>

        <h1 className="font-display mt-3.5 text-[26px] font-semibold tracking-[-0.032em] text-[#0B1220] text-pretty sm:text-[33px]">
          {isRunning
            ? "You're set up. First tracked crawl is running."
            : "You're set up. Everything's ready."}
        </h1>

        <p className="mt-2.5 max-w-[62ch] text-[15px] leading-[1.65] text-[#5B6472]">
          {isRunning
            ? "This usually takes a few minutes. Your dashboard is already usable — the findings from your audit are waiting there."
            : "Your findings, keywords and competitors are all on the dashboard, ready to work through."}
        </p>

        <div className="mt-8 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-8">
          <CrawlCard publicId={publicId} live={live} isDone={isDone} wasReused={wasReused} />
          <WaitingPanel result={result} />
        </div>

        <div className="mt-[30px] flex flex-wrap items-center gap-3.5">
          <Button size="lg" render={<Link href="/dashboard" />}>
            Go to dashboard
            <ArrowRight />
          </Button>

          {isRunning && publicId ? <NotifyButton publicId={publicId} /> : null}
        </div>
      </FadeIn>
    </div>
  );
}

function CrawlCard({
  publicId,
  live,
  isDone,
  wasReused,
}: {
  publicId: string | null;
  live: AuditProgress | null;
  isDone: boolean;
  wasReused: boolean;
}) {
  if (!publicId) {
    return (
      <div className="rounded-2xl border border-[#E2E6EC] p-5 sm:p-6">
        <div className="text-[11px] font-semibold tracking-[0.1em] text-[#6B7480] uppercase">
          First crawl
        </div>
        <p className="mt-3 text-[13.5px] leading-[1.6] text-[#5B6472]">
          No site is connected to this account yet. Add one from the dashboard and we&apos;ll
          crawl it straight away.
        </p>
      </div>
    );
  }

  const currentIndex = live?.currentStep
    ? AUDIT_STEPS.findIndex((step) => step.key === live.currentStep)
    : -1;

  const percent = isDone ? 100 : (live?.progress ?? 0);

  return (
    <div className="rounded-2xl border border-[#E2E6EC] p-5 sm:p-6">
      <div className="flex items-baseline justify-between gap-4">
        <div className="text-[11px] font-semibold tracking-[0.1em] text-[#6B7480] uppercase">
          First crawl
        </div>
        {/* The design reads "248 of 412 pages". The pipeline reports an overall
            percentage, not a live page count, so this states what we know. */}
        <span className="text-[12.5px] text-[#6B7480]">
          {wasReused ? "Carried over from your audit" : isDone ? "Finished" : `${percent}%`}
        </span>
      </div>

      <div className="mt-3 h-1 w-full overflow-hidden rounded-[2px] bg-[#F1F3F7]">
        <div
          className="h-full bg-[#0B1220] transition-[width] duration-500 ease-out"
          style={{ width: `${percent}%` }}
        />
      </div>

      <div className="mt-[18px]">
        {AUDIT_STEPS.map((step, index) => {
          const done = isDone || (currentIndex >= 0 && index < currentIndex);
          const running = !isDone && index === currentIndex;

          return (
            <div key={step.key} className="flex items-center gap-3 border-t border-[#F3F5F8] py-3">
              <span
                className={cn(
                  "flex size-[18px] shrink-0 items-center justify-center rounded-full border",
                  done && "border-[#16A34A] bg-[#16A34A]",
                  running && "border-[#0B1220] bg-white",
                  !done && !running && "border-[#E2E6EC] bg-white",
                )}
              >
                {done ? (
                  <Check className="size-2.5 text-white" strokeWidth={2.6} />
                ) : running ? (
                  <span className="size-1.5 animate-pulse rounded-full bg-[#0B1220]" />
                ) : null}
              </span>

              <span
                className={cn(
                  "flex-1 text-[13.5px]",
                  running ? "font-medium text-[#0B1220]" : "font-normal text-[#3F4854]",
                )}
              >
                {step.label}
              </span>

              <span className="text-[12.5px] text-[#6B7480]">
                {done ? "Done" : running ? "Running" : ""}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function WaitingPanel({ result }: { result: CompleteOnboardingResult }) {
  const { waiting, plan } = result;

  const rows = [
    {
      title: `${waiting.criticalFindings} critical finding${waiting.criticalFindings === 1 ? "" : "s"}`,
      // Design: "Two can be fixed automatically." Auto-fix doesn't exist.
      detail: "Listed on the audits page, worst first.",
    },
    {
      title: `${waiting.briefs} article brief${waiting.briefs === 1 ? "" : "s"}`,
      detail: "Built from the gaps you just selected.",
    },
    {
      title: `${waiting.trackedKeywords} keyword${waiting.trackedKeywords === 1 ? "" : "s"} tracked`,
      detail: `Checked daily. ${plan.name} covers ${plan.articlesPerMonth} articles a month.`,
    },
  ];

  return (
    <div className="rounded-2xl border border-[#E2E6EC] p-5 sm:p-6">
      <div className="text-[11px] font-semibold tracking-[0.1em] text-[#6B7480] uppercase">
        Waiting for you
      </div>

      <div className="mt-4 flex flex-col gap-3.5">
        {rows.map((row, index) => (
          <div key={row.title} className={cn(index > 0 && "border-t border-[#EDEFF3] pt-3.5")}>
            <div className="text-[13.5px] font-medium text-[#0B1220]">{row.title}</div>
            <div className="mt-[3px] text-[12.5px] leading-[1.55] text-[#6B7480]">{row.detail}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** "Email me when the crawl finishes" — one-shot, and says so once used. */
function NotifyButton({ publicId }: { publicId: string }) {
  const [state, setState] = React.useState<"idle" | "sending" | "set" | "failed">("idle");

  if (state === "set") {
    return (
      <span className="text-[13.5px] text-[#15803D]">
        We&apos;ll email you the moment it finishes.
      </span>
    );
  }

  return (
    <Button
      variant="outline"
      size="lg"
      disabled={state === "sending"}
      onClick={async () => {
        setState("sending");
        try {
          await onboardingApi.notifyOnComplete(publicId);
          setState("set");
        } catch {
          setState("failed");
        }
      }}
    >
      {state === "failed" ? "Couldn't set that up — retry" : "Email me when the crawl finishes"}
    </Button>
  );
}
