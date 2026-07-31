import "@theseosaas/env/web";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typedRoutes: true,
  reactCompiler: true,

  /**
   * No `output: "standalone"`.
   *
   * It was set but never used: apps/web/Dockerfile ships the resolved
   * node_modules tree and runs `next start`, because the standalone tracer
   * resolves five raw-TypeScript workspace packages and the generated Prisma
   * client by static analysis and misses files often enough to surface as a
   * production 500 rather than a build error.
   *
   * Leaving it on cost a build step and printed a warning on every container
   * start — `"next start" does not work with "output: standalone"` — which is
   * exactly the kind of noise that trains you to ignore boot logs.
   *
   * If the image size ever matters more than the tracer's reliability, turn
   * this back on *and* add an explicit COPY for packages/db/prisma/generated.
   */
  /**
   * Workspace packages ship raw TypeScript, and `packages/core` uses `.js`
   * specifiers on relative imports (`./errors.js` -> `errors.ts`) because the
   * worker runs them through Node's ESM resolver, which requires real
   * extensions.
   *
   * Without listing them here, Turbopack treats them as external packages and
   * looks for literal `.js` files that don't exist — which is exactly the
   * "Can't resolve './errors.js'" failure this whole barrel produced on a
   * production build. Dev worked because the dev server transpiles them
   * anyway.
   */
  transpilePackages: ["@theseosaas/core", "@theseosaas/ui", "@theseosaas/env"],

  /**
   * Left for Node to require at runtime rather than bundled.
   *
   * pdfkit loads its Helvetica metrics from `.afm` files on disk via
   * `fs.readFileSync` with a computed path. A bundler rewrites that path,
   * the files aren't traced, and the failure is a runtime
   * "ENOENT: Helvetica.afm" on the first PDF request rather than anything the
   * build would catch.
   */
  serverExternalPackages: ["pdfkit"],
  typescript: {
    ignoreBuildErrors: true
  }
};

export default nextConfig;
