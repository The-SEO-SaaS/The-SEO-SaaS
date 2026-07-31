"use client";

import { Button } from "@theseosaas/ui/components/button";
import { Empty, EmptyDescription, EmptyMedia, EmptyTitle } from "@theseosaas/ui/components/empty";
import { IconTile } from "@theseosaas/ui/components/icon-tile";
import { FadeIn, PhaseTransition } from "@theseosaas/ui/components/motion";
import { ProgressBar } from "@theseosaas/ui/components/progress-bar";
import { cn } from "@theseosaas/ui/lib/utils";
import { AlertTriangle, Lock } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";

import { CrawlChecklist } from "@/components/audit/crawl-checklist";
import { CompetitorsStep } from "@/components/onboarding/competitors-step";
import { KeywordsStep } from "@/components/onboarding/keywords-step";
import { SiteStep, type SiteStepValue } from "@/components/onboarding/site-step";
import { SETUP_STEP_ORDER, useAddSite, type SetupStep } from "@/hooks/use-add-site";
import { useSites } from "@/hooks/use-sites";
import type { OnboardingKeyword } from "@/lib/api";

const SETUP_TITLES: Record<SetupStep, string> = {
  site: "Confirm the new site",
  competitors: "Who takes its terms?",
  keywords: "What should we watch weekly?",
};

/**
 * Adding a site: domain → crawl → claim → confirm (site/competitors/keywords).
 *
 * No plan step here — this account already has one. The wizard is
 * intentionally lighter than first-time onboarding (no left rail), since it's
 * a secondary flow reached from the dashboard, not the primary conversion
 * path.
 */
export function AddSiteFlow() {
  const router = useRouter();
  const { addSiteQuota, isLoading: isLoadingQuota } = useSites();
  const flow = useAddSite();

  const [domain, setDomain] = React.useState("");
  const [site, setSite] = React.useState<SiteStepValue>({
    domain: "",
    siteType: null,
    platform: null,
  });

  React.useEffect(() => {
    if (!flow.setupState?.project) return;
    setSite((current) =>
      current.domain
        ? current
        : {
            domain: flow.setupState!.project!.domain,
            siteType: flow.setupState!.project!.siteType,
            platform: flow.setupState!.project!.platform,
          },
    );
  }, [flow.setupState]);

  if (isLoadingQuota && flow.phase === "domain") {
    return (
      <Shell title="Add a site">
        <div className="text-ink-300 py-10 text-center text-base">Loading…</div>
      </Shell>
    );
  }

  if (!isLoadingQuota && addSiteQuota && !addSiteQuota.canAdd && flow.phase === "domain") {
    return (
      <Shell title="Add a site">
        <Empty className="border-line rounded-2xl border">
          <EmptyMedia variant="icon">
            <Lock />
          </EmptyMedia>
          <EmptyTitle>You&apos;ve used all {addSiteQuota.limit} sites on your plan</EmptyTitle>
          <EmptyDescription>
            Upgrade to track more sites at once — everything you&apos;ve already set up stays
            exactly as it is.
          </EmptyDescription>
        </Empty>
        <Button className="mt-5" onClick={() => router.push("/dashboard")}>
          Back to dashboard
        </Button>
      </Shell>
    );
  }

  if (flow.phase === "domain") {
    return (
      <Shell
        title="Which site are we adding?"
        subtitle="We'll crawl it and check it against the competitors ranking above it — the same audit as your first site."
      >
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (domain.trim()) flow.startAudit(domain.trim());
          }}
        >
          {/*
            Same shape as the marketing hero's input — 12px radius, the scheme
            as a static adornment rather than something to type. Someone adding
            their second site has already used that field once; making this one
            look different is a small, avoidable friction.
          */}
          <div className="bg-surface flex items-center gap-1.5 rounded-xl border border-[#E2E6EC] px-4 py-3 transition-colors focus-within:border-[#0B1220] focus-within:ring-2 focus-within:ring-[#0B1220]/10">
            <span className="shrink-0 text-[15px] text-[#9AA2AF]">https://</span>
            <input
              autoFocus
              value={domain}
              onChange={(event) => setDomain(event.target.value)}
              placeholder="acme.com"
              aria-label="Your site's domain"
              className="text-ink-900 min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-[#C6CDD8]"
              spellCheck={false}
              inputMode="url"
              autoComplete="url"
            />
          </div>

          {flow.startError ? (
            <div className="border-critical/20 bg-critical/5 text-critical-strong rounded-lg border px-3.5 py-2.5 text-sm">
              {flow.startError}
            </div>
          ) : null}

          <Button type="submit" disabled={!domain.trim() || flow.isStarting}>
            {flow.isStarting ? "Starting…" : "Run free audit"}
          </Button>
        </form>
      </Shell>
    );
  }

  if (flow.phase === "crawling") {
    return (
      <Shell title="Auditing your new site">
        <PhaseTransition phaseKey="crawling">
          <div className="space-y-7">
            <p className="text-ink-400 text-base leading-relaxed">
              Same crawl as your first site — a couple of minutes.
            </p>
            <ProgressBar value={flow.progress?.progress ?? 0} tone="ink" />
            <CrawlChecklist
              currentStep={flow.progress?.currentStep ?? null}
              progress={flow.progress?.progress ?? 0}
            />
          </div>
        </PhaseTransition>
      </Shell>
    );
  }

  if (flow.phase === "failed" || flow.crawlGaveUp) {
    return (
      <Shell title="We couldn't finish that audit">
        <div className="space-y-4 text-center">
          <IconTile tone="critical" size="lg" className="mx-auto">
            <AlertTriangle />
          </IconTile>
          <p className="text-ink-400 text-base leading-relaxed">
            {flow.progress?.error ?? flow.crawlError ??
              "The site may be blocking automated requests, or it took too long to respond."}
          </p>
          <Button onClick={() => router.push("/dashboard/sites/new")}>Try another domain</Button>
        </div>
      </Shell>
    );
  }

  // --- Setup: site / competitors / keywords ---------------------------------

  if (!flow.setupState) {
    return (
      <Shell title={SETUP_TITLES[flow.setupStep]}>
        <div className="text-ink-300 py-10 text-center text-base">Loading…</div>
      </Shell>
    );
  }

  const state = flow.setupState;
  const projectId = flow.projectId;
  const competitorLimit = state.limits?.competitors ?? 3;
  const keywordLimit = state.limits?.keywords ?? 100;

  if (flow.setupStep === "site") {
    return (
      <Shell title={SETUP_TITLES.site} step={flow.setupStep}>
        <SiteStep state={state} value={site} onChange={setSite} />
        <StepActions
          isSubmitting={flow.isSavingSite}
          error={flow.siteError}
          disabled={!site.domain.trim() || !site.siteType}
          onContinue={async () => {
            if (!site.siteType) return;
            const result = await flow.saveSite({
              domain: site.domain,
              siteType: site.siteType,
              platform: site.platform ?? undefined,
            });
            if (result) flow.goToSetupStep("competitors");
          }}
        />
      </Shell>
    );
  }

  if (flow.setupStep === "competitors") {
    return (
      <Shell title={SETUP_TITLES.competitors} step={flow.setupStep}>
        <CompetitorsStep
          competitors={state.competitors}
          extra={flow.extraCompetitors}
          selected={flow.selectedCompetitors}
          limit={competitorLimit}
          onToggle={flow.toggleCompetitor}
          onAdd={flow.addCompetitor}
        />
        <StepActions
          isSubmitting={flow.isSavingCompetitors}
          error={flow.competitorsError}
          disabled={!projectId}
          onBack={flow.back}
          onContinue={async () => {
            if (!projectId) return;
            const result = await flow.saveCompetitors({
              projectId,
              domains: [...flow.selectedCompetitors],
            });
            if (result) flow.goToSetupStep("keywords");
          }}
        />
      </Shell>
    );
  }

  const byTerm = new Map<string, OnboardingKeyword>(
    state.keywords.map((keyword) => [keyword.term, keyword]),
  );

  return (
    <Shell title={SETUP_TITLES.keywords} step={flow.setupStep}>
      <KeywordsStep
        keywords={state.keywords}
        selected={flow.selectedKeywords}
        limit={keywordLimit}
        onToggle={flow.toggleKeyword}
      />
      <StepActions
        isSubmitting={flow.isSavingKeywords}
        error={flow.keywordsError}
        disabled={!projectId || flow.selectedKeywords.size === 0}
        continueLabel="Go to dashboard"
        onBack={flow.back}
        onContinue={async () => {
          if (!projectId) return;
          const result = await flow.saveKeywords({
            projectId,
            terms: [...flow.selectedKeywords].map((term) => ({
              term,
              intent: byTerm.get(term)?.intent,
            })),
          });
          if (result) flow.finish();
        }}
      />
    </Shell>
  );
}

function Shell({
  title,
  subtitle,
  step,
  children,
}: {
  title: string;
  subtitle?: string;
  step?: SetupStep;
  children: React.ReactNode;
}) {
  const stepIndex = step ? SETUP_STEP_ORDER.indexOf(step) : -1;

  return (
    <main className="mx-auto w-full max-w-[720px] px-5 py-10 sm:px-6 sm:py-14">
      <FadeIn key={title} className="space-y-7">
        <div className="space-y-4">
          {/*
            Eyebrow with a step counter, matching onboarding. Previously this
            screen opened on a bare 2xl heading with no indication of where you
            were or how much was left — the one thing a multi-step form owes
            you.
          */}
          <div className="flex items-center gap-2.5">
            <span className="text-[11px] font-semibold tracking-[0.12em] text-[#6B7480]">
              ADD A SITE
            </span>
            {step ? (
              <>
                <span className="text-[#C6CDD8]">·</span>
                <span className="text-[11.5px] text-[#6B7480]">
                  Step {stepIndex + 1} of {SETUP_STEP_ORDER.length}
                </span>
              </>
            ) : null}
          </div>

          {step ? (
            <div className="flex items-center gap-1.5">
              {SETUP_STEP_ORDER.map((item, index) => (
                <span
                  key={item}
                  className={cn(
                    "h-[3px] flex-1 rounded-full transition-colors duration-500",
                    index <= stepIndex ? "bg-ink-900" : "bg-[#EDEFF3]",
                  )}
                />
              ))}
            </div>
          ) : null}

          <div className="space-y-2.5">
            <h1 className="font-display text-ink-900 text-[26px] font-semibold tracking-[-0.032em] sm:text-[31px]">
              {title}
            </h1>
            {subtitle ? (
              <p className="max-w-[54ch] text-[15px] leading-[1.65] text-[#5B6472]">
                {subtitle}
              </p>
            ) : null}
          </div>
        </div>

        {/*
          The body sits in the same bordered panel every other surface uses.
          The old version put form controls straight onto the page background,
          which is why this screen read as unfinished next to onboarding and the
          report.
        */}
        <div className="rounded-2xl border border-[#E2E6EC] bg-white p-5 sm:p-7">
          {children}
        </div>

        <p className="text-[12.5px] text-[#6B7480]">
          Everything here can be changed later in Settings.
        </p>
      </FadeIn>
    </main>
  );
}

function StepActions({
  isSubmitting,
  error,
  disabled,
  continueLabel = "Continue",
  onBack,
  onContinue,
}: {
  isSubmitting?: boolean;
  error?: string | null;
  disabled?: boolean;
  continueLabel?: string;
  onBack?: () => void;
  onContinue: () => void;
}) {
  return (
    <div className="space-y-4">
      {error ? (
        <div className="border-critical/20 bg-critical/5 text-critical-strong rounded-lg border px-3.5 py-2.5 text-sm">
          {error}
        </div>
      ) : null}

      <div className="flex items-center gap-2">
        {onBack ? (
          <Button variant="ghost" size="sm" onClick={onBack} disabled={isSubmitting}>
            Back
          </Button>
        ) : null}
        <Button onClick={onContinue} disabled={disabled || isSubmitting} className="flex-1 sm:flex-none">
          {isSubmitting ? "Saving…" : continueLabel}
        </Button>
      </div>
    </div>
  );
}
