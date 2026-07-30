"use client";

import { useRouter } from "next/navigation";
import * as React from "react";

import { useMutation, usePolling, useQuery } from "@/hooks/use-request";
import {
  auditApi,
  onboardingApi,
  type AuditProgress,
  type OnboardingState,
  type OnboardingKeyword,
  type SitePlatform,
  type SiteType,
} from "@/lib/api";

/**
 * Adding a second (or third, or tenth) site.
 *
 * Reuses the exact same primitives as the free audit and the original
 * onboarding wizard — start an audit, poll it, claim it, confirm what it
 * found — rather than a parallel "create project" endpoint. The only new
 * piece is the phase machine stitching them together, since this account
 * already has a plan, so there's no checkout step this time.
 */
export type AddSitePhase = "domain" | "crawling" | "failed" | "setup";
export const SETUP_STEP_ORDER = ["site", "competitors", "keywords"] as const;
export type SetupStep = (typeof SETUP_STEP_ORDER)[number];

export function useAddSite() {
  const router = useRouter();

  const [publicId, setPublicId] = React.useState<string | null>(null);
  const [projectId, setProjectId] = React.useState<string | null>(null);
  const [phase, setPhase] = React.useState<AddSitePhase>("domain");

  // --- Phase 1: start the audit ---------------------------------------------

  const startMutation = useMutation((domain: string) => auditApi.start(domain), {
    onSuccess: (result) => {
      setPublicId(result.publicId);
      setPhase("crawling");
    },
  });

  // --- Phase 2: watch it crawl -----------------------------------------------

  const progress = usePolling<AuditProgress>(
    (signal) => auditApi.progress(publicId as string, signal),
    (data) => data.status === "COMPLETED" || data.status === "FAILED",
    { intervalMs: 1500, enabled: phase === "crawling" && Boolean(publicId) },
  );

  React.useEffect(() => {
    if (progress.data?.status === "FAILED") setPhase("failed");
  }, [progress.data?.status]);

  // --- Phase 3: claim it into this account, once it's done -------------------

  const claimMutation = useMutation(() => auditApi.claim(publicId as string), {
    onSuccess: (result) => {
      setProjectId(result.projectId);
      setPhase("setup");
    },
    // The crawl itself succeeded; only the claim call failed (network blip,
    // session hiccup). Surfacing this as a crawl failure is the honest
    // description of "we couldn't get you into your dashboard" either way.
    onError: () => setPhase("failed"),
  });

  React.useEffect(() => {
    if (progress.data?.status === "COMPLETED" && phase === "crawling") {
      claimMutation.mutate(undefined as never);
    }
    // claimMutation is stable across renders (useMutation memoises it); only
    // the completion transition itself should trigger a claim attempt.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [progress.data?.status, phase]);

  // --- Phase 4: confirm site / competitors / keywords for the new project ---

  const setup = useQuery<OnboardingState>(
    (signal) => onboardingApi.state(signal, projectId ?? undefined),
    [projectId],
    { enabled: phase === "setup" && Boolean(projectId) },
  );

  const [setupStep, setSetupStep] = React.useState<SetupStep>("site");
  const [selectedCompetitors, setSelectedCompetitors] = React.useState<Set<string> | null>(null);
  const [selectedKeywords, setSelectedKeywords] = React.useState<Set<string> | null>(null);
  const [extraCompetitors, setExtraCompetitors] = React.useState<string[]>([]);

  React.useEffect(() => {
    if (!setup.data || selectedCompetitors !== null) return;
    setSelectedCompetitors(
      new Set(setup.data.competitors.filter((c) => c.selected).map((c) => c.domain)),
    );
    setSelectedKeywords(new Set(setup.data.keywords.filter((k) => k.selected).map((k) => k.term)));
  }, [setup.data, selectedCompetitors]);

  const siteMutation = useMutation(
    (input: { domain: string; siteType: SiteType; platform?: SitePlatform }) =>
      onboardingApi.saveSite(input),
  );
  const competitorsMutation = useMutation((input: { projectId: string; domains: string[] }) =>
    onboardingApi.saveCompetitors(input),
  );
  const keywordsMutation = useMutation(
    (input: {
      projectId: string;
      terms: { term: string; intent?: OnboardingKeyword["intent"] }[];
    }) => onboardingApi.saveKeywords(input),
  );

  const toggleCompetitor = React.useCallback((domain: string) => {
    setSelectedCompetitors((current) => {
      const next = new Set(current ?? []);
      if (next.has(domain)) next.delete(domain);
      else next.add(domain);
      return next;
    });
  }, []);

  const toggleKeyword = React.useCallback((term: string) => {
    setSelectedKeywords((current) => {
      const next = new Set(current ?? []);
      if (next.has(term)) next.delete(term);
      else next.add(term);
      return next;
    });
  }, []);

  const addCompetitor = React.useCallback((domain: string) => {
    const cleaned = domain.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
    if (!cleaned) return;
    setExtraCompetitors((current) =>
      current.includes(cleaned) ? current : [...current, cleaned],
    );
    setSelectedCompetitors((current) => new Set(current ?? []).add(cleaned));
  }, []);

  /** The last step's Continue lands on the new site's dashboard — no checkout. */
  const finish = React.useCallback(() => {
    if (!projectId) return;
    router.push(`/dashboard/${projectId}`);
    router.refresh();
  }, [projectId, router]);

  const goToSetupStep = React.useCallback((next: SetupStep) => {
    setSetupStep(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const back = React.useCallback(() => {
    setSetupStep((current) => {
      const index = SETUP_STEP_ORDER.indexOf(current);
      return index > 0 ? SETUP_STEP_ORDER[index - 1]! : current;
    });
  }, []);

  return {
    phase,

    // Domain entry
    startAudit: startMutation.mutate,
    isStarting: startMutation.isLoading,
    startError: startMutation.message,

    // Crawl
    progress: progress.data,
    crawlError: (progress.error ? progress.message : null) ?? claimMutation.message,
    crawlGaveUp: progress.gaveUp,

    // Setup wizard
    setupState: setup.data,
    isSetupLoading: setup.isLoading,
    setupStep,
    goToSetupStep,
    back,

    projectId,

    selectedCompetitors: selectedCompetitors ?? new Set<string>(),
    selectedKeywords: selectedKeywords ?? new Set<string>(),
    extraCompetitors,
    toggleCompetitor,
    toggleKeyword,
    addCompetitor,

    saveSite: siteMutation.mutate,
    isSavingSite: siteMutation.isLoading,
    siteError: siteMutation.message,

    saveCompetitors: competitorsMutation.mutate,
    isSavingCompetitors: competitorsMutation.isLoading,
    competitorsError: competitorsMutation.message,

    saveKeywords: keywordsMutation.mutate,
    isSavingKeywords: keywordsMutation.isLoading,
    keywordsError: keywordsMutation.message,

    finish,
  };
}
