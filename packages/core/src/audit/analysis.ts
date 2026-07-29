import { z } from "zod";

import { generateObject, sumUsage, type Usage } from "../ai/openrouter.js";
import { SEO_LEAD_SYSTEM_PROMPT } from "../ai/prompts.js";
import type { CrawlResult } from "./crawl.js";
import type { CompetitorBestPage, DiscoveredCompetitor } from "./competitors.js";

/**
 * The interpretation layer — everything a model is genuinely better at than a
 * rule.
 *
 * Cost shape: three calls per audit, not one per section. Positioning is
 * extracted first because both later calls need it, then keywords and
 * opportunities run against that shared context. Batching all sections into
 * one call was tempting but produced noticeably worse opportunities — the
 * model spreads effort thin across a large schema.
 */

// --- 1. Positioning --------------------------------------------------------

const positioningSchema = z.object({
  productDescription: z
    .string()
    .describe("One sentence: what this product does and who it is for."),
  category: z.string().describe("Software category, e.g. 'invoicing software'."),
  targetAudience: z.string().describe("Who buys this."),
  seedQueries: z
    .array(z.string())
    .describe(
      "3 search queries a buyer would type when looking for a tool like this. Category terms, never the brand name.",
    ),
  industryHint: z
    .string()
    .describe("Two or three words describing the space, for search filtering."),
});

export type Positioning = z.infer<typeof positioningSchema>;

export async function extractPositioning(
  crawl: CrawlResult,
  signal?: AbortSignal,
): Promise<{ positioning: Positioning; usage: Usage }> {
  const { object, usage } = await generateObject({
    schema: positioningSchema,
    schemaName: "positioning",
    signal,
    temperature: 0.2,
    messages: [
      { role: "system", content: SEO_LEAD_SYSTEM_PROMPT },
      {
        role: "user",
        content: `Read this homepage and work out what the product actually is.

Domain: ${crawl.domain}
Title: ${crawl.title ?? "(none)"}
Meta description: ${crawl.metaDescription ?? "(none)"}
H1: ${crawl.h1s.join(" | ") || "(none)"}
H2s: ${crawl.h2s.slice(0, 12).join(" | ") || "(none)"}

Page text:
${crawl.textContent.slice(0, 3500)}

The seed queries matter most: they must be terms a buyer types when they do NOT yet know this company exists. "project management software for agencies" is right. "${crawl.domain}" or the brand name is wrong.`,
      },
    ],
  });

  return { positioning: object, usage };
}

// --- 2. Keyword gaps -------------------------------------------------------

const keywordGapsSchema = z.object({
  keywords: z
    .array(
      z.object({
        term: z.string(),
        intent: z.enum(["TRANSACTIONAL", "COMMERCIAL", "INFORMATIONAL", "NAVIGATIONAL"]),
        rationale: z
          .string()
          .describe("Why this specific search matters, in revenue terms. One sentence."),
      }),
    )
    .describe("Exactly 10 keywords."),
  headline: z
    .string()
    .describe(
      "One consultant sentence summarising the gap, e.g. 'You're missing 12 buying-intent searches.'",
    ),
});

export type KeywordGaps = z.infer<typeof keywordGapsSchema>;

export async function findKeywordGaps(
  positioning: Positioning,
  competitors: DiscoveredCompetitor[],
  signal?: AbortSignal,
): Promise<{ gaps: KeywordGaps; usage: Usage }> {
  const { object, usage } = await generateObject({
    schema: keywordGapsSchema,
    schemaName: "keyword_gaps",
    signal,
    temperature: 0.4,
    messages: [
      { role: "system", content: SEO_LEAD_SYSTEM_PROMPT },
      {
        role: "user",
        content: `Product: ${positioning.productDescription}
Category: ${positioning.category}
Audience: ${positioning.targetAudience}
Competitors ranking in this space: ${competitors.map((c) => c.domain).join(", ") || "none found"}

Give me exactly 10 high-intent keywords this product should be found for but likely isn't.

Weight heavily toward TRANSACTIONAL and COMMERCIAL intent — searches by people with a problem and a budget, close to buying. Include comparison and alternative-style queries where they fit, since those capture buyers already evaluating options.

Skip generic informational terms that attract readers who will never convert.`,
      },
    ],
  });

  return { gaps: object, usage };
}

// --- 3. Opportunities ------------------------------------------------------

const opportunitiesSchema = z.object({
  blogPosts: z
    .array(
      z.object({
        title: z.string().describe("A real article title, not a topic label."),
        rationale: z.string().describe("Why this wins traffic that converts. One or two sentences."),
        keywords: z.array(z.string()).describe("2-4 target keywords."),
      }),
    )
    .describe("Exactly 3."),
  featurePages: z
    .array(
      z.object({
        title: z.string(),
        type: z.enum(["FEATURE_PAGE", "COMPARISON_PAGE", "INTEGRATION_PAGE"]),
        rationale: z.string(),
        keywords: z.array(z.string()),
      }),
    )
    .describe("Exactly 3."),
  landingPages: z
    .array(
      z.object({
        title: z.string(),
        type: z.enum(["LANDING_PAGE", "USE_CASE_PAGE", "INDUSTRY_PAGE"]),
        rationale: z.string(),
        keywords: z.array(z.string()),
      }),
    )
    .describe("Exactly 3."),
  verdict: z
    .string()
    .describe(
      "2-3 sentences stating where this site stands and what to do first. Lead with the conclusion. No hedging.",
    ),
});

export type Opportunities = z.infer<typeof opportunitiesSchema>;

export async function generateOpportunities(
  input: {
    positioning: Positioning;
    competitors: DiscoveredCompetitor[];
    competitorPages: CompetitorBestPage[];
    keywords: KeywordGaps["keywords"];
    score: number;
    topIssues: string[];
  },
  signal?: AbortSignal,
): Promise<{ opportunities: Opportunities; usage: Usage }> {
  const { object, usage } = await generateObject({
    schema: opportunitiesSchema,
    schemaName: "opportunities",
    signal,
    temperature: 0.6,
    maxTokens: 3000,
    messages: [
      { role: "system", content: SEO_LEAD_SYSTEM_PROMPT },
      {
        role: "user",
        content: `Product: ${input.positioning.productDescription}
Category: ${input.positioning.category}
Audience: ${input.positioning.targetAudience}
SEO score: ${input.score}/100

Competitors: ${input.competitors.map((c) => c.domain).join(", ") || "none found"}

What competitors are winning with:
${input.competitorPages.map((p) => `- ${p.domain}: "${p.title}"`).join("\n") || "- (nothing found)"}

Keyword gaps:
${input.keywords.map((k) => `- ${k.term} (${k.intent})`).join("\n")}

Top technical issues: ${input.topIssues.join("; ") || "none significant"}

Produce 3 blog posts, 3 feature/comparison/integration pages, and 3 landing/use-case/industry pages.

These get generated into real pages, so titles must be specific enough to write from. "How to reduce churn in B2B SaaS" is usable; "Content about churn" is not.

Every rationale must connect to a buyer or a competitor. The founder should read it and understand what they lose by not building it.`,
      },
    ],
  });

  return { opportunities: object, usage };
}

/** Totals AI spend across the three calls, for the audit's cost accounting. */
export function totalUsage(...usages: Usage[]): Usage {
  return sumUsage(...usages);
}
