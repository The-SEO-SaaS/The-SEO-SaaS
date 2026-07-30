import type { Metadata } from "next";

import { AddSiteFlow } from "./add-site-flow";

export const metadata: Metadata = {
  title: "Add a site — TheSEOSaaS",
  robots: { index: false, follow: false },
};

export default function AddSitePage() {
  return <AddSiteFlow />;
}
