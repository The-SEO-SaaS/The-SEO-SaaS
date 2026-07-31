/**
 * Standalone audit harness.
 *
 * Runs one full audit end to end against a real site, printing every step as it
 * happens. Nothing about the queue is involved: no job row, no polling, no
 * worker loop, no `--watch` restarting the process halfway through step 2. Just
 * the pipeline, in the foreground, until it finishes or throws.
 *
 * That isolation is the point. When an audit misbehaves under the worker it's
 * genuinely hard to tell whether the pipeline is wrong, the job was picked up
 * twice, or the file watcher killed it mid-crawl. This answers the first
 * question on its own.
 *
 * Run it:
 *   pnpm --filter worker audit
 *   pnpm --filter worker audit example.com          # different site
 *   pnpm --filter worker audit example.com --keep   # don't delete the row after
 *
 * It writes to the same database the app uses and deletes the audit row on the
 * way out unless you pass --keep. Real Serpex and OpenRouter calls are made, so
 * this costs real money — a handful of cents per run.
 */

import { audit, util } from "@theseosaas/core";
import prisma from "@theseosaas/db";

/**
 * Logging matches the worker's own convention — `[tag] message` on console —
 * rather than introducing a logger this repo doesn't otherwise have. The
 * elapsed-time prefix is the addition: knowing that step 3 took 40s is most of
 * what you want from a run like this.
 */
const startedAt = Date.now();

function elapsed(): string {
  const seconds = (Date.now() - startedAt) / 1000;
  return `${seconds.toFixed(1).padStart(6)}s`;
}

function log(tag: string, message: string, detail?: unknown): void {
  const line = `${elapsed()} [${tag}] ${message}`;
  if (detail === undefined) {
    console.log(line);
  } else {
    console.log(line, typeof detail === "string" ? detail : inspect(detail));
  }
}

/** Compact, depth-limited rendering — a crawl result printed raw is unreadable. */
function inspect(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function rule(title: string): void {
  console.log(`\n${"─".repeat(72)}\n  ${title}\n${"─".repeat(72)}`);
}

const DEFAULT_DOMAIN = "viraltiktokslideshows.com";

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const keep = args.includes("--keep");
  const domainArg = args.find((arg) => !arg.startsWith("--")) ?? DEFAULT_DOMAIN;
  const domain = util.normalizeDomain(domainArg);

  rule(`Audit harness — ${domain}`);
  log("setup", `normalised "${domainArg}" to "${domain}"`);
  log("setup", keep ? "will KEEP the audit row" : "will delete the audit row on exit");

  // Fail loudly and early on the credentials this run actually needs, rather
  // than 40 seconds in when the first Serpex call comes back 401. `env` has
  // already validated shape by the time we get here; this checks intent.
  for (const key of ["DATABASE_URL", "SERPEX_API_KEY", "OPENROUTER_API_KEY"] as const) {
    if (!process.env[key]) {
      throw new Error(
        `${key} is not set. This harness talks to the real services — populate apps/web/.env first.`,
      );
    }
  }

  log("db", "connecting…");
  await prisma.$queryRaw`SELECT 1`;
  log("db", "connected");

  // Created directly rather than through `startAudit`, which would rate-limit
  // repeat runs against the same domain (3/day) and hand back a cached audit
  // from the last 24 hours instead of running a fresh one. Both are correct for
  // the product and useless for debugging.
  const record = await prisma.audit.create({
    // `publicId` has no database default — startAudit generates it, so a direct
    // create has to as well or the insert fails on a NOT NULL column.
    data: { domain, publicId: util.randomId(12), status: "QUEUED", progress: 0 },
    select: { id: true, publicId: true },
  });
  log("db", `created audit ${record.id} (public ${record.publicId})`);

  let lastStep = "";

  try {
    rule("Pipeline");

    await audit.runAuditPipeline({
      auditId: record.id,
      domain,
      onProgress: (step, progress) => {
        lastStep = step;
        log("step", `${String(progress).padStart(3)}%  ${step}`);
      },
    });

    rule("Result");

    const finished = await prisma.audit.findUniqueOrThrow({
      where: { id: record.id },
      select: {
        status: true,
        score: true,
        technicalHealth: true,
        issueCount: true,
        pagesCrawled: true,
        summary: true,
        startedAt: true,
        completedAt: true,
        issues: {
          orderBy: { rank: "asc" },
          select: { rank: true, severity: true, category: true, title: true },
        },
      },
    });

    log("result", `status          ${finished.status}`);
    log("result", `score           ${finished.score ?? "—"}`);
    log("result", `technicalHealth ${finished.technicalHealth ?? "—"}`);
    log("result", `pagesCrawled    ${finished.pagesCrawled ?? "—"}`);
    log("result", `issueCount      ${finished.issueCount ?? "—"}`);

    if (finished.summary) {
      console.log(`\n${finished.summary}\n`);
    }

    if (finished.issues.length) {
      rule(`Issues (${finished.issues.length})`);
      for (const issue of finished.issues) {
        console.log(
          `  ${String(issue.rank).padStart(3)}. [${issue.severity}] ${
            issue.category ?? "—"
          } — ${issue.title}`,
        );
      }
    } else {
      log("issues", "none recorded");
    }

    rule(`Done in ${((Date.now() - startedAt) / 1000).toFixed(1)}s`);
  } catch (error) {
    rule("Failed");
    log("error", `last step reached: ${lastStep || "(none — failed before step 1)"}`);

    // The full error, not `error.message`. Pipeline failures are usually
    // wrapped AppErrors whose interesting part is the `cause` several layers
    // down, and a bare message throws that away.
    console.error(error);
    throw error;
  } finally {
    if (keep) {
      log("db", `keeping audit ${record.id} — view at /audit/${record.publicId}`);
    } else {
      // Issues cascade from the audit row; this is a clean slate for the next
      // run, which matters because startAudit would otherwise serve this one
      // from its 24-hour reuse window.
      await prisma.audit.delete({ where: { id: record.id } }).catch((error: unknown) => {
        log("db", "could not delete the audit row", error);
      });
      log("db", "cleaned up");
    }

    await prisma.$disconnect();
  }
}

main().catch(() => {
  // Already printed above with full context. Exit non-zero so `&&` chains and
  // CI notice, without a second unhandled-rejection dump.
  process.exitCode = 1;
});
