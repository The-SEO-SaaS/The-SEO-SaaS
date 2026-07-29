"use client";

import { Button } from "@theseosaas/ui/components/button";
import { IconTile } from "@theseosaas/ui/components/icon-tile";
import { Search } from "lucide-react";
import Link from "next/link";

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
  return (
    <header className="border-line bg-surface/90 sticky top-0 z-20 border-b backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-6 py-3.5">
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

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" render={<Link href="/login" />}>
            Log in
          </Button>
          <Button size="sm" render={<Link href="#hero" />}>
            Run free audit
          </Button>
        </div>
      </div>
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
      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-14 md:grid-cols-[2fr_1fr_1fr]">
        <div className="space-y-3">
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

      <div className="border-line mx-auto max-w-6xl border-t px-6 py-5">
        <p className="text-ink-300 text-xs">
          © {new Date().getFullYear()} TheSEOSaaS. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
