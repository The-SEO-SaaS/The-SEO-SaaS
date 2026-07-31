"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import * as React from "react";

/**
 * Google Analytics 4.
 *
 * Two pieces, because a single-page app breaks GA's default assumption that a
 * page view equals a document load:
 *
 *  - `GoogleAnalytics` loads gtag.js once, from the root layout.
 *  - `trackEvent` reports the things worth counting, which for this product is
 *    audits — the funnel is "land, submit a domain, wait, read report", and only
 *    the first of those is a navigation.
 *
 * `strategy="afterInteractive"` rather than pasting the snippet into <head>
 * verbatim: Google's instructions are written for a static site, and dropping a
 * blocking <script> above the fold costs real LCP on a page whose entire job is
 * to get a domain into an input. Next loads it right after hydration instead —
 * same data, no cost to the metric this app is selling.
 */

const MEASUREMENT_ID = "G-86RHEKTMNL";

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

export function GoogleAnalytics() {
  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}`}
        strategy="afterInteractive"
      />
      <Script id="ga-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${MEASUREMENT_ID}', {
            // Route changes are reported explicitly by <PageViews />; leaving
            // this on would double-count the first load of every session.
            send_page_view: false
          });
        `}
      </Script>
      <PageViews />
    </>
  );
}

/**
 * Reports a page view on every route change.
 *
 * App Router navigations never reload the document, so gtag's automatic
 * page_view fires once per session and every subsequent screen is invisible.
 *
 * Deliberately keyed on pathname only, not search params. Reading them here
 * would opt the whole tree into client-side rendering at the root, and the
 * params this app carries are `?plan=`, `?redirectTo=` and audit ids — none of
 * which should become a distinct row in a page report.
 */
function PageViews() {
  const pathname = usePathname();

  React.useEffect(() => {
    window.gtag?.("event", "page_view", {
      page_path: pathname,
      page_location: window.location.href,
      page_title: document.title,
    });
  }, [pathname]);

  return null;
}

/**
 * Events worth counting.
 *
 * A closed list rather than a free-form string, so the names in GA can't drift
 * from the names in the code — the usual way analytics rots is three spellings
 * of the same event across four files.
 */
export type AnalyticsEvent =
  /** A domain was submitted from the marketing hero. The top of the funnel. */
  | "audit_started"
  /** The report finished rendering. Pairs with audit_started for a drop-off rate. */
  | "audit_completed"
  /** The audit failed and the user saw an error instead of a report. */
  | "audit_failed"
  /** An email was left at the soft gate before the report. */
  | "audit_lead_captured"
  /** A plan CTA was clicked, with the plan carried through to sign-in. */
  | "plan_selected"
  /** Onboarding finished and a project exists. */
  | "onboarding_completed";

export function trackEvent(
  event: AnalyticsEvent,
  params: Record<string, string | number | boolean> = {},
): void {
  // No-op server-side and when the script is blocked — analytics must never be
  // the reason a user-facing action throws.
  if (typeof window === "undefined") return;
  window.gtag?.("event", event, params);
}
