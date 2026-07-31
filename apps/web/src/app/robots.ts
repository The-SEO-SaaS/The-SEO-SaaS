import type { MetadataRoute } from "next";

import { SITE_URL } from "@/lib/seo";

/**
 * robots.txt.
 *
 * There wasn't one — which, for a product that flags a missing robots.txt in
 * every audit it runs, is the kind of thing a prospective user will check.
 *
 * The disallow list is narrow on purpose. Blocking a path here doesn't make it
 * private (the report pages carry `noindex` for that), it stops crawl budget
 * being spent on pages that can never rank:
 *
 *   /api/       — JSON, and some of it mutates on POST
 *   /dashboard/ — behind auth; a crawler sees a redirect
 *   /onboarding — same
 *   /audit/     — one thin page per third-party domain. See the noIndex note in
 *                 audit/[publicId]/page.tsx: these are excluded for reasons of
 *                 consent and doorway-page risk, not just crawl economy.
 *   /login      — nothing to index
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/dashboard/", "/onboarding", "/audit/", "/login"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
