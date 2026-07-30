import prisma from "@theseosaas/db";
import { z } from "zod";

import { getEntitlements } from "../billing/quota.js";
import { AppError } from "../errors.js";
import { checkKeywordsNow } from "../tracking/refresh.js";

/**
 * Keyword management.
 *
 * The design's table has VOLUME and DIFFICULTY columns; both are deliberately
 * absent here. Serpex returns SERP results, not search-volume or difficulty
 * metrics, and inventing either would put a confident-looking number in front
 * of a founder who might make a real content decision on it. What we can state
 * truthfully is where they rank, which way it's moving, and why the term was
 * suggested — so that's what this returns.
 */

const TREND_WINDOW = 30;

export type KeywordIntent =
  | "TRANSACTIONAL"
  | "COMMERCIAL"
  | "INFORMATIONAL"
  | "NAVIGATIONAL";

export interface KeywordRow {
  id: string;
  term: string;
  intent: KeywordIntent;
  source: "AUDIT" | "MANUAL" | "COMPETITOR";
  rationale: string | null;
  isTracked: boolean;

  /** Latest known position. Null = checked but not found in the top 50. */
  position: number | null;
  /** Page URL that ranks, when there is one. */
  url: string | null;
  /** Change vs the previous check. Negative is an improvement (rank went up). */
  change: number | null;
  /** Oldest-first positions for the row sparkline. Empty until first check. */
  trend: number[];
  /** True when no check has run yet — the row shows "checking…", not "not ranking". */
  isPending: boolean;
}

export interface KeywordGapRow {
  term: string;
  intent: KeywordIntent;
  rationale: string | null;
  /** Which tracked competitor holds it, when the audit recorded one. */
  heldBy: string | null;
}

export interface KeywordsPayload {
  keywords: KeywordRow[];
  /** Audit-found terms not yet tracked — the "gaps to competitors" section. */
  gaps: KeywordGapRow[];
  summary: {
    tracked: number;
    ranking: number;
    topTen: number;
    notRanking: number;
  };
  quota: { used: number; limit: number; canAdd: boolean };
}

async function assertOwnedProject(userId: string, projectId: string) {
  const project = await prisma.project.findFirst({
    where: { id: projectId, userId },
    select: { id: true, domain: true },
  });
  if (!project) throw AppError.notFound("We couldn't find that site.");
  return project;
}

interface RawKeyword {
  term: string;
  intent: KeywordIntent;
  rationale: string;
}

interface RawCompetitor {
  domain: string;
}

export async function listKeywords(
  userId: string,
  projectId: string,
): Promise<KeywordsPayload> {
  await assertOwnedProject(userId, projectId);

  const [entitlements, rows, latestAudit] = await Promise.all([
    getEntitlements(userId),
    prisma.keyword.findMany({
      where: { projectId },
      orderBy: [{ isTracked: "desc" }, { createdAt: "asc" }],
      select: {
        id: true,
        term: true,
        intent: true,
        source: true,
        rationale: true,
        isTracked: true,
        rankings: {
          orderBy: { checkedAt: "desc" },
          take: TREND_WINDOW,
          select: { position: true, url: true, checkedAt: true },
        },
      },
    }),
    prisma.audit.findFirst({
      where: { projectId, status: "COMPLETED" },
      orderBy: { completedAt: "desc" },
      select: { rawData: true },
    }),
  ]);

  const keywords: KeywordRow[] = rows.map((row) => {
    // Fetched newest-first for "latest"; reversed for a left-to-right chart.
    const [latest, previous] = row.rankings;
    const trend = [...row.rankings]
      .reverse()
      .map((ranking) => ranking.position)
      .filter((position): position is number => position !== null);

    return {
      id: row.id,
      term: row.term,
      intent: row.intent as KeywordIntent,
      source: row.source as KeywordRow["source"],
      rationale: row.rationale,
      isTracked: row.isTracked,
      position: latest?.position ?? null,
      url: latest?.url ?? null,
      change:
        latest?.position != null && previous?.position != null
          ? latest.position - previous.position
          : null,
      trend,
      isPending: row.rankings.length === 0,
    };
  });

  const raw = (latestAudit?.rawData ?? {}) as {
    keywords?: RawKeyword[];
    competitors?: RawCompetitor[];
  };

  const known = new Set(rows.map((row) => row.term.toLowerCase()));
  const gaps: KeywordGapRow[] = (raw.keywords ?? [])
    .filter((keyword) => !known.has(keyword.term.toLowerCase()))
    .map((keyword) => ({
      term: keyword.term,
      intent: keyword.intent,
      rationale: keyword.rationale ?? null,
      // The audit records gaps as a flat list without attributing each term to
      // a specific rival, so this stays null rather than guessing.
      heldBy: null,
    }));

  const tracked = keywords.filter((keyword) => keyword.isTracked);
  const ranked = tracked.filter((keyword) => keyword.position !== null);

  const limit = entitlements?.limits.trackedKeywords ?? 0;

  return {
    keywords,
    gaps,
    summary: {
      tracked: tracked.length,
      ranking: ranked.length,
      topTen: ranked.filter((keyword) => (keyword.position as number) <= 10).length,
      notRanking: tracked.filter((keyword) => !keyword.isPending && keyword.position === null)
        .length,
    },
    quota: { used: tracked.length, limit, canAdd: tracked.length < limit },
  };
}

// --- Mutations ---------------------------------------------------------------

export const addKeywordsSchema = z.object({
  terms: z
    .array(z.string().trim().min(1, "Enter a keyword.").max(200))
    .min(1, "Enter at least one keyword.")
    .max(100),
  intent: z
    .enum(["TRANSACTIONAL", "COMMERCIAL", "INFORMATIONAL", "NAVIGATIONAL"])
    .default("COMMERCIAL"),
});

export interface AddKeywordsResult {
  added: number;
  /** Terms already present, so the UI can say so rather than silently no-op. */
  duplicates: string[];
}

/**
 * Adds keywords and checks their rank immediately.
 *
 * The immediate check is a deliberate cost: without it a freshly-added row
 * shows nothing for up to a day, right at the moment the user is looking
 * hardest. One search per term is worth not looking broken.
 */
export async function addKeywords(
  userId: string,
  projectId: string,
  input: z.infer<typeof addKeywordsSchema>,
): Promise<AddKeywordsResult> {
  await assertOwnedProject(userId, projectId);
  const parsed = addKeywordsSchema.parse(input);

  const entitlements = await getEntitlements(userId);
  if (!entitlements) {
    throw AppError.paymentRequired("Choose a plan to track keywords.");
  }

  // Case-insensitive dedupe within the request, and against what's stored.
  const wanted = new Map<string, string>();
  for (const term of parsed.terms) {
    wanted.set(term.toLowerCase(), term);
  }

  const existing = await prisma.keyword.findMany({
    where: { projectId, term: { in: [...wanted.values()] } },
    select: { id: true, term: true, isTracked: true },
  });

  const existingByLower = new Map(existing.map((row) => [row.term.toLowerCase(), row]));

  // An existing-but-untracked term isn't a duplicate — re-tracking it is
  // exactly what the user asked for, and its ranking history is still there.
  const toRetrack = existing.filter((row) => !row.isTracked);
  const duplicates = existing.filter((row) => row.isTracked).map((row) => row.term);
  const toCreate = [...wanted.entries()]
    .filter(([lower]) => !existingByLower.has(lower))
    .map(([, term]) => term);

  const trackedCount = await prisma.keyword.count({ where: { projectId, isTracked: true } });
  const netNew = toCreate.length + toRetrack.length;
  const limit = entitlements.limits.trackedKeywords;

  if (trackedCount + netNew > limit) {
    throw AppError.quotaExceeded(
      `Your plan tracks up to ${limit} keywords. You have room for ${Math.max(0, limit - trackedCount)} more.`,
      { details: { limit, used: trackedCount, requested: netNew } },
    );
  }

  const created = await prisma.$transaction([
    ...toCreate.map((term) =>
      prisma.keyword.create({
        data: {
          projectId,
          term,
          intent: parsed.intent,
          source: "MANUAL",
          isTracked: true,
        },
        select: { id: true },
      }),
    ),
    ...toRetrack.map((row) =>
      prisma.keyword.update({
        where: { id: row.id },
        data: { isTracked: true },
        select: { id: true },
      }),
    ),
  ]);

  // Fire-and-forget: the caller shouldn't wait on N searches, and a failed
  // check just means the daily sweep picks it up instead.
  const ids = created.map((row) => row.id);
  void checkKeywordsNow(ids).catch((error) => {
    console.error("[keywords] immediate rank check failed:", error);
  });

  return { added: ids.length, duplicates };
}

/** Adopts audit-suggested gap terms into tracking, keeping their rationale. */
export async function trackGapTerms(
  userId: string,
  projectId: string,
  terms: string[],
): Promise<AddKeywordsResult> {
  await assertOwnedProject(userId, projectId);

  const latestAudit = await prisma.audit.findFirst({
    where: { projectId, status: "COMPLETED" },
    orderBy: { completedAt: "desc" },
    select: { rawData: true },
  });

  const raw = (latestAudit?.rawData ?? {}) as { keywords?: RawKeyword[] };
  const byTerm = new Map(
    (raw.keywords ?? []).map((keyword) => [keyword.term.toLowerCase(), keyword]),
  );

  const entitlements = await getEntitlements(userId);
  if (!entitlements) throw AppError.paymentRequired("Choose a plan to track keywords.");

  const trackedCount = await prisma.keyword.count({ where: { projectId, isTracked: true } });
  const limit = entitlements.limits.trackedKeywords;

  if (trackedCount + terms.length > limit) {
    throw AppError.quotaExceeded(
      `Your plan tracks up to ${limit} keywords. You have room for ${Math.max(0, limit - trackedCount)} more.`,
      { details: { limit, used: trackedCount, requested: terms.length } },
    );
  }

  const ids: string[] = [];

  for (const term of terms) {
    const suggestion = byTerm.get(term.toLowerCase());

    const row = await prisma.keyword.upsert({
      where: { projectId_term: { projectId, term } },
      create: {
        projectId,
        term,
        intent: suggestion?.intent ?? "COMMERCIAL",
        rationale: suggestion?.rationale ?? null,
        source: "AUDIT",
        isTracked: true,
      },
      update: { isTracked: true },
      select: { id: true },
    });

    ids.push(row.id);
  }

  void checkKeywordsNow(ids).catch((error) => {
    console.error("[keywords] immediate rank check failed:", error);
  });

  return { added: ids.length, duplicates: [] };
}

/**
 * Untracks rather than deletes.
 *
 * Ranking history is the one thing we can't rebuild — re-adding a term next
 * month should show its full past, not start from zero. `removeKeyword` below
 * is the escape hatch for genuinely unwanted rows.
 */
export async function setKeywordTracked(
  userId: string,
  projectId: string,
  keywordId: string,
  isTracked: boolean,
): Promise<void> {
  await assertOwnedProject(userId, projectId);

  if (isTracked) {
    const entitlements = await getEntitlements(userId);
    if (!entitlements) throw AppError.paymentRequired("Choose a plan to track keywords.");

    const trackedCount = await prisma.keyword.count({ where: { projectId, isTracked: true } });
    const limit = entitlements.limits.trackedKeywords;

    if (trackedCount >= limit) {
      throw AppError.quotaExceeded(
        `You're tracking all ${limit} keywords your plan allows. Untrack one first, or upgrade.`,
        { details: { limit, used: trackedCount } },
      );
    }
  }

  const { count } = await prisma.keyword.updateMany({
    where: { id: keywordId, projectId },
    data: { isTracked },
  });

  if (count === 0) throw AppError.notFound("We couldn't find that keyword.");

  if (isTracked) {
    void checkKeywordsNow([keywordId]).catch((error) => {
      console.error("[keywords] immediate rank check failed:", error);
    });
  }
}

/** Hard delete, including ranking history. Used when a term was a mistake. */
export async function removeKeyword(
  userId: string,
  projectId: string,
  keywordId: string,
): Promise<void> {
  await assertOwnedProject(userId, projectId);

  const { count } = await prisma.keyword.deleteMany({
    where: { id: keywordId, projectId },
  });

  if (count === 0) throw AppError.notFound("We couldn't find that keyword.");
}
