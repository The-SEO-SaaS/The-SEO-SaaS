# Build from the monorepo root: docker build -f apps/web/Dockerfile .
#
# Adapted from viraltiktokslideshows/apps/web/Dockerfile (same stack and monorepo shape: pnpm
# workspaces using the `catalog:` protocol, a Next.js app fed by shared packages/), with the
# Prisma handling taken from that repo's apps/server/Dockerfile. Those files carry fixes for
# failures already hit in real deployments, so the reasoning behind some lines isn't visible
# from this codebase alone — each one is commented rather than left to look like cruft.
#
# The structural difference from the reference web image: this app is NOT database-free.
# apps/web depends on @theseosaas/core, which depends on @theseosaas/db — so this image needs
# the Prisma schema, a generated client, and openssl, exactly like the reference *server* image
# did. That's why packages/db appears here at all.
#
# Replaces an earlier minimal version of this file that ran `COPY . .` before install (so every
# source edit busted the install layer) and shipped `.next/standalone` — see the runner stage
# for why that output isn't used.
FROM node:22-slim AS builder

WORKDIR /app

# ca-certificates only — no openssl.
#
# The reference image installed openssl because Prisma's Rust query engine links against it.
# This project has no such engine: Prisma 7.9 is running the WASM query compiler through
# @prisma/adapter-pg (see packages/db/src/index.ts), so all database traffic goes over
# node-postgres and TLS is handled by the OpenSSL bundled inside the Node binary. Installing
# the system package bought nothing and made every build wait on a Debian mirror.
#
# ca-certificates stays: TLS to a managed Postgres (Neon/Supabase/RDS with sslmode=require)
# needs a trust store, and it's cheap.
RUN apt-get update -y \
  && apt-get install -y --no-install-recommends ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# corepack rather than `npm install -g pnpm@11`: package.json pins packageManager to
# pnpm@11.4.0, and a floating `@11` can resolve to a newer patch than the one that wrote
# pnpm-lock.yaml, which makes --frozen-lockfile fail for no useful reason.
RUN corepack enable && corepack prepare pnpm@11.4.0 --activate

# Some platforms (Coolify, Dokku and similar) inject NODE_ENV=production as a *build-time*
# variable. pnpm reads that the same as `--prod` and silently skips devDependencies — here that
# would drop typescript, tailwindcss, @tailwindcss/postcss and the prisma CLI, all of which the
# build below needs. Forced back to production in the runner stage.
ENV NODE_ENV=development

# Workspace manifests + lockfile first, so the install layer survives source edits.
# apps/worker is deliberately absent — it ships as its own image.
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/config/package.json packages/config/
COPY packages/env/package.json packages/env/
COPY packages/db/package.json packages/db/
COPY packages/core/package.json packages/core/
COPY packages/ui/package.json packages/ui/
COPY apps/web/package.json apps/web/

# packages/db/package.json has "postinstall": "prisma generate", which pnpm runs as part of the
# install below — i.e. *before* the "source after install" copy further down would otherwise
# land the schema. Without a schema present at install time that postinstall dies with "Could
# not find Prisma Schema" and takes the whole install with it. Bring just the schema and its
# config in now; both change far less often than application code, so the cache barely notices.
COPY packages/db/prisma.config.ts packages/db/
COPY packages/db/prisma/ packages/db/prisma/

# prisma.config.ts reads DATABASE_URL through prisma/config's `env()` helper, which throws when
# the variable is missing entirely — so even `prisma generate`, which never opens a connection,
# fails without *something* set. The real value arrives at container start; this only has to
# parse. Override at build time only if you have a reason to.
ARG DATABASE_URL=postgresql://build:build@localhost:5432/build
ENV DATABASE_URL=${DATABASE_URL}

# `next build` transitively imports @theseosaas/env/server — every route under
# apps/web/src/app/api pulls in @theseosaas/core — and that module validates the entire server
# schema at import time: SMTP credentials, the Serpex key, the OpenRouter key, Google OAuth.
# None of it is needed to compile, and baking real secrets into a build layer would be the
# wrong fix. packages/env/src/server.ts honours SKIP_ENV_VALIDATION, and turbo.json lists it in
# globalPassThroughEnv so it survives into the child process when the build runs through turbo.
#
# Validation still happens for real at container startup, where the values actually exist.
ENV SKIP_ENV_VALIDATION=1

# allowBuilds in pnpm-workspace.yaml already approves the postinstall scripts this repo needs
# (esbuild, sharp, prisma, @prisma/engines) — no extra approval flag required.
RUN pnpm install --frozen-lockfile

# Source after install, for layer caching.
COPY packages/config/ packages/config/
COPY packages/env/ packages/env/
COPY packages/db/ packages/db/
COPY packages/core/ packages/core/
COPY packages/ui/ packages/ui/
COPY apps/web/ apps/web/

# Regenerate explicitly. packages/db/.gitignore excludes prisma/generated, so the client is
# never in the build context, and the postinstall run above wrote into a packages/db that the
# `COPY packages/db/` line has since overwritten. Cheap, and it settles which copy won.
RUN pnpm --filter @theseosaas/db db:generate

# `next build` writes .next/standalone as well (output: "standalone" in next.config.ts); the
# runner ignores it, but leaving the setting alone keeps the option open.
RUN pnpm --filter web build

# public/ isn't in the repo today. Next doesn't create it, and a COPY of a missing path is a
# hard build failure — so create it here rather than discovering that the first time someone
# adds a favicon and then removes it again.
RUN mkdir -p apps/web/public

# ---- Runner ----
FROM node:22-slim AS runner

WORKDIR /app

RUN apt-get update -y \
  && apt-get install -y --no-install-recommends ca-certificates \
  && rm -rf /var/lib/apt/lists/*

RUN corepack enable && corepack prepare pnpm@11.4.0 --activate

# The resolved node_modules tree is copied wholesale from the builder instead of shipping
# `.next/standalone`, which is what the earlier version of this file did.
#
# Standalone works by static analysis: the tracer walks the import graph and copies what it
# thinks is reachable. That graph is unusually awkward here — five workspace packages shipping
# raw TypeScript through `transpilePackages`, plus @prisma/client, whose generated output this
# build writes into packages/db/prisma/generated at a path the tracer has no reason to expect.
# When the tracer misses a file the symptom is a 500 at runtime, not an error at build time,
# which is the worst way to find out. The reference deployment made the same call for the same
# reason.
#
# Cost is image size. If that becomes the binding constraint, the fix is to switch back to
# standalone *and* add an explicit COPY for packages/db/prisma/generated, not to trust the
# tracer with it.
COPY --from=builder /app/package.json ./
COPY --from=builder /app/pnpm-workspace.yaml ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/web ./apps/web
COPY --from=builder /app/packages ./packages

ENV NODE_ENV=production
ENV PORT=3001
ENV HOSTNAME=0.0.0.0

EXPOSE 3001

WORKDIR /app/apps/web

# No migrate step here, on purpose — apps/worker owns schema migration (see its Dockerfile).
# Two services racing `prisma migrate deploy` against one database during a rolling deploy is a
# reliable way to sit on Prisma's advisory lock until something times out.
CMD ["pnpm", "start"]
