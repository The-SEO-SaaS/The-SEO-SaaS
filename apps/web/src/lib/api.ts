import { http } from "./api-client";

/**
 * Typed endpoint map.
 *
 * Every network path the frontend uses lives here, so a route rename is one
 * edit rather than a grep, and components never build URL strings inline.
 * Types are the contract between apps/web and the Route Handlers.
 */

// --- Shared shapes ---------------------------------------------------------

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

export const contentApi = {
  generate: (opportunityId: string) =>
    http.post<{ contentId: string; jobId: string }>("/content/generate", { opportunityId }),

  job: (jobId: string, signal?: AbortSignal) =>
    http.get<{ status: string; progress: number; progressLabel: string | null }>(
      `/jobs/${jobId}`,
      { signal },
    ),
};
