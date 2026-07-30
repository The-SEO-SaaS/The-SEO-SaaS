"use client";

import {
  PLANS,
  PLAN_ORDER,
  effectiveMonthlyFor,
  featuresFor,
  formatPrice,
  recommendPlan,
  type BillingInterval,
  type PlanId,
} from "@theseosaas/core/plans";
import { Stagger, StaggerItem } from "@theseosaas/ui/components/motion";
import { cn } from "@theseosaas/ui/lib/utils";
import { Check } from "lucide-react";

/**
 * The plan step body, built to the design's measurements: a self-start
 * interval toggle over a three-up card grid at 18px gaps, each card 24px
 * inset on a 16px radius.
 *
 * Prices, limits and bullets all come from `@theseosaas/core/plans`, the same
 * module that enforces the quota — so this screen cannot promise a limit the
 * backend won't honour.
 *
 * The recommendation is derived from what the audit actually found rather than
 * always pushing the middle tier. A founder with four competitors and twelve
 * keyword gaps is told why Growth fits *their* numbers, which is more
 * persuasive — and more honest — than a generic "most popular" badge.
 *
 * Both intervals price per month, per the design: an annual plan shows its
 * effective monthly rate, not a year's total, so the three cards stay
 * comparable when someone flips the toggle.
 *
 * Responsive: the design is desktop-only. Cards go one-up on phones and
 * two-up on tablets before reaching three.
 */
export function PlanStep({
  competitorCount,
  keywordCount,
  selected,
  onSelect,
  interval,
  onIntervalChange,
}: {
  competitorCount: number;
  keywordCount: number;
  selected: PlanId | null;
  onSelect: (plan: PlanId) => void;
  interval: BillingInterval;
  onIntervalChange: (interval: BillingInterval) => void;
}) {
  const recommended = recommendPlan({
    competitors: competitorCount,
    keywordOpportunities: keywordCount,
  });

  return (
    <div>
      <IntervalToggle value={interval} onChange={onIntervalChange} />

      <Stagger
        className="mt-[22px] grid items-start gap-[18px] sm:grid-cols-2 lg:grid-cols-3"
        whenInView={false}
      >
        {PLAN_ORDER.map((planId) => (
          <StaggerItem key={planId} className="h-full">
            <PlanCard
              planId={planId}
              interval={interval}
              isSelected={selected === planId}
              isRecommended={planId === recommended}
              onSelect={() => onSelect(planId)}
            />
          </StaggerItem>
        ))}
      </Stagger>
    </div>
  );
}

/** #F1F3F7 track, 3px inset, white active pill — the design's segmented control. */
function IntervalToggle({
  value,
  onChange,
}: {
  value: BillingInterval;
  onChange: (interval: BillingInterval) => void;
}) {
  return (
    <div className="inline-flex items-center gap-0.5 self-start rounded-[10px] bg-[#F1F3F7] p-[3px]">
      <button
        type="button"
        onClick={() => onChange("MONTHLY")}
        className={cn(
          "rounded-lg px-3.5 py-1.5 text-[12.5px]",
          value === "MONTHLY"
            ? "bg-white font-medium text-[#0B1220] shadow-[0_1px_2px_rgba(11,18,32,0.06)]"
            : "text-[#6B7480]",
        )}
      >
        Monthly
      </button>

      <button
        type="button"
        onClick={() => onChange("YEARLY")}
        className={cn(
          "inline-flex items-center gap-[7px] rounded-lg px-3.5 py-1.5 text-[12.5px]",
          value === "YEARLY"
            ? "bg-white font-medium text-[#0B1220] shadow-[0_1px_2px_rgba(11,18,32,0.06)]"
            : "text-[#6B7480]",
        )}
      >
        Annual
        <span className="rounded-full border border-[#C6EBD1] bg-[#F0FDF4] px-[7px] py-px text-[10.5px] font-semibold text-[#15803D]">
          2 months free
        </span>
      </button>
    </div>
  );
}

function PlanCard({
  planId,
  interval,
  isSelected,
  isRecommended,
  onSelect,
}: {
  planId: PlanId;
  interval: BillingInterval;
  isSelected: boolean;
  isRecommended: boolean;
  onSelect: () => void;
}) {
  const plan = PLANS[planId];
  const monthly = effectiveMonthlyFor(planId, interval);

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={isSelected}
      className={cn(
        "flex h-full w-full flex-col rounded-2xl border bg-white p-6 text-left transition-colors",
        isSelected
          ? "border-[#0B1220] shadow-[0_1px_2px_rgba(11,18,32,0.04)] ring-2 ring-[#0B1220]/5"
          : isRecommended
            ? "border-[#C6CDD8] shadow-[0_1px_2px_rgba(11,18,32,0.04)]"
            : "border-[#E2E6EC] hover:border-[#C6CDD8]",
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-[15px] font-semibold tracking-[-0.01em] text-[#0B1220]">
          {plan.name}
        </span>
        {isRecommended ? (
          <span className="rounded-full bg-[#0B1220] px-[9px] py-[3px] text-[10.5px] font-semibold tracking-[0.08em] text-white">
            RECOMMENDED
          </span>
        ) : null}
      </div>

      <div className="mt-[5px] text-[12.5px] text-[#6B7480]">{plan.tagline}</div>

      <div className="mt-[18px] flex items-baseline gap-1.5">
        <span className="font-display text-[32px] leading-none font-semibold tracking-[-0.032em] text-[#0B1220]">
          {formatPrice(monthly)}
        </span>
        <span className="text-[12.5px] text-[#6B7480]">/month</span>
      </div>

      {/* The design's CTA is a block inside the card. It's presentational —
          the whole card is the button — so it carries no separate handler. */}
      <div
        className={cn(
          "mt-5 rounded-[10px] border px-4 py-[11px] text-center text-[13.5px] font-medium",
          isSelected
            ? "border-[#0B1220] bg-[#0B1220] text-white"
            : "border-[#DFE3EA] bg-white text-[#3F4854]",
        )}
      >
        {isSelected ? "Selected" : `Choose ${plan.name}`}
      </div>

      <div className="mt-[22px] flex flex-col gap-2.5 border-t border-[#EDEFF3] pt-[18px]">
        {featuresFor(planId).map((feature) => (
          <div key={feature} className="grid grid-cols-[16px_minmax(0,1fr)] gap-2.5">
            <span
              className={cn(
                "mt-0.5 flex size-[15px] items-center justify-center rounded-full",
                isSelected || isRecommended ? "bg-[#0B1220]" : "bg-[#C6CDD8]",
              )}
            >
              <Check className="size-2 text-white" strokeWidth={3} />
            </span>
            <span className="text-[13px] leading-[1.5] text-[#28303C]">{feature}</span>
          </div>
        ))}
      </div>
    </button>
  );
}
