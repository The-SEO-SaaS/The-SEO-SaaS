import type { Metadata } from "next";

import { SettingsView } from "./settings-view";

export const metadata: Metadata = {
  title: "Settings — TheSEOSaaS",
  robots: { index: false, follow: false },
};

export default function SettingsPage() {
  return <SettingsView />;
}
