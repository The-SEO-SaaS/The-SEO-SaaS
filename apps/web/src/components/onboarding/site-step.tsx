"use client";

import { Badge } from "@theseosaas/ui/components/badge";
import { Stagger, StaggerItem } from "@theseosaas/ui/components/motion";
import { cn } from "@theseosaas/ui/lib/utils";
import { CheckCircle2 } from "lucide-react";
import * as React from "react";

import type { OnboardingState, SitePlatform, SiteType } from "@/lib/api";

/**
 * Step 1 — confirm the site.
 *
 * The domain arrives pre-filled and verified from the audit, so this is a
 * confirmation rather than an entry form. Site type is the one thing the crawl
 * can't reliably infer and that materially changes generated content: a SaaS
 * feature page and an ecommerce collection page are different briefs.
 */

const SITE_TYPES: { value: SiteType; label: string; hint: string }[] = [
  { value: "SAAS", label: "SaaS", hint: "Features, pricing, docs" },
  { value: "ECOMMERCE", label: "Ecommerce", hint: "Products, collections, reviews" },
  { value: "CONTENT", label: "Content", hint: "Blog, media, newsletter" },
  { value: "LOCAL", label: "Local", hint: "Storefront, service area" },
];

const PLATFORMS: { value: SitePlatform; label: string }[] = [
  { value: "NEXTJS", label: "Next.js" },
  { value: "WORDPRESS", label: "WordPress" },
  { value: "SHOPIFY", label: "Shopify" },
  { value: "WEBFLOW", label: "Webflow" },
  { value: "OTHER", label: "Something else" },
];

export interface SiteStepValue {
  domain: string;
  siteType: SiteType | null;
  platform: SitePlatform | null;
}

export function SiteStep({
  state,
  value,
  onChange,
}: {
  state: OnboardingState;
  value: SiteStepValue;
  onChange: (next: SiteStepValue) => void;
}) {
  return (
    <div className="space-y-8">
      <section className="space-y-2.5">
        <label htmlFor="domain" className="text-ink-700 block text-base font-medium">
          Domain
        </label>

        <div className="bg-surface border-line focus-within:border-ink-900 focus-within:ring-ring/10 flex items-center gap-1.5 rounded-lg border px-3 py-2.5 transition-colors focus-within:ring-2">
          <span className="text-ink-300 shrink-0 text-base">https://</span>
          <input
            id="domain"
            value={value.domain}
            onChange={(event) => onChange({ ...value, domain: event.target.value })}
            className="text-ink-900 min-w-0 flex-1 bg-transparent text-base outline-none"
            spellCheck={false}
            inputMode="url"
          />
        </div>

        {state.project?.pagesCrawled ? (
          <div className="text-success-strong flex items-center gap-1.5 text-sm">
            <CheckCircle2 className="size-3.5 shrink-0" />
            Verified · {state.project.pagesCrawled} pages crawled
          </div>
        ) : null}
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-ink-700 text-base font-medium">What kind of site is it?</h2>
          <p className="text-ink-400 text-sm">
            This shapes the structure of the pages we generate for you.
          </p>
        </div>

        <Stagger className="grid gap-2.5 sm:grid-cols-2" whenInView={false}>
          {SITE_TYPES.map((type) => (
            <StaggerItem key={type.value}>
              <OptionCard
                selected={value.siteType === type.value}
                onSelect={() => onChange({ ...value, siteType: type.value })}
                label={type.label}
                hint={type.hint}
              />
            </StaggerItem>
          ))}
        </Stagger>
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-ink-700 text-base font-medium">Where is it published?</h2>
          <p className="text-ink-400 text-sm">
            Optional. This only affects export hints on drafts — markdown works everywhere.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {PLATFORMS.map((platform) => (
            <button
              key={platform.value}
              type="button"
              onClick={() =>
                onChange({
                  ...value,
                  // Tapping the selected chip clears it, since this is optional.
                  platform: value.platform === platform.value ? null : platform.value,
                })
              }
              aria-pressed={value.platform === platform.value}
              className={cn(
                "rounded-full border px-3.5 py-1.5 text-sm-plus font-medium transition-colors",
                value.platform === platform.value
                  ? "border-ink-900 bg-ink-900 text-white"
                  : "border-line text-ink-500 hover:border-line-strong",
              )}
            >
              {platform.label}
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

function OptionCard({
  selected,
  onSelect,
  label,
  hint,
}: {
  selected: boolean;
  onSelect: () => void;
  label: string;
  hint: string;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        "flex w-full items-start justify-between gap-3 rounded-xl border px-4 py-3 text-left transition-colors",
        selected
          ? "border-ink-900 ring-ink-900/5 bg-surface ring-2"
          : "border-line bg-surface hover:border-line-strong",
      )}
    >
      <span className="min-w-0">
        <span className="text-ink-900 block text-base font-medium">{label}</span>
        <span className="text-ink-400 block text-sm">{hint}</span>
      </span>

      {selected ? <Badge tone="ink">Selected</Badge> : null}
    </button>
  );
}
