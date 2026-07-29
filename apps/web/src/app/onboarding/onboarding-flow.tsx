"use client";

import { Button } from "@theseosaas/ui/components/button";
import { IconTile } from "@theseosaas/ui/components/icon-tile";
import { AlertTriangle, Search } from "lucide-react";
import Link from "next/link";
import * as React from "react";

import { CompetitorsStep } from "@/components/onboarding/competitors-step";
import { KeywordsStep } from "@/components/onboarding/keywords-step";
import { PlanStep } from "@/components/onboarding/plan-step";
import { SiteStep, type SiteStepValue } from "@/components/onboarding/site-step";
import { StepShell } from "@/components/onboarding/step-shell";
import { useOnboarding } from "@/hooks/use-onboarding";
import type { OnboardingKeyword } from "@/lib/api";

/**
 * Onboarding.
 *
 * Every step is a confirmation of something the audit already found — the
 * domain, the competitors, the keyword gaps — rather than a blank form. That's
 * what earns the four steps: the user is reviewing our work, not doing theirs.
 */
export function OnboardingFlow() {
  const flow = useOnboarding();
  const { state } = flow;

  const [site, setSite] = React.useState<SiteStepValue>({
    domain: "",
    siteType: null,
    platform: null,
  });
  const [plan, setPlan] = React.useState<"STARTER" | "GROWTH" | "SCALE" | null>(null);

  // Seed local form state once the server payload lands.
  React.useEffect(() => {
    if (!state?.project) return;
    setSite((current) =>
      current.domain
        ? current
        : {
            domain: state.project!.domain,
            siteType: state.project!.siteType,
            platform: state.project!.platform,
          },
    );
    setPlan((current) => current ?? state.plan);
  }, [state]);

  if (flow.isLoading) {
    return (
      <main className="flex min-h-svh items-center justify-center px-4">
        <IconTile tone="ink" size="xl" className="animate-pulse">
          <Search />
        </IconTile>
        <span className="sr-only">Loading your setup</span>
      </main>
    );
  }

  if (flow.isError || !state) {
    return (
      <main className="flex min-h-svh items-center justify-center px-4 py-16">
        <div className="w-full max-w-md space-y-4 text-center">
          <IconTile tone="critical" size="xl" className="mx-auto">
            <AlertTriangle />
          </IconTile>
          <h1 className="font-display text-ink-900 text-2xl font-semibold">
            We couldn&apos;t load your setup
          </h1>
          <p className="text-ink-400 text-base leading-relaxed">
            {flow.errorMessage ?? "Please try again in a moment."}
          </p>
          <Button onClick={flow.refetch}>Try again</Button>
        </div>
      </main>
    );
  }

  const projectId = state.project?.id ?? null;
  const competitorLimit = state.limits?.competitors ?? 3;
  const keywordLimit = state.limits?.keywords ?? 100;

  // --- Step 1: site --------------------------------------------------------
  if (flow.step === "site") {
    return (
      <StepShell
        step="site"
        title="Which site are we working on?"
        subtitle={
          state.project
            ? "We crawled this one for your free audit, so the findings carry over. Change it if you'd rather start elsewhere."
            : "Tell us which site to work on and we'll set everything up around it."
        }
        error={flow.siteError}
        isSubmitting={flow.isSavingSite}
        continueDisabled={!site.domain.trim() || !site.siteType}
        onContinue={async () => {
          if (!site.siteType) return;
          const result = await flow.saveSite({
            domain: site.domain,
            siteType: site.siteType,
            platform: site.platform ?? undefined,
          });
          if (result) {
            await flow.refetch();
            flow.goTo("competitors");
          }
        }}
      >
        <SiteStep state={state} value={site} onChange={setSite} />
      </StepShell>
    );
  }

  // --- Step 2: competitors -------------------------------------------------
  if (flow.step === "competitors") {
    return (
      <StepShell
        step="competitors"
        title="These already take your terms"
        subtitle="Found during your audit by matching the sites that rank above you. Untick anyone who isn't really a competitor."
        error={flow.competitorsError}
        isSubmitting={flow.isSavingCompetitors}
        meta={`${flow.selectedCompetitors.size} of ${competitorLimit} slots used`}
        onBack={flow.back}
        continueDisabled={!projectId}
        onContinue={async () => {
          if (!projectId) return;
          const result = await flow.saveCompetitors({
            projectId,
            domains: [...flow.selectedCompetitors],
          });
          if (result) flow.goTo("keywords");
        }}
      >
        <CompetitorsStep
          competitors={state.competitors}
          extra={flow.extraCompetitors}
          selected={flow.selectedCompetitors}
          limit={competitorLimit}
          onToggle={flow.toggleCompetitor}
          onAdd={flow.addCompetitor}
        />
      </StepShell>
    );
  }

  // --- Step 3: keywords ----------------------------------------------------
  if (flow.step === "keywords") {
    const byTerm = new Map<string, OnboardingKeyword>(
      state.keywords.map((keyword) => [keyword.term, keyword]),
    );

    return (
      <StepShell
        step="keywords"
        title="What should we watch every week?"
        subtitle="Pulled from your audit — the gaps your competitors hold, plus terms your buyers are searching. We've pre-selected the ones with the clearest upside."
        error={flow.keywordsError}
        isSubmitting={flow.isSavingKeywords}
        meta={`${flow.selectedKeywords.size} of ${keywordLimit} selected`}
        onBack={flow.back}
        continueDisabled={!projectId || flow.selectedKeywords.size === 0}
        onContinue={async () => {
          if (!projectId) return;
          const result = await flow.saveKeywords({
            projectId,
            terms: [...flow.selectedKeywords].map((term) => ({
              term,
              intent: byTerm.get(term)?.intent,
            })),
          });
          if (result) flow.goTo("plan");
        }}
      >
        <KeywordsStep
          keywords={state.keywords}
          selected={flow.selectedKeywords}
          limit={keywordLimit}
          onToggle={flow.toggleKeyword}
        />
      </StepShell>
    );
  }

  // --- Step 4: plan --------------------------------------------------------
  return (
    <StepShell
      step="plan"
      title="Pick the limits that fit"
      subtitle="Every plan includes every feature. The only difference is how much you can track and generate each month."
      error={flow.completeError}
      isSubmitting={flow.isCompleting}
      meta="Billing isn't wired up yet — this saves your choice."
      onBack={flow.back}
      continueLabel="Finish setup"
      continueDisabled={!plan}
      onContinue={flow.complete}
    >
      <PlanStep
        competitorCount={flow.selectedCompetitors.size}
        keywordCount={flow.selectedKeywords.size}
        selected={plan}
        onSelect={setPlan}
      />

      <p className="text-ink-300 mt-5 text-center text-sm">
        Changed your mind?{" "}
        <Link href="/dashboard" className="text-ink-500 text-sm">
          Skip for now
        </Link>
      </p>
    </StepShell>
  );
}
