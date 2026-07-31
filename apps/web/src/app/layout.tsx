import type { Metadata } from "next";
import { Instrument_Sans, Inter } from "next/font/google";

import "../index.css";
import { GoogleAnalytics } from "@/components/analytics";
import Providers from "@/components/providers";
import { SITE_NAME, SITE_URL } from "@/lib/seo";

/**
 * Fonts match the design file: Instrument Sans for display/headings, Inter for
 * body. Loaded via next/font so they self-host and don't flash on first paint.
 */
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const instrumentSans = Instrument_Sans({
  variable: "--font-instrument-sans",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  display: "swap",
});

/**
 * Icons and the web manifest are picked up automatically from the file
 * conventions in this folder — `favicon.ico`, `icon0.svg`, `icon1.png`,
 * `apple-icon.png` and `manifest.json` all sit alongside this file, so Next
 * emits the corresponding <link> tags itself. The only piece it can't infer is
 * the iOS home-screen title, which is what `appleWebApp.title` sets.
 */
/**
 * Root metadata.
 *
 * `metadataBase` is the important line: without it every relative Open Graph
 * and Twitter image resolves to a relative URL, which crawlers discard
 * silently — so a shared link renders as a bare blue text link with no card.
 *
 * `title.template` means each page sets only its own name and the brand suffix
 * is appended once, here, instead of being retyped (and eventually mistyped) on
 * every route.
 */
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "TheSEOSaaS — find what your site is losing in search",
    template: `%s — ${SITE_NAME}`,
  },
  description:
    "Free SEO audit for SaaS sites. We crawl your site and the competitors ranking above you, find the keywords they own and you don't, then write the pages that close the gap.",
  applicationName: SITE_NAME,
  keywords: [
    "SEO audit",
    "SaaS SEO",
    "keyword gap analysis",
    "competitor SEO analysis",
    "AI content generation",
    "technical SEO audit",
  ],
  authors: [{ name: "Kin", url: "https://x.com/codewithkin" }],
  creator: "Kin",
  publisher: SITE_NAME,
  appleWebApp: {
    title: "The SEO SaaS",
  },
  // Stops phone numbers and addresses being auto-linked in iOS Safari, which
  // mangles domains rendered in report copy.
  formatDetection: { telephone: false, address: false },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    locale: "en_GB",
  },
  twitter: { card: "summary_large_image", creator: "@codewithkin" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // No suppressHydrationWarning: with no theme provider there is no
    // server/client class mismatch to suppress.
    <html lang="en">
      <body className={`${inter.variable} ${instrumentSans.variable} antialiased`}>
        {/* No global header — marketing pages and the app shell have different
            chrome, so each route group brings its own. */}
        <Providers>{children}</Providers>
        {/* Last in the body, loaded after hydration — see components/analytics. */}
        <GoogleAnalytics />
      </body>
    </html>
  );
}
