import type { Metadata } from "next";

import { CheckoutComplete } from "./checkout-complete";

export const metadata: Metadata = {
  title: "Finishing setup — TheSEOSaaS",
  robots: { index: false, follow: false },
};

export default function OnboardingCompletePage() {
  return <CheckoutComplete />;
}
