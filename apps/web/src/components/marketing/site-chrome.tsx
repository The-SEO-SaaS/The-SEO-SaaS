"use client";

import { BrandGlyph } from "@theseosaas/ui/components/brand-mark";
import { Button } from "@theseosaas/ui/components/button";
import { IconTile } from "@theseosaas/ui/components/icon-tile";
import { AnimatePresence, motion } from "@theseosaas/ui/components/motion";
import { cn } from "@theseosaas/ui/lib/utils";
import { ArrowUpRight, Check, Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import * as React from "react";

/**
 * Marketing header and footer.
 *
 * Measurements come straight from the design file, as literal values rather
 * than nearest-token approximations — the previous version used the design's
 * rough shape and drifted on every axis at once (a sticky bordered flex bar
 * instead of a borderless three-column grid, four nav items instead of five,
 * two CTAs instead of one, body font instead of Instrument Sans).
 *
 * The design's exact spec:
 *   header  grid minmax(0,1fr) auto minmax(0,1fr), gap 40, pad 21/40/23/40,
 *           white, no border, not sticky
 *   mark    28px tile, 8px radius, #0B1220, 14px glyph
 *   word    Instrument Sans 16.5px / 600 / -0.035em
 *   nav     centered, gap 29px, Instrument Sans 14px / 500 / -0.008em / #4A5462
 *           active: 600 / #0B1220
 *   cta     13.5px / 500 / -0.008em, 1px #E4E7ED border, 9px radius,
 *           8px 15px padding, shadow 0 1px 1.5px rgba(11,18,32,.05)
 *
 * Desktop is 1:1. The design has no mobile view, so below `md` the centred nav
 * collapses into a drawer — a five-item centre column cannot survive a 375px
 * viewport, and that is an addition rather than a deviation.
 */

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/#how-it-works", label: "How it works" },
  { href: "/#features", label: "Features" },
  { href: "/pricing", label: "Pricing" },
] as const;

/** Instrument Sans at the design's nav size, in both nav renderings. */
const NAV_LINK_BASE =
  "font-display text-[14px] tracking-[-0.008em] no-underline transition-colors hover:no-underline";

function useIsActive() {
  const pathname = usePathname();

  return (href: string) => {
    // Anchors belong to the landing page, so they're only "active" there — and
    // even then the hash isn't observable server-side, so they never win.
    if (href.startsWith("/#")) return false;
    return pathname === href;
  };
}

/**
 * Announcement bar.
 *
 * Sits above the header on every marketing page in the design, and was missing
 * from the implementation entirely. Spec: centred, gap 9px, 10px/40px padding,
 * #0B1220 fill, a 5px #94A3B8 dot, and 12.5px #D6DCE6 text.
 */
export function AnnouncementBar() {
  return (
    <div className="bg-ink-900 flex items-center justify-center gap-[9px] px-5 py-[7px] text-center sm:px-10">
      <span className="size-[5px] shrink-0 rounded-full bg-[#94A3B8]" />
      <span className="text-[12.5px] text-[#D6DCE6]">
        Early access — the full audit is free while we&apos;re in beta
      </span>
    </div>
  );
}

export function MarketingHeader() {
  const [open, setOpen] = React.useState(false);
  const isActive = useIsActive();

  return (
    <header className="bg-surface">
      <AnnouncementBar />
      {/*
        Vertical padding is down from the traced 21/23 to 13/14, and the
        announcement bar from 10 to 7. Together with the hero's own reduction
        that's ~40px reclaimed above the fold — the difference between the audit
        input being on the first screen of a 1366×768 laptop and being under it.
        Horizontal padding and the three-column grid are the design's.
      */}
      <div className="grid grid-cols-[auto_1fr] items-center gap-6 px-5 pt-[12px] pb-[13px] sm:px-8 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] md:gap-10 md:px-10 md:pt-[13px] md:pb-[14px]">
        <Link
          href="/"
          className="flex items-center gap-[9px] no-underline hover:no-underline"
        >
          <IconTile tone="ink" size="brand">
            <BrandGlyph />
          </IconTile>
          <span className="font-display text-ink-900 text-[16.5px] font-semibold tracking-[-0.035em]">
            TheSEOSaaS
          </span>
        </Link>

        <nav className="hidden items-center justify-center gap-[29px] md:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                NAV_LINK_BASE,
                isActive(link.href)
                  ? "text-ink-900 font-semibold"
                  : "text-[#4A5462] hover:text-ink-900 font-medium",
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center justify-end md:flex">
          <Link
            href="/login"
            className="font-display text-ink-900 rounded-[9px] border border-[#E4E7ED] bg-surface px-[15px] py-[8px] text-[13.5px] font-medium tracking-[-0.008em] no-underline shadow-[0_1px_1.5px_rgba(11,18,32,0.05)] transition-colors hover:bg-surface-sunken hover:no-underline"
          >
            Log in
          </Link>
        </div>

        <Button
          variant="ghost"
          size="icon-sm"
          className="justify-self-end md:hidden"
          onClick={() => setOpen((value) => !value)}
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
        >
          {open ? <X /> : <Menu />}
        </Button>
      </div>

      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            className="border-line overflow-hidden border-t md:hidden"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          >
            <nav className="flex flex-col gap-1 px-5 py-3">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    NAV_LINK_BASE,
                    "hover:bg-surface-sunken rounded-lg px-2 py-2",
                    isActive(link.href)
                      ? "text-ink-900 font-semibold"
                      : "text-[#4A5462] font-medium",
                  )}
                >
                  {link.label}
                </Link>
              ))}

              <Button
                variant="outline"
                size="block"
                className="mt-2"
                render={<Link href="/login" />}
                onClick={() => setOpen(false)}
              >
                Log in
              </Button>
            </nav>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </header>
  );
}

/**
 * Newsletter capture.
 *
 * This form used to be `onSubmit={(e) => e.preventDefault()}` and nothing
 * else — it took an address and dropped it. It now posts to /api/subscribe.
 *
 * The success state replaces the form rather than sitting beside it. A cleared
 * input under a confirmation message is the classic way to make someone submit
 * twice, because the field looking empty reads as "that didn't work".
 *
 * Errors are shown but stay quiet in tone. The worst realistic outcome here is
 * a missed newsletter signup, and a red alert over it would be out of
 * proportion to what just happened.
 */
function SubscribeForm() {
  const [email, setEmail] = React.useState("");
  const [state, setState] = React.useState<"idle" | "saving" | "done" | "error">("idle");

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const value = email.trim();
    if (!value || state === "saving") return;

    setState("saving");
    try {
      const response = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: value, source: "footer" }),
      });

      if (!response.ok) throw new Error("Subscribe failed");
      setState("done");
      setEmail("");
    } catch {
      setState("error");
    }
  };

  if (state === "done") {
    return (
      <p className="mt-3 flex max-w-[340px] items-center gap-2 text-[13px] text-[#D6DCE6]">
        <Check className="size-[14px] shrink-0 text-[#4ADE80]" strokeWidth={2.4} />
        You&apos;re on the list. Nothing until there&apos;s something worth sending.
      </p>
    );
  }

  return (
    <form className="mt-3 max-w-[340px]" onSubmit={handleSubmit}>
      <div className="flex items-center gap-2.5">
        <input
          type="email"
          required
          value={email}
          onChange={(event) => {
            setEmail(event.target.value);
            if (state === "error") setState("idle");
          }}
          placeholder="Your email address"
          aria-label="Your email address"
          autoComplete="email"
          className="min-w-0 flex-1 rounded-[10px] border border-[#2A3446] bg-transparent px-4 py-[11px] text-[13px] text-white outline-none transition-colors placeholder:text-[#7C8798] focus-visible:border-[#4A5462]"
        />
        <button
          type="submit"
          disabled={!email.trim() || state === "saving"}
          aria-label="Subscribe"
          className="text-ink-900 flex size-10 shrink-0 items-center justify-center rounded-[10px] bg-white transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          <ArrowUpRight className="size-[13px]" strokeWidth={1.9} />
        </button>
      </div>

      {state === "error" ? (
        <p className="mt-2 text-[12px] text-[#9AA6B8]">
          That didn&apos;t save. Try again, or email us instead.
        </p>
      ) : null}
    </form>
  );
}

const FOOTER_COLUMNS = [
  {
    title: "PRODUCT",
    links: [
      { href: "/#how-it-works", label: "How it works" },
      { href: "/#features", label: "Features" },
      { href: "/pricing", label: "Pricing" },
      { href: "/blog", label: "Blog" },
    ],
  },
  {
    title: "COMPANY",
    links: [
      { href: "/about", label: "About" },
      { href: "/contact", label: "Contact" },
      { href: "/terms", label: "Terms" },
      { href: "/privacy", label: "Privacy" },
    ],
  },
  {
    title: "RESOURCES",
    links: [
      { href: "/blog", label: "Field notes" },
      { href: "/#pricing", label: "Plans" },
      { href: "/status", label: "Status" },
    ],
  },
] as const;

const LEGAL_LINKS = [
  { href: "/terms", label: "Terms" },
  { href: "/privacy", label: "Privacy" },
  { href: "/status", label: "Status" },
] as const;

/**
 * Footer — a dark inset card, not a light bordered strip.
 *
 * Design spec: 20px outer margin, #0B1220 fill, 16px radius, 40/40/32 padding,
 * two columns (1fr / 420px) split by a 1px #1E2635 rule, a 25px Instrument Sans
 * statement, newsletter capture, then a legal row above a matching rule.
 *
 * Stacks to one column below `lg`, where a 420px fixed second column would
 * overflow. The dark card and every type size stay as specified.
 */
export function MarketingFooter() {
  return (
    <footer className="px-5 pb-5 sm:px-5">
      <div className="bg-ink-900 rounded-2xl px-6 pt-8 pb-7 text-white sm:px-10 sm:pt-10 sm:pb-8">
        <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_420px] lg:gap-14">
          <div>
            <div className="flex items-center gap-[9px]">
              {/* A rotated square, not the header's magnifier tile. */}
              <span className="size-[8px] rotate-45 rounded-[2px] bg-white" />
              <span className="text-[14.5px] font-semibold tracking-[-0.015em]">
                TheSEOSaaS
              </span>
            </div>

            <p className="font-display mt-5 max-w-[26ch] text-[22px] font-semibold leading-[1.34] tracking-[-0.028em] text-[#F4F6FA] sm:text-[25px]">
              The audit tells you what to do. The tool does it with you.
            </p>

            <p className="mt-6 text-[12.5px] text-[#9AA6B8]">
              Monthly field notes from a few thousand crawls
            </p>

            <SubscribeForm />
          </div>

          <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:border-l lg:border-[#1E2635] lg:pl-10">
            {FOOTER_COLUMNS.map((column) => (
              <div key={column.title}>
                <div className="text-[11px] font-semibold tracking-[0.1em] text-[#7C8798]">
                  {column.title}
                </div>
                <div className="mt-3.5 flex flex-col gap-[11px]">
                  {column.links.map((link) => (
                    <Link
                      key={`${column.title}-${link.href}-${link.label}`}
                      href={link.href}
                      className="text-[13px] text-[#D6DCE6] no-underline transition-colors hover:text-white hover:no-underline"
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-9 flex flex-col gap-3 border-t border-[#1E2635] pt-5 sm:flex-row sm:items-center sm:justify-between sm:gap-5">
          <span className="text-[12px] text-[#7C8798]">
            © {new Date().getFullYear()} The SEO SaaS
          </span>
          <div className="flex gap-5">
            {LEGAL_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-[12px] text-[#9AA6B8] no-underline transition-colors hover:text-white hover:no-underline"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
