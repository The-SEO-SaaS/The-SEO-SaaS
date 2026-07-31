import { PrismaPg } from "@prisma/adapter-pg";
import { env } from "@theseosaas/env/server";

/**
 * The `.ts` extension is required, not stylistic. apps/worker runs this file
 * through Node's ESM resolver (`node --experimental-strip-types`), which does no
 * extension guessing — extensionless, this threw ERR_MODULE_NOT_FOUND at the
 * worker's first database import while `client.ts` sat next to it. Turbopack
 * resolved it either way, so the web build never surfaced the problem.
 *
 * The generated client's own internal imports need the same treatment; that's
 * `importFileExtension = "ts"` in prisma/schema/schema.prisma.
 */
import { PrismaClient } from "../prisma/generated/client.ts";

/**
 * Re-exported so consumers can reach Prisma's generated helper types without a
 * second export subpath. `@theseosaas/db/client` used to be imported directly,
 * but this package's exports map sends `./*` to `./src/*.ts` — and there is no
 * `src/client.ts`, so that specifier resolved to nothing and broke the build.
 */
export type { Prisma } from "../prisma/generated/client.ts";

export function createPrismaClient() {
  const adapter = new PrismaPg({
    connectionString: env.DATABASE_URL,
  });
  return new PrismaClient({ adapter });
}

const prisma = createPrismaClient();
export default prisma;
