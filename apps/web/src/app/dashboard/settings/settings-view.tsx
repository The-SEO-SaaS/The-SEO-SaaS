"use client";

import {
  PLANS,
  PLAN_ORDER,
  formatPrice,
  type BillingInterval,
  type PlanId,
} from "@theseosaas/core/plans";
import { Badge } from "@theseosaas/ui/components/badge";
import { Button } from "@theseosaas/ui/components/button";
import { Card, CardContent } from "@theseosaas/ui/components/card";
import { IconTile } from "@theseosaas/ui/components/icon-tile";
import { FadeIn } from "@theseosaas/ui/components/motion";
import { cn } from "@theseosaas/ui/lib/utils";
import { AlertTriangle, ExternalLink, Search } from "lucide-react";
import * as React from "react";

import { IntervalToggle } from "@/components/marketing/pricing-table";
import { PageHeader } from "@/components/dashboard/page-header";
import { useAccount } from "@/hooks/use-account";
import { useCheckoutRedirect, usePortalRedirect } from "@/hooks/use-billing";
import { useSignOut } from "@/hooks/use-session";

/**
 * Settings: who you are, what you're on, what you've used, and how to change it.
 *
 * Card details, invoices and cancellation all live in Dodo's hosted portal
 * rather than being rebuilt here — they're the merchant of record, so the
 * authoritative version of all three is on their side anyway. What this page
 * owns is the parts Dodo can't know: usage against our own limits, and which
 * plan maps to which limits.
 */
export function SettingsView() {
  const { summary, isLoading, isError, errorMessage, refetch } = useAccount();
  const portal = usePortalRedirect();
  const checkout = useCheckoutRedirect();
  const { signOut, isSigningOut } = useSignOut();

  const [interval, setInterval] = React.useState<BillingInterval>("MONTHLY");

  // Default the toggle to whatever they're already billed on.
  React.useEffect(() => {
    if (summary?.subscription) setInterval(summary.subscription.interval);
  }, [summary?.subscription]);

  if (isLoading && !summary) {
    return (
      <main className="flex flex-1 items-center justify-center px-4 py-16">
        <IconTile tone="ink" size="xl" className="animate-pulse">
          <Search />
        </IconTile>
        <span className="sr-only">Loading settings</span>
      </main>
    );
  }

  if (isError || !summary) {
    return (
      <main className="flex flex-1 items-center justify-center px-4 py-16">
        <div className="w-full max-w-md space-y-4 text-center">
          <IconTile tone="critical" size="xl" className="mx-auto">
            <AlertTriangle />
          </IconTile>
          <h1 className="font-display text-ink-900 text-2xl font-semibold">
            We couldn&apos;t load your settings
          </h1>
          <p className="text-ink-400 text-base leading-relaxed">
            {errorMessage ?? "Please try again in a moment."}
          </p>
          <Button onClick={refetch}>Try again</Button>
        </div>
      </main>
    );
  }

  const { user, subscription, usage, structural, periodEnd } = summary;

  return (
    <>
      <PageHeader section="Settings" current={user.email} />

      <main className="flex flex-1 flex-col gap-8 px-4 py-6 sm:px-6 lg:max-w-4xl lg:px-10">
        {/* Account */}
        <FadeIn className="space-y-3">
          <div className="eyebrow text-ink-300">Account</div>
          <Card variant="panel">
            <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="text-ink-900 truncate text-base font-medium">
                  {user.name ?? user.email}
                </div>
                {user.name ? (
                  <div className="text-ink-400 truncate text-sm">{user.email}</div>
                ) : null}
                <p className="text-ink-300 mt-1 text-xs">
                  Signed in with Google or an email link — there&apos;s no password to change.
                </p>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={signOut}
                disabled={isSigningOut}
                className="shrink-0"
              >
                {isSigningOut ? "Signing out…" : "Sign out"}
              </Button>
            </CardContent>
          </Card>
        </FadeIn>

        {/* Plan */}
        <FadeIn delay={0.05} className="space-y-3">
          <div className="eyebrow text-ink-300">Plan</div>

          {subscription ? (
            <Card variant="panel">
              <CardContent className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-display text-ink-900 text-xl font-semibold">
                        {subscription.planName}
                      </span>
                      <Badge tone={subscription.isActive ? "success" : "critical"}>
                        {subscription.isActive ? "Active" : subscription.status}
                      </Badge>
                    </div>
                    <p className="text-ink-400 mt-1 text-sm">
                      {formatPrice(
                        subscription.interval === "YEARLY"
                          ? PLANS[subscription.plan].yearlyUsd
                          : PLANS[subscription.plan].monthlyUsd,
                      )}{" "}
                      {subscription.interval === "YEARLY" ? "a year" : "a month"}
                      {subscription.currentPeriodEnd
                        ? ` · ${subscription.cancelAtPeriodEnd ? "ends" : "renews"} ${formatDate(subscription.currentPeriodEnd)}`
                        : null}
                    </p>
                  </div>

                  {subscription.hasPortal ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={portal.openPortal}
                      disabled={portal.isRedirecting}
                    >
                      {portal.isRedirecting ? "Opening…" : "Manage billing"}
                      <ExternalLink />
                    </Button>
                  ) : null}
                </div>

                {subscription.cancelAtPeriodEnd ? (
                  <div className="border-caution-line bg-caution-surface text-caution rounded-lg border px-3.5 py-2.5 text-sm">
                    Your plan is set to end on {formatDate(subscription.currentPeriodEnd)}. You
                    keep full access until then, and your data stays put.
                  </div>
                ) : null}

                {portal.error ? (
                  <div className="border-critical/20 bg-critical/5 text-critical-strong rounded-lg border px-3.5 py-2.5 text-sm">
                    {portal.error}
                  </div>
                ) : null}
              </CardContent>
            </Card>
          ) : (
            <Card variant="opportunity">
              <CardContent className="space-y-2">
                <div className="text-ink-900 text-base font-medium">No plan yet</div>
                <p className="text-ink-500 text-sm leading-relaxed">
                  Audits are free and unlimited without one. A plan is what lets us track
                  keywords daily and generate content from the findings.
                </p>
              </CardContent>
            </Card>
          )}
        </FadeIn>

        {/* Usage */}
        {subscription ? (
          <FadeIn delay={0.1} className="space-y-3">
            <div className="flex items-baseline justify-between gap-4">
              <div className="eyebrow text-ink-300">Usage</div>
              <span className="text-ink-300 text-xs">Resets {formatDate(periodEnd)}</span>
            </div>

            <Card variant="panel">
              <CardContent className="space-y-5">
                {usage.map((line) => (
                  <UsageBar
                    key={line.metric}
                    label={line.label}
                    used={line.used}
                    limit={line.limit}
                  />
                ))}

                <div className="border-line space-y-5 border-t pt-5">
                  {structural.map((line) => (
                    <UsageBar
                      key={line.label}
                      label={line.label}
                      used={line.used}
                      limit={line.limit}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          </FadeIn>
        ) : null}

        {/* Change plan */}
        <FadeIn delay={0.15} className="space-y-3">
          <div className="eyebrow text-ink-300">
            {subscription ? "Change plan" : "Choose a plan"}
          </div>

          <IntervalToggle value={interval} onChange={setInterval} className="justify-start" />

          <div className="grid gap-3 sm:grid-cols-3">
            {PLAN_ORDER.map((planId) => {
              const plan = PLANS[planId];
              const isCurrent =
                subscription?.plan === planId && subscription.interval === interval;

              return (
                <Card
                  key={planId}
                  variant="default"
                  className={cn(isCurrent && "border-ink-900 ring-ink-900/5 ring-2")}
                >
                  <CardContent className="space-y-3">
                    <div>
                      <div className="text-ink-900 text-base font-semibold">{plan.name}</div>
                      <div className="text-ink-300 text-xs">{plan.tagline}</div>
                    </div>

                    <div className="flex items-baseline gap-1">
                      <span className="font-display text-ink-900 text-2xl font-semibold tabular-nums">
                        {formatPrice(
                          interval === "YEARLY" ? plan.yearlyUsd : plan.monthlyUsd,
                        )}
                      </span>
                      <span className="text-ink-300 text-xs">
                        {interval === "YEARLY" ? "/yr" : "/mo"}
                      </span>
                    </div>

                    <Button
                      size="block"
                      variant={isCurrent ? "outline" : "default"}
                      disabled={isCurrent || checkout.isRedirecting}
                      onClick={() =>
                        checkout.startCheckout({
                          plan: planId as PlanId,
                          interval,
                          returnPath: "/dashboard/settings",
                          cancelPath: "/dashboard/settings",
                        })
                      }
                    >
                      {isCurrent
                        ? "Current plan"
                        : checkout.isRedirecting
                          ? "Opening…"
                          : subscription
                            ? "Switch"
                            : "Choose"}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {checkout.error ? (
            <div className="border-critical/20 bg-critical/5 text-critical-strong rounded-lg border px-3.5 py-2.5 text-sm">
              {checkout.error}
            </div>
          ) : null}

          <p className="text-ink-300 text-xs leading-relaxed">
            Switching takes effect immediately and is prorated by our payment provider.
            Downgrading below what you currently track won&apos;t delete anything — you&apos;ll
            just be over the limit until you free up room.
          </p>
        </FadeIn>
      </main>
    </>
  );
}

/**
 * `limit` arrives as null for unlimited: Infinity isn't representable in JSON,
 * so `JSON.stringify` turns it into null on the way out of the API.
 */
function UsageBar({
  label,
  used,
  limit,
}: {
  label: string;
  used: number;
  limit: number | null;
}) {
  const isUnlimited = limit === null || !Number.isFinite(limit);
  const pct = isUnlimited ? 0 : Math.min(100, (used / Math.max(1, limit)) * 100);
  const isNearLimit = !isUnlimited && pct >= 80;

  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-ink-700 text-sm font-medium">{label}</span>
        <span className="text-ink-400 text-sm tabular-nums">
          {used.toLocaleString("en-US")}
          {isUnlimited ? (
            <span className="text-ink-300"> · unlimited</span>
          ) : (
            <span className="text-ink-300"> / {limit.toLocaleString("en-US")}</span>
          )}
        </span>
      </div>

      {!isUnlimited ? (
        <div className="bg-surface-sunken h-1.5 overflow-hidden rounded-full">
          <div
            className={cn("h-full rounded-full", isNearLimit ? "bg-opportunity" : "bg-ink-900")}
            style={{ width: `${pct}%` }}
          />
        </div>
      ) : null}
    </div>
  );
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
