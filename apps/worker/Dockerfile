# Build from the monorepo root: docker build -f apps/worker/Dockerfile .
#
# Adapted from viraltiktokslideshows/apps/server/Dockerfile — same pnpm-workspaces-with-
# `catalog:` shape, same Prisma 7 setup, same long-running-backend-process job. The differences
# are runtime and entrypoint: that service builds to dist/ and runs under Bun, this one has no
# build step and runs TypeScript sources directly under Node (see the CMD note), so the pnpm
# standalone-installer dance the reference needed to work around Bun's missing `node:sqlite`
# doesn't apply here. Corepack is enough.
#
# This is the queue consumer: it polls the Postgres-backed job table (SELECT ... FOR UPDATE
# SKIP LOCKED) and runs crawls, rank sweeps and content generation. It serves no HTTP traffic,
# so there's no EXPOSE and no healthcheck port — liveness is "the process is still up".
FROM node:22-slim AS builder

WORKDIR /app

# ca-certificates only — no openssl. Prisma 7.9 here runs the WASM query compiler behind
# @prisma/adapter-pg, so there's no Rust engine to link against; node-postgres handles the
# connection and Node's own bundled OpenSSL handles TLS. The trust store is still needed for
# `sslmode=require` against a managed Postgres.
RUN apt-get update -y \
  && apt-get install -y --no-install-recommends ca-certificates \
  && rm -rf /var/lib/apt/lists/*

RUN corepack enable && corepack prepare pnpm@11.4.0 --activate

# Platforms that inject NODE_ENV=production at build time make pnpm behave as if `--prod` were
# passed, which silently drops devDependencies — including the prisma CLI that `db:generate`
# below needs. Forced back to production in the runner stage.
ENV NODE_ENV=development

# Manifests + lockfile first, for layer caching. The worker needs @theseosaas/core (the
# business logic), @theseosaas/db (Prisma), @theseosaas/env (config) and @theseosaas/config
# (tsconfig base). packages/ui and apps/web are left out — this image renders nothing.
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/config/package.json packages/config/
COPY packages/env/package.json packages/env/
COPY packages/db/package.json packages/db/
COPY packages/core/package.json packages/core/
COPY apps/worker/package.json apps/worker/

# packages/db has "postinstall": "prisma generate", which runs during the install below — before
# the source copy would otherwise land the schema. Without it, install fails with "Could not
# find Prisma Schema". Same reasoning as the web image.
COPY packages/db/prisma.config.ts packages/db/
COPY packages/db/prisma/ packages/db/prisma/

# prisma.config.ts resolves DATABASE_URL via prisma/config's `env()`, which throws when the
# variable is absent — so `prisma generate` needs one even though it never connects. Real value
# is injected at container start.
ARG DATABASE_URL=postgresql://build:build@localhost:5432/build
ENV DATABASE_URL=${DATABASE_URL}

# @theseosaas/env/server validates the full server schema at import time. Nothing here imports
# it during the *build*, but `db:generate` pulls prisma.config.ts, which pulls dotenv, and the
# flag costs nothing while removing a class of build-time surprise. Startup validation is
# unaffected — see the CMD note.
ENV SKIP_ENV_VALIDATION=1

RUN pnpm install --frozen-lockfile

# Source after install.
COPY packages/config/ packages/config/
COPY packages/env/ packages/env/
COPY packages/db/ packages/db/
COPY packages/core/ packages/core/
COPY apps/worker/ apps/worker/

# packages/db/.gitignore excludes prisma/generated, so the client never arrives in the build
# context, and the `COPY packages/db/` above just replaced whatever postinstall produced.
RUN pnpm --filter @theseosaas/db db:generate

# ---- Runner ----
FROM node:22-slim AS runner

WORKDIR /app

RUN apt-get update -y \
  && apt-get install -y --no-install-recommends ca-certificates \
  && rm -rf /var/lib/apt/lists/*

RUN corepack enable && corepack prepare pnpm@11.4.0 --activate

# There is no compile step to prune against: apps/worker's start script is
# `node --experimental-strip-types src/index.ts`, so the *sources* are the artifact and the
# whole resolved dependency graph has to come along. Copied from the builder rather than
# reinstalled, so the runner can't resolve a different tree than the one that was generated
# against.
COPY --from=builder /app/package.json ./
COPY --from=builder /app/pnpm-workspace.yaml ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/worker ./apps/worker
COPY --from=builder /app/packages ./packages

ENV NODE_ENV=production

# Note the absence of SKIP_ENV_VALIDATION here. The worker talks to Serpex, OpenRouter, SMTP
# and Postgres on its very first job, so a missing key should stop the container at boot with a
# named error rather than surface as a failed job an hour later. That fail-fast is the entire
# point of packages/env.

WORKDIR /app/apps/worker

# Migrations run here, not in the web image, because there should be exactly one migrator.
# `prisma migrate deploy` — not the package.json "db:migrate" script, which is
# `prisma migrate dev`: interactive, and it will happily reset a database it doesn't recognise.
# deploy only applies pending migrations from packages/db/prisma/migrations and records them.
#
# At container *startup* rather than build time, on purpose: it needs the real DATABASE_URL
# (the build-time ARG above is a localhost placeholder) and network reachability to the
# database, neither of which a build layer has.
#
# `exec` hands the PID over to node so SIGTERM reaches the worker directly — it drains the job
# it's holding on shutdown, and that only happens if it actually receives the signal instead of
# the shell swallowing it.
CMD ["sh", "-c", "cd /app/packages/db && pnpm exec prisma migrate deploy && cd /app/apps/worker && exec pnpm start"]
