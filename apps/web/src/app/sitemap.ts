import type { MetadataRoute } from "next";

import { getAllPosts } from "@/lib/blog";
import { SITE_URL } from "@/lib/seo";

/**
 * sitemap.xml.
 *
 * Static routes plus every published Field Notes post. Blog posts are markdown
 * files read at build time, so this needs no database and no revalidation —
 * a new post ships with a deploy, and so does its sitemap entry.
 *
 * `priority` is included because it costs nothing, while being honest that
 * Google has said for years it largely ignores it. `lastModified` is the field
 * that actually earns a recrawl, which is why posts carry their real date
 * rather than `new Date()`.
 *
 * Nothing under /audit, /dashboard or /onboarding appears here — a sitemap
 * listing pages that are `noindex` or behind auth is a contradiction, and
 * Search Console reports it as one.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/pricing`, lastModified: now, changeFrequency: "monthly", priority: 0.9 },
    { url: `${SITE_URL}/about`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE_URL}/blog`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${SITE_URL}/contact`, lastModified: now, changeFrequency: "yearly", priority: 0.5 },
    { url: `${SITE_URL}/status`, lastModified: now, changeFrequency: "daily", priority: 0.3 },
    { url: `${SITE_URL}/terms`, lastModified: now, changeFrequency: "yearly", priority: 0.2 },
    { url: `${SITE_URL}/privacy`, lastModified: now, changeFrequency: "yearly", priority: 0.2 },
  ];

  const posts: MetadataRoute.Sitemap = getAllPosts().map((post) => ({
    url: `${SITE_URL}/blog/${post.slug}`,
    lastModified: post.date ? new Date(post.date) : now,
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  return [...staticRoutes, ...posts];
}
