import { Button } from "@theseosaas/ui/components/button";
import { IconTile } from "@theseosaas/ui/components/icon-tile";
import { Lock } from "lucide-react";
import Link from "next/link";

/**
 * The whole-app paywall.
 *
 * Rendered in place of every `/dashboard/[projectId]/*` screen — the site
 * overview, keywords, competitors, content and audits — whenever the signed-in
 * user has no active subscription. The public audit is the free thing that
 * lets someone decide whether this product is for them; everything past that
 * is the product itself, and showing it for free (even read-only) removes the
 * one reason to ever pay for it.
 *
 * A server component on purpose: it's rendered from the layout before any
 * project data is fetched, so an expired subscription never causes a paywalled
 * page to still do the work of loading keywords or competitors nobody is
 * allowed to see.
 *
 * The CTA goes to `/dashboard/settings`, which is the one place under
 * `/dashboard` this gate doesn't cover — it has to stay reachable so there's
 * somewhere for "subscribe" to actually happen.
 */
export function SubscribeGate({
  reason = "Your subscription isn't active",
}: {
  /** Distinguishes "never subscribed" from "subscription lapsed", when known. */
  reason?: string;
}) {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="w-full max-w-md text-center">
        <IconTile tone="opportunity" size="xl" className="mx-auto">
          <Lock />
        </IconTile>

        <h1 className="font-display text-ink-900 mt-5 text-2xl font-semibold tracking-[-0.02em]">
          {reason}
        </h1>

        <p className="mt-2.5 text-[15px] leading-[1.65] text-[#5B6472]">
          The audit is free for anyone deciding if this is worth it. Everything past
          that — tracking, keywords, competitors, content — needs a plan.
        </p>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Button render={<Link href="/dashboard/settings" />}>Choose a plan</Button>
          <Link href="/pricing" className="text-[13.5px] text-[#5B6472]">
            See pricing
          </Link>
        </div>
      </div>
    </main>
  );
}
