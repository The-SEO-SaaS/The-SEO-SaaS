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
      <Shell title="Add a site" subtitle="We'll run a free audit on it first, same as day one.">
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (domain.trim()) flow.startAudit(domain.trim());
          }}
        >
          <div className="bg-surface border-line focus-within:border-ink-900 focus-within:ring-ring/10 flex items-center gap-1.5 rounded-lg border px-3 py-2.5 transition-colors focus-within:ring-2">
            <span className="text-ink-300 shrink-0 text-base">https://</span>
            <input
              autoFocus
              value={domain}
              onChange={(event) => setDomain(event.target.value)}
              placeholder="acme.com"
              className="text-ink-900 min-w-0 flex-1 bg-transparent text-base outline-none"
              spellCheck={false}
              inputMode="url"
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
  return (
    <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6 sm:py-16">
      <FadeIn key={title} className="space-y-6">
        <div className="space-y-2">
          {step ? (
            <div className="flex items-center gap-1.5">
              {SETUP_STEP_ORDER.map((item) => (
                <span
                  key={item}
                  className={cn(
                    "h-1 flex-1 rounded-full transition-colors",
                    SETUP_STEP_ORDER.indexOf(item) <= SETUP_STEP_ORDER.indexOf(step)
                      ? "bg-ink-900"
                      : "bg-line",
                  )}
                />
              ))}
            </div>
          ) : null}

          <h1 className="font-display text-ink-900 text-2xl font-semibold tracking-tight sm:text-3xl">
            {title}
          </h1>
          {subtitle ? <p className="text-ink-400 text-base leading-relaxed">{subtitle}</p> : null}
        </div>

        {children}
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
