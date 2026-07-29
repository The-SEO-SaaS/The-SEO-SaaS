export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Runs tasks with a bounded concurrency. Used by the audit pipeline to fan out
 * competitor lookups without opening a dozen simultaneous provider calls.
 */
export async function mapWithConcurrency<T, R>(
  items: readonly T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;

  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor++;
      const item = items[index]!;
      results[index] = await fn(item, index);
    }
  });

  await Promise.all(workers);
  return results;
}

/**
 * Resolves to null instead of throwing. The audit pipeline treats most steps
 * as best-effort: one failed competitor lookup should degrade the report, not
 * fail the whole run.
 */
export async function settle<T>(promise: Promise<T>): Promise<T | null> {
  try {
    return await promise;
  } catch {
    return null;
  }
}
