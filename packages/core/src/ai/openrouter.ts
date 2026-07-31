import { env } from "@theseosaas/env/server";
import { z } from "zod";

import { AppError } from "../errors.ts";
import { request } from "../http/index.ts";

/**
 * OpenRouter client.
 *
 * The important method is `generateObject`: nearly everything the product does
 * with AI needs *structured* output (opportunities, issues, recommendations),
 * not prose. It sends a JSON schema derived from a Zod schema, then validates
 * the response against that same Zod schema — so a malformed generation fails
 * loudly here instead of corrupting a report downstream.
 */

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

/**
 * The model, fixed in code rather than read from the environment.
 *
 * Every generation this product ships — the audit verdict, the findings, the
 * brief, the article — is tuned against one model's behaviour. The brand
 * voice in `ai/voice.ts` is a set of rules written for how *this* model
 * follows instructions, and `generateObject` depends on it honouring a JSON
 * schema reliably. A model swapped in via an env var would silently change
 * all of that with no code review and no way to tell from a diff why the
 * output drifted.
 *
 * Pinned to `-5` rather than `claude-sonnet-latest`: an alias that
 * auto-follows the newest release would re-introduce exactly the silent
 * change this constant exists to prevent.
 *
 * Callers can still override per-call via `options.model`, which is how a
 * cheaper model would be used for a genuinely trivial task.
 */
export const MODEL = "anthropic/claude-sonnet-5";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface Usage {
  inputTokens: number;
  outputTokens: number;
  /** OpenRouter returns actual spend, so audit cost is measured, not estimated. */
  costUsd: number;
}

interface OpenRouterResponse {
  id: string;
  model: string;
  choices: Array<{
    message: { content: string | null; refusal?: string | null };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    cost?: number;
  };
}

export interface GenerateOptions {
  messages: ChatMessage[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
  signal?: AbortSignal;
}

function headers(): Record<string, string> {
  return {
    authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
    // OpenRouter uses these for attribution on their rankings page.
    "HTTP-Referer": env.APP_URL,
    "X-Title": "TheSEOSaaS",
  };
}

function readUsage(response: OpenRouterResponse): Usage {
  return {
    inputTokens: response.usage?.prompt_tokens ?? 0,
    outputTokens: response.usage?.completion_tokens ?? 0,
    costUsd: response.usage?.cost ?? 0,
  };
}

export interface GenerateTextResult {
  text: string;
  model: string;
  usage: Usage;
}

/** Free-form generation. Used for long-form blog bodies. */
export async function generateText(options: GenerateOptions): Promise<GenerateTextResult> {
  const { data } = await request<OpenRouterResponse>(OPENROUTER_URL, {
    method: "POST",
    provider: "openrouter",
    headers: headers(),
    body: {
      model: options.model ?? MODEL,
      messages: options.messages,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.maxTokens ?? 4000,
      usage: { include: true },
    },
    // Long-form generation is slow; retries are expensive, so allow just one.
    timeoutMs: options.timeoutMs ?? 120_000,
    retries: 1,
    signal: options.signal,
  });

  const choice = data.choices?.[0];
  if (choice?.message.refusal) {
    throw AppError.upstream("The model declined to generate this content.", {
      details: { refusal: choice.message.refusal },
    });
  }

  const text = choice?.message.content?.trim();
  if (!text) throw AppError.upstream("The model returned an empty response.");

  return { text, model: data.model, usage: readUsage(data) };
}

export interface GenerateObjectOptions<T> extends GenerateOptions {
  schema: z.ZodType<T>;
  /** Name given to the JSON schema. Some models condition on it. */
  schemaName?: string;
}

export interface GenerateObjectResult<T> {
  object: T;
  model: string;
  usage: Usage;
}

/**
 * Structured generation with strict JSON-schema enforcement.
 *
 * Zod 4 ships `z.toJSONSchema`, so the schema is the single source of truth:
 * it both constrains the model and validates the result. Retries once with the
 * validation error fed back, which recovers most near-miss generations without
 * failing an entire audit.
 */
export async function generateObject<T>(
  options: GenerateObjectOptions<T>,
): Promise<GenerateObjectResult<T>> {
  const jsonSchema = z.toJSONSchema(options.schema, { target: "draft-7" });

  const attempt = async (messages: ChatMessage[]) => {
    const { data } = await request<OpenRouterResponse>(OPENROUTER_URL, {
      method: "POST",
      provider: "openrouter",
      headers: headers(),
      body: {
        model: options.model ?? MODEL,
        messages,
        temperature: options.temperature ?? 0.4,
        max_tokens: options.maxTokens ?? 4000,
        response_format: {
          type: "json_schema",
          json_schema: {
            name: options.schemaName ?? "response",
            strict: true,
            schema: jsonSchema,
          },
        },
        usage: { include: true },
      },
      timeoutMs: options.timeoutMs ?? 90_000,
      retries: 1,
      signal: options.signal,
    });

    return data;
  };

  let data = await attempt(options.messages);
  let content = data.choices?.[0]?.message.content;

  if (!content) throw AppError.upstream("The model returned an empty response.");

  let parsed = safeParseJson(content);
  let validated = parsed.ok ? options.schema.safeParse(parsed.value) : null;

  if (!validated?.success) {
    // One corrective round trip. Cheaper than failing the audit and far more
    // reliable than hoping the first generation is always well-formed.
    const problem = validated
      ? JSON.stringify(z.treeifyError(validated.error))
      : "The response was not valid JSON.";

    data = await attempt([
      ...options.messages,
      { role: "assistant", content },
      {
        role: "user",
        content: `That response did not match the required schema: ${problem}\nReturn corrected JSON only.`,
      },
    ]);

    content = data.choices?.[0]?.message.content;
    if (!content) throw AppError.upstream("The model returned an empty response.");

    parsed = safeParseJson(content);
    if (!parsed.ok) {
      throw AppError.upstream("The model returned invalid JSON.");
    }

    validated = options.schema.safeParse(parsed.value);
    if (!validated.success) {
      throw AppError.upstream("The model's response didn't match the expected shape.", {
        details: { issues: z.treeifyError(validated.error) },
      });
    }
  }

  return { object: validated.data, model: data.model, usage: readUsage(data) };
}

function safeParseJson(raw: string): { ok: true; value: unknown } | { ok: false } {
  try {
    return { ok: true, value: JSON.parse(raw) };
  } catch {
    // Some models wrap JSON in a ```json fence despite json_schema mode.
    const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fenced?.[1]) {
      try {
        return { ok: true, value: JSON.parse(fenced[1]) };
      } catch {
        return { ok: false };
      }
    }
    return { ok: false };
  }
}

/** Adds two usage records. Used to total an audit's spend across steps. */
export function sumUsage(...usages: Usage[]): Usage {
  return usages.reduce<Usage>(
    (total, usage) => ({
      inputTokens: total.inputTokens + usage.inputTokens,
      outputTokens: total.outputTokens + usage.outputTokens,
      costUsd: total.costUsd + usage.costUsd,
    }),
    { inputTokens: 0, outputTokens: 0, costUsd: 0 },
  );
}
