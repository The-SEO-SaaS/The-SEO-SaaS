import type { Metadata } from "next";

/**
 * Shared SEO metadata.
 *
 * Before this, most pages set a `title` and a `description` and nothing else —
 * no canonical, no Open Graph, no Twitter card. For a product whose entire
 * pitch is "we fix your search presence", shipping pages that render as a bare
 * blue link when shared is a credibility problem before it's a traffic one.
 *
 * One builder rather than hand-written objects per route, because the failure
 * mode here is silent: nobody notices a missing `og:image` until a link is
 * already in a Slack thread looking like nothing.
 */

export const SITE_NAME = "TheSEOSaaS";

/**
 * Absolute base for canonicals and OG URLs.
 *
 * Open Graph requires absolute URLs — a relative `og:image` is simply ignored
 * by every crawler. `NEXT_PUBLIC_APP_URL` isn't in the env schema, so this
 * falls back rather than throwing: a wrong-but-present canonical in a preview
 * deploy is better than a build that won't run.
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_APP_URL ??
  process.env.APP_URL ??
  "https://theseosaas.com"
).replace(/\/$/, "");

/**
 * The default share image.
 *
 * Points at the existing 512px manifest icon until a real 1200×630 card exists.
 * A square logo is a poor OG image — it gets letterboxed — but it is
 * substantially better than nothing, and this is the one line to change when
 * the proper card lands.
 */
const DEFAULT_OG_IMAGE = "/web-app-manifest-512x512.png";

interface PageSeoInput {
  /** Page-specific title, without the brand suffix. */
  title: string;
  description: string;
  /** Root-relative path, e.g. `/pricing`. Used for the canonical and og:url. */
  path: string;
  /** Root-relative or absolute image. Falls back to the brand mark. */
  image?: string;
  /** `article` for blog posts; everything else is a website. */
  type?: "website" | "article";
  publishedTime?: string;
  /** Set on pages that shouldn't be indexed — audit reports, app screens. */
  noIndex?: boolean;
}

export function pageMetadata({
  title,
  description,
  path,
  image = DEFAULT_OG_IMAGE,
  type = "website",
  publishedTime,
  noIndex = false,
}: PageSeoInput): Metadata {
  const url = `${SITE_URL}${path === "/" ? "" : path}`;
  const absoluteImage = image.startsWith("http") ? image : `${SITE_URL}${image}`;

  return {
    title,
    description,

    // Self-referencing canonical on every page. Cheap insurance against the
    // duplicate-content the audit itself flags on other people's sites.
    alternates: { canonical: url },

    ...(noIndex
      ? { robots: { index: false, follow: true } }
      : {
          robots: {
            index: true,
            follow: true,
            googleBot: {
              index: true,
              follow: true,
              // Google's defaults truncate rich results aggressively; these
              // three opt into full previews.
              "max-snippet": -1,
              "max-image-preview": "large",
              "max-video-preview": -1,
            },
          },
        }),

    openGraph: {
      type,
      url,
      siteName: SITE_NAME,
      title,
      description,
      images: [{ url: absoluteImage, width: 512, height: 512, alt: SITE_NAME }],
      ...(publishedTime ? { publishedTime } : {}),
    },

    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [absoluteImage],
      creator: "@codewithkin",
    },
  };
}
