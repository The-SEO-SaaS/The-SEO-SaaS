import type { Metadata } from "next";

import { OnboardingFlow } from "./onboarding-flow";

export const metadata: Metadata = {
  title: "Set up your account — TheSEOSaaS",
  robots: { index: false, follow: false },
};

export default function OnboardingPage() {
  return <OnboardingFlow />;
}
