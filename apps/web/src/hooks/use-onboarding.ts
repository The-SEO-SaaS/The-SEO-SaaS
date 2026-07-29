"use client";

import { useRouter } from "next/navigation";
import * as React from "react";

import { useMutation, useQuery } from "@/hooks/use-request";
import {
  onboardingApi,
  type OnboardingState,
  type OnboardingStepKey,
  type SitePlatform,
  type SiteType,
} from "@/lib/api";

/**
 * Onboarding state machine.
 *
 * The server state is fetched once and held here; step navigation is local, so
 * moving back and forth is instant with no spinner between screens. Each step
 * persists on Continue rather than on every keystroke — a half-filled step
 * that the user abandons shouldn't leave partial rows behind.
 */
export const STEP_ORDER: OnboardingStepKey[] = [
  "site",
  "competitors",
  "keywords",
  "plan",
];

export function useOnboarding() {
  const router = useRouter();

  const { data, isLoading, isError, message, refetch } = useQuery<OnboardingState>(
    (signal) => onboardingApi.state(signal),
    [],
  );

  const [step, setStep] = React.useState<OnboardingStepKey | null>(null);

  // Resume where the server says the user left off, but only for the initial
  // load — re-syncing after every save would yank them forward mid-flow.
  React.useEffect(() => {
    if (data && step === null) setStep(data.currentStep);
  }, [data, step]);

  // --- Local selections, seeded from the server once -----------------------
  const [selectedCompetitors, setSelectedCompetitors] = React.useState<Set<string> | null>(
    null,
  );
  const [selectedKeywords, setSelectedKeywords] = React.useState<Set<string> | null>(null);
  const [extraCompetitors, setExtraCompetitors] = React.useState<string[]>([]);

  React.useEffect(() => {
    if (!data || selectedCompetitors !== null) return;
    setSelectedCompetitors(
      new Set(data.competitors.filter((c) => c.selected).map((c) => c.domain)),
    );
    setSelectedKeywords(new Set(data.keywords.filter((k) => k.selected).map((k) => k.term)));
  }, [data, selectedCompetitors]);

  const siteMutation = useMutation(
    (input: {
      domain: string;
      name?: string;
      siteType: SiteType;
      platform?: SitePlatform;
    }) => onboardingApi.saveSite(input),
  );

  const competitorsMutation = useMutation((input: { projectId: string; domains: string[] }) =>
    onboardingApi.saveCompetitors(input),
  );

  const keywordsMutation = useMutation(
    (input: {
      projectId: string;
      terms: { term: string; intent?: OnboardingState["keywords"][number]["intent"] }[];
    }) => onboardingApi.saveKeywords(input),
  );

  const completeMutation = useMutation(() => onboardingApi.complete(), {
    onSuccess: () => {
      router.push("/dashboard");
      router.refresh();
    },
  });

  const goTo = React.useCallback((next: OnboardingStepKey) => {
    setStep(next);
    // Each step is a new screen conceptually, so start it at the top.
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const back = React.useCallback(() => {
    setStep((current) => {
      if (!current) return current;
      const index = STEP_ORDER.indexOf(current);
      return index > 0 ? STEP_ORDER[index - 1]! : current;
    });
  }, []);

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

  return {
    state: data,
    step: step ?? "site",
    isLoading,
    isError,
    errorMessage: message,
    refetch,

    goTo,
    back,

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

    complete: () => completeMutation.mutate(undefined as never),
    isCompleting: completeMutation.isLoading,
    completeError: completeMutation.message,
  };
}
