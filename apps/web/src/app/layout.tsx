import type { Metadata } from "next";
import { Instrument_Sans, Inter } from "next/font/google";

import "../index.css";
import Providers from "@/components/providers";

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

export const metadata: Metadata = {
  title: "TheSEOSaaS — Your AI SEO Growth Team",
  description:
    "We don't just tell you how to improve your SEO — we build the assets that grow your traffic.",
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
      </body>
    </html>
  );
}
