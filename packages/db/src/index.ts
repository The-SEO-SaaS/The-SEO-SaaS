import { PrismaPg } from "@prisma/adapter-pg";
import { env } from "@theseosaas/env/server";

import { PrismaClient } from "../prisma/generated/client";

/**
 * Re-exported so consumers can reach Prisma's generated helper types without a
 * second export subpath. `@theseosaas/db/client` used to be imported directly,
 * but this package's exports map sends `./*` to `./src/*.ts` — and there is no
 * `src/client.ts`, so that specifier resolved to nothing and broke the build.
 */
export type { Prisma } from "../prisma/generated/client";

export function createPrismaClient() {
  const adapter = new PrismaPg({
    connectionString: env.DATABASE_URL,
  });
  return new PrismaClient({ adapter });
}

const prisma = createPrismaClient();
export default prisma;
