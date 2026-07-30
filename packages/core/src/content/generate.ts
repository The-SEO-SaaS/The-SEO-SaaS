import prisma from "@theseosaas/db";
import { z } from "zod";

import { generateObject, generateText, sumUsage } from "../ai/index.ts";
import { refundQuota } from "../billing/quota.ts";
import { toAppError } from "../errors.ts";
import { POST_SYSTEM_PROMPT, briefPrompt, postPrompt } from "./prompts.ts";

/**
 * The generation itself.
 *
 * Briefs are structured and cheap, so they run inline in the request. Posts are
 * a single long completion — a minute or more of wall time and the most
 * expensive call the product makes — so they run in the worker, exactly like
 * the audit pipeline, for the same reason.
 */

export const briefSchema = z.object({
  title: z.string().describe("The article's working title. Compelling, not keyword-stuffed."),
  angle: z
    .string()
    .describe("One sentence: what makes this article different from what already ranks."),
  metaDescription: z.string().describe("Under 160 characters, written to earn the click."),
  sections: z
    .array(
      z.object({
        heading: z.string().describe("The H2, as it will appear."),
        covers: z.string().describe("One line on what this section must establish."),
      }),
    )
    .min(4)
    .max(9),
  wordTarget: z.number().describe("Realistic length for this topic, between 800 and 2500."),
});

export type GeneratedBrief = z.infer<typeof briefSchema>;

/** Wide enough that a short model reply isn't truncated mid-table. */
const POST_MAX_TOKENS = 6000;
const POST_TIMEOUT_MS = 1000 * 60 * 4;

export interface BriefContext {
  domain: string;
  positioning: string | null;
  targetKeyword: string;
  supportingKeywords: string[];
  rationale: string;
  currentPosition: number | null;
  competitorsRanking: string[];
}

export async function generateBrief(
  context: BriefContext,
  signal?: AbortSignal,
): Promise<{ brief: GeneratedBrief; model: string; usage: ReturnType<typeof sumUsage> }> {
  const result = await generateObject({
    schema: briefSchema,
    schemaName: "blog_brief",
    messages: [
      { role: "system", content: POST_SYSTEM_PROMPT },
      { role: "user", content: briefPrompt(context) },
    ],
    temperature: 0.7,
    signal,
  });

  return { brief: result.object, model: result.model, usage: result.usage };
}

/**
 * Writes the post for a Content row that's already in GENERATING.
 *
 * Owns the whole lifecycle of that row: on success it lands GENERATED with a
 * body, on failure FAILED with the reason, and the quota reserved before
 * queueing is refunded — the user should not be charged an article for a
 * generation that produced nothing.
 */
export async function runContentGeneration(input: {
  contentId: string;
  signal?: AbortSignal;
}): Promise<void> {
  const content = await prisma.content.findUnique({
    where: { id: input.contentId },
    select: {
      id: true,
      title: true,
      brief: true,
      keywords: true,
      project: { select: { domain: true, userId: true } },
    },
  });

  if (!content) throw new Error(`content ${input.contentId} no longer exists`);

  const brief = briefSchema.safeParse(content.brief);
  if (!brief.success) {
    await fail(content.id, "This post's brief is incomplete. Regenerate the brief first.");
    await refundQuota(content.project.userId, "AI_BLOG_POST").catch(() => {});
    return;
  }

  try {
    const positioning = await readPositioning(content.project.domain);

    const result = await generateText({
      messages: [
        { role: "system", content: POST_SYSTEM_PROMPT },
        {
          role: "user",
          content: postPrompt({
            domain: content.project.domain,
            positioning,
            title: brief.data.title,
            angle: brief.data.angle,
            targetKeyword: content.keywords[0] ?? brief.data.title,
            supportingKeywords: content.keywords.slice(1),
            sections: brief.data.sections,
            wordTarget: brief.data.wordTarget,
          }),
        },
      ],
      temperature: 0.8,
      maxTokens: POST_MAX_TOKENS,
      timeoutMs: POST_TIMEOUT_MS,
      signal: input.signal,
    });

    const body = stripCodeFence(result.text.trim());

    if (body.length < 400) {
      throw new Error("The model returned too little to be a usable article.");
    }

    await prisma.content.update({
      where: { id: content.id },
      data: {
        status: "GENERATED",
        body,
        wordCount: countWords(body),
        model: result.model,
        aiInputTokens: result.usage.inputTokens,
        aiOutputTokens: result.usage.outputTokens,
        costUsd: result.usage.costUsd,
        lastError: null,
      },
    });
  } catch (error) {
    const appError = toAppError(error);
    await fail(content.id, appError.message);
    // The article was paid for out of this month's allowance; nothing was
    // produced, so give it back.
    await refundQuota(content.project.userId, "AI_BLOG_POST").catch(() => {});
    throw appError;
  }
}

async function fail(contentId: string, message: string): Promise<void> {
  await prisma.content
    .update({ where: { id: contentId }, data: { status: "FAILED", lastError: message } })
    .catch(() => {});
}

/**
 * The positioning paragraph the audit already extracted. Re-deriving it here
 * would mean another model call for something we've paid for once.
 */
async function readPositioning(domain: string): Promise<string | null> {
  const audit = await prisma.audit.findFirst({
    where: { domain, status: "COMPLETED" },
    orderBy: { completedAt: "desc" },
    select: { rawData: true },
  });

  const raw = (audit?.rawData ?? {}) as { positioning?: { summary?: string } | string };

  if (typeof raw.positioning === "string") return raw.positioning;
  return raw.positioning?.summary ?? null;
}

/**
 * Models sometimes wrap the whole document in ```markdown despite being told
 * not to. Stripping it here is cheaper than a retry, and leaves genuine fenced
 * code blocks inside the article untouched.
 */
function stripCodeFence(text: string): string {
  const match = /^```(?:markdown|md)?\n([\s\S]*)\n```$/.exec(text);
  return match ? match[1]!.trim() : text;
}

function countWords(markdown: string): number {
  return markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/[#>*_`|-]/g, " ")
    .split(/\s+/)
    .filter(Boolean).length;
}
