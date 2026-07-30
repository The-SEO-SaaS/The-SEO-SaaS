"use client";

import { Button } from "@theseosaas/ui/components/button";
import { IconTile } from "@theseosaas/ui/components/icon-tile";
import { AlertTriangle, CreditCard } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";

import { onboardingApi } from "@/lib/api";
import { isApiError } from "@/lib/api-client";

/**
 * Landed here from Dodo's checkout `return_url`. Dodo has already taken the
 * payment at this point — but the Subscription row in our own database only
 * exists once the `subscription.active` webhook lands, which can trail the
 * redirect by a second or two. So this screen retries `completeOnboarding`
 * a few times rather than calling it once and showing a false error.
 */
const MAX_ATTEMPTS = 8;
const RETRY_DELAY_MS = 1500;

export function CheckoutComplete() {
  const router = useRouter();
  const [status, setStatus] = React.useState<"waiting" | "failed">("waiting");
  const [attempt, setAttempt] = React.useState(0);

  React.useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout>;

    const tick = async (count: number) => {
      if (!active) return;
      setAttempt(count);

      try {
        await onboardingApi.complete();
        if (!active) return;
        router.push("/dashboard");
        router.refresh();
        return;
      } catch (error) {
        if (!active) return;

        // Still waiting on the webhook — keep retrying up to the limit.
        const stillPending = isApiError(error) && error.code === "PAYMENT_REQUIRED";
        if (stillPending && count < MAX_ATTEMPTS) {
          timer = setTimeout(() => void tick(count + 1), RETRY_DELAY_MS);
          return;
        }

        setStatus("failed");
      }
    };

    void tick(1);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [router]);

  if (status === "failed") {
    return (
      <main className="flex min-h-svh items-center justify-center px-4 py-16">
        <div className="w-full max-w-md space-y-4 text-center">
          <IconTile tone="critical" size="xl" className="mx-auto">
            <AlertTriangle />
          </IconTile>
          <h1 className="font-display text-ink-900 text-2xl font-semibold">
            Still confirming your payment
          </h1>
          <p className="text-ink-400 text-base leading-relaxed">
            This is usually just a delayed notification from our payment provider. Give it a
            minute, then try again — you won&apos;t be charged twice.
          </p>
          <Button onClick={() => router.push("/onboarding")}>Back to setup</Button>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-svh items-center justify-center px-4 py-16">
      <div className="w-full max-w-md space-y-4 text-center">
        <IconTile tone="ink" size="xl" className="mx-auto animate-pulse">
          <CreditCard />
        </IconTile>
        <h1 className="font-display text-ink-900 text-2xl font-semibold">
          Confirming your subscription
        </h1>
        <p className="text-ink-400 text-base leading-relaxed">
          Just a moment while we hear back from our payment provider.
        </p>
        <span className="sr-only">Attempt {attempt}</span>
      </div>
    </main>
  );
}
