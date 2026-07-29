"use client";

import { Button } from "@theseosaas/ui/components/button";
import { IconTile } from "@theseosaas/ui/components/icon-tile";
import { AnimatePresence, motion } from "@theseosaas/ui/components/motion";
import { Menu, Search, X } from "lucide-react";
import Link from "next/link";
import * as React from "react";

/**
 * Marketing header and footer.
 *
 * Separate from the app shell on purpose — a signed-out visitor and a
 * signed-in user need different navigation, and one component branching on
 * auth state would serve neither well.
 */

const NAV_LINKS = [
  { href: "#how-it-works", label: "How it works" },
  { href: "#features", label: "Features" },
  { href: "#pricing", label: "Pricing" },
  { href: "/blog", label: "Blog" },
];

export function MarketingHeader() {
  const [open, setOpen] = React.useState(false);

  return (
    <header className="border-line bg-surface/90 sticky top-0 z-20 border-b backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6 sm:py-3.5">
        <Link href="/" className="flex items-center gap-2.5 no-underline hover:no-underline">
          <IconTile tone="ink" size="md">
            <Search />
          </IconTile>
          <span className="font-display text-ink-900 text-md font-semibold tracking-tight">
            TheSEOSaaS
          </span>
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-ink-400 hover:text-ink-900 text-base font-medium no-underline hover:no-underline"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 sm:flex">
          <Button variant="ghost" size="sm" render={<Link href="/login" />}>
            Log in
          </Button>
          <Button size="sm" render={<Link href="#hero" />}>
            Run free audit
          </Button>
        </div>

        {/* Below sm the two buttons plus nav won't fit — collapse to a menu. */}
        <Button
          variant="ghost"
          size="icon-sm"
          className="sm:hidden"
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
            className="border-line overflow-hidden border-t sm:hidden"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          >
            <nav className="flex flex-col gap-1 px-4 py-3">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="text-ink-500 hover:bg-surface-sunken rounded-lg px-2 py-2 text-base font-medium no-underline hover:no-underline"
                >
                  {link.label}
                </Link>
              ))}

              <div className="mt-2 flex flex-col gap-2">
                <Button variant="outline" size="block" render={<Link href="/login" />}>
                  Log in
                </Button>
                <Button
                  size="block"
                  render={<Link href="#hero" />}
                  onClick={() => setOpen(false)}
                >
                  Run free audit
                </Button>
              </div>
            </nav>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </header>
  );
}

const FOOTER_COLUMNS = [
  {
    title: "Product",
    links: [
      { href: "#how-it-works", label: "How it works" },
      { href: "#features", label: "Features" },
      { href: "#pricing", label: "Pricing" },
    ],
  },
  {
    title: "Company",
    links: [
      { href: "/blog", label: "Blog" },
      { href: "/terms", label: "Terms" },
      { href: "/privacy", label: "Privacy" },
    ],
  },
];

export function MarketingFooter() {
  return (
    <footer className="border-line bg-surface-subtle border-t">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:grid-cols-2 sm:px-6 sm:gap-10 sm:py-14 md:grid-cols-[2fr_1fr_1fr]">
        <div className="space-y-3 sm:col-span-2 md:col-span-1">
          <div className="flex items-center gap-2.5">
            <IconTile tone="ink" size="md">
              <Search />
            </IconTile>
            <span className="font-display text-ink-900 text-md font-semibold tracking-tight">
              TheSEOSaaS
            </span>
          </div>
          <p className="text-ink-400 max-w-xs text-sm leading-relaxed">
            The audit tells you what to do. The tool does it with you.
          </p>
        </div>

        {FOOTER_COLUMNS.map((column) => (
          <div key={column.title} className="space-y-3">
            <div className="eyebrow text-ink-300">{column.title}</div>
            <ul className="space-y-2">
              {column.links.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-ink-400 hover:text-ink-900 text-sm no-underline hover:no-underline"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="border-line mx-auto max-w-6xl border-t px-4 py-5 sm:px-6">
        <p className="text-ink-300 text-xs">
          © {new Date().getFullYear()} TheSEOSaaS. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
