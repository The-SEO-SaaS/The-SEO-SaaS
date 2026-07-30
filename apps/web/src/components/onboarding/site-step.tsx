"use client";

import { Stagger, StaggerItem } from "@theseosaas/ui/components/motion";
import { cn } from "@theseosaas/ui/lib/utils";
import {
  Check,
  CheckCircle2,
  FileText,
  LayoutGrid,
  MapPin,
  ShoppingBag,
  type LucideIcon,
} from "lucide-react";

import type { OnboardingState, SitePlatform, SiteType } from "@/lib/api";

/**
 * Step 1 — confirm the site.
 *
 * The domain arrives pre-filled and verified from the audit, so this is a
 * confirmation rather than an entry form. Site type is the one thing the crawl
 * can't reliably infer and that materially changes generated content: a SaaS
 * feature page and an ecommerce collection page are different briefs.
 */

const SITE_TYPES: {
  value: SiteType;
  label: string;
  hint: string;
  icon: LucideIcon;
}[] = [
  { value: "ECOMMERCE", label: "Ecommerce", hint: "Products, collections, reviews", icon: ShoppingBag },
  { value: "SAAS", label: "SaaS", hint: "Features, pricing, docs", icon: LayoutGrid },
  { value: "CONTENT", label: "Content", hint: "Blog, media, newsletter", icon: FileText },
  { value: "LOCAL", label: "Local", hint: "Storefront, service area", icon: MapPin },
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

        {/*
          The verified chip sits inside the field, as in the design — beside
          the value it's vouching for rather than as a line underneath it.
        */}
        <div className="bg-surface border-line focus-within:border-ink-900 focus-within:ring-ring/10 flex items-center gap-1.5 rounded-lg border px-3 py-2.5 transition-colors focus-within:ring-2">
          <span className="shrink-0 text-[13.5px] text-[#9AA2AE]">https://</span>
          <input
            id="domain"
            value={value.domain}
            onChange={(event) => onChange({ ...value, domain: event.target.value })}
            className="text-ink-900 min-w-0 flex-1 bg-transparent text-[14.5px] outline-none"
            spellCheck={false}
            inputMode="url"
          />

          {state.project?.pagesCrawled ? (
            <span className="border-success-line bg-success-surface text-success-strong inline-flex shrink-0 items-center gap-1.5 rounded-md border px-2 py-1 text-[11.5px] font-medium">
              <CheckCircle2 className="size-3 shrink-0" />
              Verified · {state.project.pagesCrawled} pages
            </span>
          ) : null}
        </div>
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-ink-700 text-base font-medium">What kind of site is it?</h2>
          <p className="text-ink-400 text-sm">
            This shapes the structure of the pages we generate for you.
          </p>
        </div>

        <Stagger className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4" whenInView={false}>
          {SITE_TYPES.map((type) => (
            <StaggerItem key={type.value} className="h-full">
              <OptionCard
                selected={value.siteType === type.value}
                onSelect={() => onChange({ ...value, siteType: type.value })}
                label={type.label}
                hint={type.hint}
                icon={type.icon}
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
                  ? "border-ink-900 text-ink-900 font-semibold"
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

/**
 * Selection is marked by a filled check disc in the corner, per the design —
 * not a "Selected" badge, which competes with the label for attention.
 */
function OptionCard({
  selected,
  onSelect,
  label,
  hint,
  icon: Icon,
}: {
  selected: boolean;
  onSelect: () => void;
  label: string;
  hint: string;
  icon: LucideIcon;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        "relative flex h-full w-full flex-col items-start gap-2.5 rounded-xl border p-4 text-left transition-colors",
        selected
          ? "border-ink-900 ring-ink-900/5 bg-surface ring-2"
          : "border-line bg-surface hover:border-line-strong",
      )}
    >
      <Icon
        className={cn("size-[18px]", selected ? "text-ink-900" : "text-[#9AA2AE]")}
        strokeWidth={1.7}
      />

      <span className="min-w-0">
        <span className="text-ink-900 block text-[14px] font-semibold tracking-[-0.01em]">
          {label}
        </span>
        <span className="mt-0.5 block text-[12px] leading-[1.5] text-[#6B7480]">{hint}</span>
      </span>

      {selected ? (
        <span className="bg-ink-900 absolute top-3 right-3 inline-flex size-[18px] items-center justify-center rounded-full text-white">
          <Check className="size-2.5" strokeWidth={3} />
        </span>
      ) : null}
    </button>
  );
}
