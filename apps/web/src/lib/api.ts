import { http } from "./api-client";

/**
 * Typed endpoint map.
 *
 * Every network path the frontend uses lives here, so a route rename is one
 * edit rather than a grep, and components never build URL strings inline.
 * Types are the contract between apps/web and the Route Handlers.
 */

// --- Shared shapes ---------------------------------------------------------

export type PlanId = "STARTER" | "GROWTH" | "SCALE";
export type BillingInterval = "MONTHLY" | "YEARLY";

export type AuditStatus = "QUEUED" | "RUNNING" | "COMPLETED" | "FAILED";

export type AuditStep =
  | "CRAWLING_WEBSITE"
  | "CHECKING_TECHNICAL_SEO"
  | "FINDING_COMPETITORS"
  | "ANALYZING_KEYWORDS"
  | "REVIEWING_TOP_PAGES"
  | "CALCULATING_SCORE"
  | "FINDING_OPPORTUNITIES";

/** Drives the crawl loader. Order is the order the user sees. */
export const AUDIT_STEPS: { key: AuditStep; label: string }[] = [
  { key: "CRAWLING_WEBSITE", label: "Crawling website" },
  { key: "CHECKING_TECHNICAL_SEO", label: "Checking technical SEO" },
  { key: "FINDING_COMPETITORS", label: "Finding competitors" },
  { key: "ANALYZING_KEYWORDS", label: "Analyzing keywords" },
  { key: "REVIEWING_TOP_PAGES", label: "Reviewing top pages" },
  { key: "CALCULATING_SCORE", label: "Calculating SEO score" },
  { key: "FINDING_OPPORTUNITIES", label: "Finding opportunities" },
];

export type IssueSeverity = "CRITICAL" | "WARNING" | "NOTICE";

export type OpportunityType =
  | "BLOG_POST"
  | "FEATURE_PAGE"
  | "LANDING_PAGE"
  | "COMPARISON_PAGE"
  | "INTEGRATION_PAGE"
  | "USE_CASE_PAGE"
  | "INDUSTRY_PAGE";

export interface AuditProgress {
  id: string;
  publicId: string;
  /** Shown on the crawl screen, which renders before the report exists. */
  domain: string;
  status: AuditStatus;
  currentStep: AuditStep | null;
  progress: number;
  error: string | null;
}

export interface AuditIssue {
  id: string;
  severity: IssueSeverity;
  title: string;
  whyItMatters: string;
  howToFix: string | null;
  affectedUrls: string[];
}

/** What the free tier holds back. Stated honestly rather than hidden. */
export interface LockedCounts {
  isLocked: boolean;
  issues: number;
  opportunities: number;
  keywords: number;
}

export interface CompetitorSummary {
  id: string;
  domain: string;
  name: string | null;
  notes: string | null;
  bestPage: {
    url: string;
    title: string;
    whyItMatters: string | null;
  } | null;
}

export interface OpportunitySummary {
  id: string;
  type: OpportunityType;
  title: string;
  rationale: string;
  keywords: string[];
}

export interface KeywordGap {
  term: string;
  intent: "TRANSACTIONAL" | "COMMERCIAL" | "INFORMATIONAL" | "NAVIGATIONAL";
  rationale: string | null;
}

export interface AuditReport {
  id: string;
  publicId: string;
  domain: string;
  status: AuditStatus;
  score: number | null;
  technicalHealth: number | null;
  /** Paired with technicalHealth in the report head's category strip. */
  contentHealth: number | null;
  /** Matches the design's 0–49 / 50–74 / 75+ bands. */
  band: "POOR" | "FAIR" | "GOOD" | null;
  /** Consultant verdict shown instead of a bare number. */
  summary: string | null;

  pagesCrawled: number;
  pagesDiscovered: number;
  counts: { critical: number; warning: number; notice: number };
  /** What's already right — reading only failures makes a good site feel broken. */
  healthy: string[];

  issues: AuditIssue[];
  competitors: CompetitorSummary[];
  opportunities: OpportunitySummary[];
  keywordGaps: KeywordGap[];
  keywordHeadline: string | null;

  locked: LockedCounts;
  /** True once the viewer owns it — hides the claim CTA. */
  isOwner: boolean;
  createdAt: string;
  completedAt: string | null;
}

export interface SessionUser {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  plan: "STARTER" | "GROWTH" | "SCALE" | null;
  subscriptionStatus: string | null;
}

// --- Endpoints -------------------------------------------------------------

export const auditApi = {
  /** Starts an anonymous audit. Returns immediately; the work is queued. */
  start: (domain: string) => http.post<AuditProgress>("/audit", { domain }),

  /** Polled by the crawl loader. Kept deliberately small. */
  progress: (publicId: string, signal?: AbortSignal) =>
    http.get<AuditProgress>(`/audit/${publicId}/progress`, { signal }),

  /** Full report. Public — renders without auth for shared links. */
  report: (publicId: string, signal?: AbortSignal) =>
    http.get<AuditReport>(`/audit/${publicId}`, { signal }),

  /** Soft email gate. The user may skip this and still see the report. */
  captureEmail: (publicId: string, email: string) =>
    http.post<{ ok: true }>(`/audit/${publicId}/email`, { email }),

  /** Attaches a completed anonymous audit to the signed-in account. */
  claim: (publicId: string) =>
    http.post<{ projectId: string }>(`/audit/${publicId}/claim`),
};

export const authApi = {
  session: (signal?: AbortSignal) =>
    http.get<{ user: SessionUser | null }>("/auth/session", { signal }),

  requestMagicLink: (email: string, redirectTo?: string) =>
    http.post<{ sent: true }>("/auth/magic-link", { email, redirectTo }),

  signOut: () => http.post<{ ok: true }>("/auth/sign-out"),

  /** Google is a full-page redirect, not an XHR — this builds the entry URL. */
  googleUrl: (redirectTo?: string) =>
    `/api/auth/google${redirectTo ? `?redirectTo=${encodeURIComponent(redirectTo)}` : ""}`,
};

// --- Onboarding ------------------------------------------------------------

export type OnboardingStepKey = "site" | "competitors" | "keywords" | "plan";
export type SiteType = "SAAS" | "ECOMMERCE" | "CONTENT" | "LOCAL";
export type SitePlatform = "SHOPIFY" | "WORDPRESS" | "WEBFLOW" | "NEXTJS" | "OTHER";

export interface OnboardingCompetitor {
  id: string;
  domain: string;
  name: string | null;
  notes: string | null;
  sharedTerms: number;
  selected: boolean;
}

export interface OnboardingKeyword {
  id: string;
  term: string;
  intent: KeywordGap["intent"];
  rationale: string | null;
  selected: boolean;
}

export interface OnboardingState {
  isComplete: boolean;
  currentStep: OnboardingStepKey;
  project: {
    id: string;
    domain: string;
    name: string;
    siteType: SiteType | null;
    platform: SitePlatform | null;
    pagesCrawled: number;
  } | null;
  competitors: OnboardingCompetitor[];
  keywords: OnboardingKeyword[];
  plan: "STARTER" | "GROWTH" | "SCALE" | null;
  limits: { competitors: number; keywords: number } | null;
}

export const onboardingApi = {
  /** `projectId` reuses this same flow for "add another site" — see useAddSite. */
  state: (signal?: AbortSignal, projectId?: string) =>
    http.get<OnboardingState>("/onboarding", {
      signal,
      params: projectId ? { projectId } : undefined,
    }),

  saveSite: (input: {
    domain: string;
    name?: string;
    siteType: SiteType;
    platform?: SitePlatform;
  }) => http.post<{ projectId: string }>("/onboarding/site", input),

  saveCompetitors: (input: { projectId: string; domains: string[] }) =>
    http.post<{ saved: number }>("/onboarding/competitors", input),

  saveKeywords: (input: {
    projectId: string;
    terms: { term: string; intent?: KeywordGap["intent"]; rationale?: string }[];
  }) => http.post<{ tracked: number }>("/onboarding/keywords", input),

  complete: () => http.post<CompleteOnboardingResult>("/onboarding/complete"),

  /** Opts into a one-off "your crawl finished" email for that run. */
  notifyOnComplete: (publicId: string) =>
    http.post<{ ok: boolean }>("/onboarding/notify", { publicId }),
};

export interface CompleteOnboardingResult {
  /** Null when the user reached the end without a claimed audit. */
  firstCrawl: {
    publicId: string;
    /** True when we're watching the audit that carried over from the free
     *  funnel rather than a fresh run queued just now. */
    reused: boolean;
  } | null;
  project: { id: string; domain: string } | null;
  plan: { id: PlanId; name: string; articlesPerMonth: number };
  /** The setup screen's "waiting for you" panel. */
  waiting: {
    criticalFindings: number;
    briefs: number;
    trackedKeywords: number;
  };
}

// --- Billing -----------------------------------------------------------------

export const billingApi = {
  /** Creates a Dodo Checkout Session and returns the hosted URL to redirect to. */
  checkout: (input: {
    plan: PlanId;
    interval: BillingInterval;
    returnPath?: string;
    cancelPath?: string;
  }) => http.post<{ checkoutUrl: string }>("/billing/checkout", input),

  /** Dodo's hosted portal — card changes, invoices, self-serve cancellation. */
  portal: () => http.post<{ url: string }>("/billing/portal"),
};

// --- Account / settings ------------------------------------------------------

export interface UsageLine {
  metric: "AI_BLOG_POST" | "AI_RECOMMENDATION";
  label: string;
  used: number;
  /** May be Infinity, which JSON serialises as null — treat null as unlimited. */
  limit: number | null;
}

export interface StructuralLine {
  label: string;
  used: number;
  limit: number;
}

export interface AccountSummary {
  user: { id: string; email: string; name: string | null; image: string | null };
  subscription: {
    plan: PlanId;
    planName: string;
    interval: BillingInterval;
    status: string;
    isActive: boolean;
    currentPeriodEnd: string | null;
    cancelAtPeriodEnd: boolean;
    hasPortal: boolean;
  } | null;
  usage: UsageLine[];
  structural: StructuralLine[];
  periodEnd: string;
}

export const accountApi = {
  summary: (signal?: AbortSignal) => http.get<AccountSummary>("/account", { signal }),
};

// --- Sites / dashboard -------------------------------------------------------

export interface SiteSummary {
  id: string;
  domain: string;
  name: string;
  score: number | null;
  /** Sidebar badges. */
  keywordCount: number;
  competitorCount: number;
  createdAt: string;
}

export interface AddSiteQuota {
  used: number;
  limit: number;
  canAdd: boolean;
}

export interface CompetitorStanding {
  domain: string;
  name: string | null;
  notes: string | null;
  sharedTerms: number;
  bestPosition: number | null;
}

export interface ScoreHistoryPoint {
  date: string;
  score: number;
}

export interface AveragePositionPoint {
  date: string;
  averagePosition: number;
}

export interface NextAction {
  opportunityId: string;
  title: string;
  rationale: string;
  keywords: string[];
  reportUrl: string | null;
}

export interface QueuedAction {
  opportunityId: string;
  title: string;
  rationale: string;
  keywords: string[];
}

export interface SiteDashboard {
  project: { id: string; domain: string; name: string; createdAt: string };
  score: {
    current: number | null;
    technicalHealth: number | null;
    band: "POOR" | "FAIR" | "GOOD" | null;
    verdict: string | null;
    history: ScoreHistoryPoint[];
  };
  figures: {
    openIssues: { critical: number; warning: number; notice: number };
    /** Negative is an improvement. Null until a second audit exists. */
    openIssuesChange: number | null;
    /** Oldest-first issue totals per audit. Empty below 2 points. */
    openIssuesHistory: number[];
    opportunityCount: number;
    averagePosition: number | null;
    /** Negative is an improvement. */
    averagePositionChange: number | null;
  };
  competitors: CompetitorStanding[];
  averagePositionTrend: AveragePositionPoint[] | null;
  nextAction: NextAction | null;
  queuedActions: QueuedAction[];
  /** The design's "content in flight" table. Newest first. */
  contentInFlight: {
    id: string;
    title: string;
    target: string | null;
    status: ContentStatus;
  }[];
  quota: {
    competitors: { used: number; limit: number };
    keywords: { used: number; limit: number };
  };
  hasCompletedAudit: boolean;
}

export const sitesApi = {
  list: (signal?: AbortSignal) =>
    http.get<{ sites: SiteSummary[]; addSiteQuota: AddSiteQuota }>("/sites", { signal }),

  dashboard: (projectId: string, signal?: AbortSignal) =>
    http.get<SiteDashboard>(`/sites/${projectId}`, { signal }),
};

// --- Content -----------------------------------------------------------------

export type ContentStatus =
  | "DRAFT"
  | "GENERATING"
  | "GENERATED"
  | "PUBLISHED"
  | "ARCHIVED"
  | "FAILED";

export interface BriefSummary {
  id: string;
  title: string;
  /** "From keyword gap: cold brew subscription" — the design's source line. */
  source: string;
  angle: string;
  sections: { heading: string; covers: string }[];
  keywords: string[];
  wordTarget: number;
  hasPost: boolean;
  createdAt: string;
}

export interface PostSummary {
  id: string;
  title: string;
  source: string;
  status: ContentStatus;
  keywords: string[];
  wordCount: number | null;
  lastError: string | null;
  createdAt: string;
}

export interface ContentLibrary {
  site: { id: string; domain: string };
  briefs: BriefSummary[];
  posts: PostSummary[];
  availableOpportunities: { id: string; title: string; rationale: string; keywords: string[] }[];
  /** `limit: -1` means unlimited. */
  quota: { used: number; limit: number; remaining: number; periodEnd: string };
}

export interface ContentDetail {
  id: string;
  projectId: string;
  title: string;
  status: ContentStatus;
  /** Markdown. Null until generation finishes. */
  body: string | null;
  keywords: string[];
  source: string;
  metaDescription: string | null;
  wordCount: number | null;
  lastError: string | null;
  createdAt: string;
  updatedAt: string;
}

export const contentApi = {
  library: (projectId: string, signal?: AbortSignal) =>
    http.get<ContentLibrary>(`/sites/${projectId}/content`, { signal }),

  /** Free on every plan, and runs inline — the response carries the brief. */
  createBrief: (projectId: string, opportunityId: string) =>
    http.post<BriefSummary>(`/sites/${projectId}/content`, { opportunityId }),

  /** Costs one article from the month's allowance; the worker writes it. */
  writePost: (projectId: string, briefId: string) =>
    http.post<{ contentId: string }>(`/sites/${projectId}/content`, { briefId }),

  item: (contentId: string, signal?: AbortSignal) =>
    http.get<ContentDetail>(`/content/${contentId}`, { signal }),

  setStatus: (contentId: string, status: "PUBLISHED" | "ARCHIVED" | "GENERATED") =>
    http.patch<{ ok: boolean }>(`/content/${contentId}`, { status }),
};

// --- Audit history -----------------------------------------------------------

export interface AuditHistoryEntry {
  id: string;
  publicId: string;
  status: AuditStatus;
  score: number | null;
  technicalHealth: number | null;
  /** Positive is an improvement, vs the previous completed audit. */
  scoreChange: number | null;
  issueCount: number;
  pagesCrawled: number;
  summary: string | null;
  createdAt: string;
  /** When the worker picked it up — the run header times from here. */
  startedAt: string | null;
  completedAt: string | null;
}

export interface AuditHistory {
  site: { id: string; domain: string };
  audits: AuditHistoryEntry[];
  inFlight: { publicId: string; status: string } | null;
  canRerun: boolean;
  rerunBlockedReason: string | null;
}

export const auditHistoryApi = {
  list: (projectId: string, signal?: AbortSignal) =>
    http.get<AuditHistory>(`/sites/${projectId}/audits`, { signal }),

  rerun: (projectId: string) =>
    http.post<{ publicId: string }>(`/sites/${projectId}/audits`),
};

// --- Keywords ----------------------------------------------------------------

export type KeywordIntent = KeywordGap["intent"];

export interface KeywordRow {
  id: string;
  term: string;
  intent: KeywordIntent;
  source: "AUDIT" | "MANUAL" | "COMPETITOR";
  rationale: string | null;
  isTracked: boolean;
  position: number | null;
  url: string | null;
  /** Negative is an improvement — rank moved closer to #1. */
  change: number | null;
  trend: number[];
  isPending: boolean;
  /** Our own 0–100 estimate from SERP composition. Not Ahrefs KD. */
  difficulty: number | null;
  /** How contested the term looks. NOT search volume. */
  demand: "LOW" | "MEDIUM" | "HIGH" | null;
}

export interface KeywordGapRow {
  term: string;
  intent: KeywordIntent;
  rationale: string | null;
  heldBy: string | null;
}

export interface KeywordsPayload {
  keywords: KeywordRow[];
  gaps: KeywordGapRow[];
  summary: { tracked: number; ranking: number; topTen: number; notRanking: number };
  quota: { used: number; limit: number; canAdd: boolean };
}

export const keywordsApi = {
  list: (projectId: string, signal?: AbortSignal) =>
    http.get<KeywordsPayload>(`/sites/${projectId}/keywords`, { signal }),

  add: (projectId: string, input: { terms: string[]; intent?: KeywordIntent }) =>
    http.post<{ added: number; duplicates: string[] }>(
      `/sites/${projectId}/keywords`,
      input,
    ),

  trackGaps: (projectId: string, gapTerms: string[]) =>
    http.post<{ added: number; duplicates: string[] }>(`/sites/${projectId}/keywords`, {
      gapTerms,
    }),

  setTracked: (projectId: string, keywordId: string, isTracked: boolean) =>
    http.patch<{ ok: true }>(`/sites/${projectId}/keywords/${keywordId}`, { isTracked }),

  remove: (projectId: string, keywordId: string) =>
    http.delete<{ ok: true }>(`/sites/${projectId}/keywords/${keywordId}`),
};

// --- Competitors -------------------------------------------------------------

export interface CompetitorStanding {
  id: string;
  domain: string;
  name: string | null;
  notes: string | null;
  beatingUsOn: number;
  losingToUsOn: number;
  bestPosition: number | null;
  averagePosition: number | null;
  trend: number[];
  bestPage: { url: string; title: string; whyItMatters: string | null } | null;
  isPending: boolean;
}

export interface MatrixRow {
  keywordId: string;
  term: string;
  own: number | null;
  byCompetitor: Record<string, number | null>;
  /** Competitor id, or the literal "own". */
  leader: string | null;
}

export interface CompetitorsPayload {
  competitors: CompetitorStanding[];
  matrix: MatrixRow[];
  quota: { used: number; limit: number; canAdd: boolean };
  isAwaitingFirstCheck: boolean;
}

export const competitorsApi = {
  list: (projectId: string, signal?: AbortSignal) =>
    http.get<CompetitorsPayload>(`/sites/${projectId}/competitors`, { signal }),

  add: (projectId: string, input: { domain: string; name?: string }) =>
    http.post<{ id: string }>(`/sites/${projectId}/competitors`, input),

  remove: (projectId: string, competitorId: string) =>
    http.delete<{ ok: true }>(`/sites/${projectId}/competitors/${competitorId}`),
};

export const contentApi = {
  generate: (opportunityId: string) =>
    http.post<{ contentId: string; jobId: string }>("/content/generate", { opportunityId }),

  job: (jobId: string, signal?: AbortSignal) =>
    http.get<{ status: string; progress: number; progressLabel: string | null }>(
      `/jobs/${jobId}`,
      { signal },
    ),
};
