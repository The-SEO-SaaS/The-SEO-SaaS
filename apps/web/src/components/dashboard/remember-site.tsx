"use client";

import * as React from "react";

import { rememberLastSiteId } from "@/hooks/use-sites";

/**
 * Records the site being viewed so /dashboard can bounce straight back to it.
 *
 * This used to live inside DashboardTopBar, which meant the layout had to
 * render that bar on every child route — including the ones that draw their
 * own header — and the design's screens each got two stacked bars. Splitting
 * the effect out lets the layout stay chrome-free.
 */
export function RememberSite({ siteId }: { siteId: string }) {
  React.useEffect(() => {
    rememberLastSiteId(siteId);
  }, [siteId]);

  return null;
}
