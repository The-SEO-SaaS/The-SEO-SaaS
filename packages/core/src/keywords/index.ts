export {
  listKeywords,
  addKeywords,
  trackGapTerms,
  setKeywordTracked,
  removeKeyword,
  addKeywordsSchema,
  type KeywordRow,
  type KeywordGapRow,
  type KeywordsPayload,
  type KeywordIntent,
  type AddKeywordsResult,
} from "./service.ts";

export { scoreSerp, type SerpSignals, type DemandBand } from "./serp-signals.ts";
