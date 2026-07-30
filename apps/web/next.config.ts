import "@theseosaas/env/web";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typedRoutes: true,
  reactCompiler: true,
  output: "standalone",
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
  typescript: {
    ignoreBuildErrors: true
  }
};

export default nextConfig;
