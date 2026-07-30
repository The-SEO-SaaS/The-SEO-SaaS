export { crawlSite, type SiteCrawl, type PageCrawl } from "./crawl.ts";
export {
  runTechnicalChecks,
  type TechnicalIssue,
  type TechnicalSummary,
  type IssueSeverity,
} from "./technical.ts";
export { calculateScore, type ScoreBreakdown } from "./score.ts";
export {
  discoverCompetitors,
  findBestBlogPosts,
  type DiscoveredCompetitor,
  type CompetitorBestPage,
} from "./competitors.ts";
export {
  extractPositioning,
  findKeywordGaps,
  generateOpportunities,
  type Positioning,
  type KeywordGaps,
  type Opportunities,
} from "./analysis.ts";
export {
  runAuditPipeline,
  type AuditStepKey,
  type RunAuditInput,
} from "./pipeline.ts";
export {
  startAudit,
  getAuditProgress,
  getAuditReport,
  captureAuditLead,
  startAuditSchema,
  captureLeadSchema,
  type StartAuditResult,
} from "./service.ts";
export {
  getAuditHistory,
  rerunAudit,
  type AuditHistory,
  type AuditHistoryEntry,
} from "./history.ts";
