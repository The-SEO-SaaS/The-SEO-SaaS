import fs from "node:fs";
import path from "node:path";

/**
 * The marketing blog — "Field Notes".
 *
 * Articles are markdown files in `src/content/blog`, read at build time. Files
 * rather than the database on purpose: these are our own posts, written by us,
 * changing rarely, and versioned alongside the code that renders them. A
 * database would buy an admin screen nobody has asked for and add a query to
 * every page load of a page that could otherwise be fully static.
 *
 * Not to be confused with the Content library at
 * /dashboard/[projectId]/content, which is the articles the product writes
 * *for customers*. The design labels both "/blog", which is why this comment
 * exists.
 *
 * Front matter is a small deliberate subset — no YAML parser dependency for
 * six keys:
 *
 *   ---
 *   title: What 3,000 crawls taught us about title tags
 *   excerpt: One line for the index card and the meta description.
 *   category: Technical SEO
 *   date: 2026-07-14
 *   readMinutes: 6
 *   featured: true
 *   ---
 */

const BLOG_DIR = path.join(process.cwd(), "src", "content", "blog");

export interface BlogPost {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  /** ISO date string. */
  date: string;
  readMinutes: number;
  featured: boolean;
  /** Markdown body, front matter stripped. */
  body: string;
}

export type BlogSummary = Omit<BlogPost, "body">;

function parseFrontMatter(raw: string): { data: Record<string, string>; body: string } {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(raw);
  if (!match) return { data: {}, body: raw.trim() };

  const data: Record<string, string> = {};

  for (const line of match[1]!.split(/\r?\n/)) {
    const separator = line.indexOf(":");
    if (separator === -1) continue;

    const key = line.slice(0, separator).trim();
    // Quotes are optional; strip them if present so titles can contain colons.
    const value = line
      .slice(separator + 1)
      .trim()
      .replace(/^["'](.*)["']$/, "$1");

    if (key) data[key] = value;
  }

  return { data, body: match[2]!.trim() };
}

/** Rough, and only used when a file omits `readMinutes`. */
function estimateReadMinutes(body: string): number {
  return Math.max(1, Math.round(body.split(/\s+/).filter(Boolean).length / 220));
}

function readAll(): BlogPost[] {
  // The directory is committed with a .gitkeep and may hold no posts yet, so a
  // missing or empty folder is a normal state, not an error.
  if (!fs.existsSync(BLOG_DIR)) return [];

  return fs
    .readdirSync(BLOG_DIR)
    .filter((file) => file.endsWith(".md") || file.endsWith(".mdx"))
    .map((file) => {
      const raw = fs.readFileSync(path.join(BLOG_DIR, file), "utf8");
      const { data, body } = parseFrontMatter(raw);
      const slug = file.replace(/\.mdx?$/, "");

      return {
        slug,
        title: data.title ?? slug,
        excerpt: data.excerpt ?? "",
        category: data.category ?? "Field notes",
        date: data.date ?? "",
        readMinutes: Number(data.readMinutes) || estimateReadMinutes(body),
        featured: data.featured === "true",
        body,
      };
    })
    .sort((a, b) => b.date.localeCompare(a.date));
}

export function getAllPosts(): BlogSummary[] {
  return readAll().map(({ body: _body, ...summary }) => summary);
}

export function getPost(slug: string): BlogPost | null {
  return readAll().find((post) => post.slug === slug) ?? null;
}

/** The design's topic sidebar: each category with how many posts carry it. */
export function getTopics(): { label: string; count: number }[] {
  const counts = new Map<string, number>();

  for (const post of readAll()) {
    counts.set(post.category, (counts.get(post.category) ?? 0) + 1);
  }

  return [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}
