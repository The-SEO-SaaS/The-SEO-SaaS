"use client";

import { Button } from "@theseosaas/ui/components/button";
import { IconTile } from "@theseosaas/ui/components/icon-tile";
import { AnimatePresence, motion } from "@theseosaas/ui/components/motion";
import { cn } from "@theseosaas/ui/lib/utils";
import {
  BarChart3,
  FileSearch,
  KeyRound,
  LayoutDashboard,
  Menu,
  PenLine,
  Search,
  Settings,
  X,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import * as React from "react";

/**
 * App shell navigation.
 *
 * Order mirrors the core loop — Audit → Opportunities → Generate → Track — so
 * the sidebar itself teaches the workflow. Strategist lands here in v0.2,
 * between Content and Settings.
 *
 * The design is desktop-only, so the mobile treatment is an addition: below
 * `lg` this becomes a slide-over drawer behind a top bar. A 232px fixed column
 * would consume more than half a phone viewport.
 */
interface NavItem {
  /** Appended to /dashboard/[projectId]; empty string is the dashboard itself. */
  segment: string;
  label: string;
  icon: LucideIcon;
  /** Account-level rather than per-site, so it sits outside the site scope. */
  global?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { segment: "", label: "Dashboard", icon: LayoutDashboard },
  { segment: "audits", label: "Audits", icon: FileSearch },
  { segment: "keywords", label: "Keywords", icon: KeyRound },
  { segment: "competitors", label: "Competitors", icon: BarChart3 },
  { segment: "content", label: "Content", icon: PenLine },
  { segment: "settings", label: "Settings", icon: Settings, global: true },
];

/**
 * Every section except Settings belongs to a specific site, so nav hrefs are
 * built from the projectId in the current path rather than being static.
 * Reading it here keeps the layout component from having to thread it down.
 */
const RESERVED_SEGMENTS = new Set(["sites", "settings"]);

function useProjectId(): string | null {
  const pathname = usePathname();
  const match = pathname.match(/^\/dashboard\/([^/]+)/);
  const candidate = match?.[1] ?? null;

  // /dashboard/sites/new and /dashboard/settings are routes, not project ids.
  return candidate && RESERVED_SEGMENTS.has(candidate) ? null : candidate;
}

function Brand({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <Link
      href="/dashboard"
      onClick={onNavigate}
      className="flex items-center gap-2.5 px-2 no-underline hover:no-underline"
    >
      <IconTile tone="ink" size="md">
        <Search />
      </IconTile>
      <span className="font-display text-ink-900 text-md font-semibold tracking-tight">
        TheSEOSaaS
      </span>
    </Link>
  );
}

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const projectId = useProjectId();

  return (
    <nav className="flex flex-1 flex-col gap-0.5">
      {NAV_ITEMS.map((item) => {
        const href = item.global
          ? `/dashboard/${item.segment}`
          : projectId
            ? `/dashboard/${projectId}${item.segment ? `/${item.segment}` : ""}`
            : "/dashboard";

        // startsWith so /content/[id] keeps Content highlighted — except for
        // the dashboard itself, whose href is a prefix of every sibling.
        const isActive =
          item.segment === ""
            ? pathname === href
            : pathname === href || pathname.startsWith(`${href}/`);

        // Without a site there's nothing for a per-site link to point at, so
        // it renders inert rather than silently bouncing back to /dashboard.
        const isDisabled = !item.global && !projectId && item.segment !== "";

        if (isDisabled) {
          return (
            <span
              key={item.segment}
              aria-disabled
              className="text-ink-300 flex cursor-not-allowed items-center gap-2.5 rounded-lg px-2.5 py-2 text-base font-medium"
            >
              <item.icon className="size-4 shrink-0" />
              {item.label}
            </span>
          );
        }

        return (
          <Link
            key={item.segment}
            href={href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-base font-medium no-underline transition-colors hover:no-underline",
              isActive
                ? "bg-sidebar-accent text-ink-900"
                : "text-ink-400 hover:bg-sidebar-accent hover:text-ink-700",
            )}
          >
            <item.icon className="size-4 shrink-0" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

/** Desktop rail. Hidden below lg, where the drawer takes over. */
export function AppSidebar({ className }: { className?: string }) {
  return (
    <aside
      className={cn(
        "bg-sidebar border-line hidden w-[232px] shrink-0 flex-col gap-6 border-r px-3 py-5 lg:flex",
        className,
      )}
    >
      <Brand />
      <NavLinks />
    </aside>
  );
}

/** Mobile top bar plus slide-over drawer. Hidden at lg and above. */
export function AppMobileNav() {
  const [open, setOpen] = React.useState(false);
  const pathname = usePathname();

  // Close on navigation — without this the drawer stays open over the new page.
  React.useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Lock scroll behind the drawer so the page doesn't move under it.
  React.useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  return (
    <>
      <div className="border-line bg-surface sticky top-0 z-30 flex items-center justify-between border-b px-4 py-3 lg:hidden">
        <Brand />
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => setOpen(true)}
          aria-label="Open navigation"
        >
          <Menu />
        </Button>
      </div>

      <AnimatePresence>
        {open ? (
          <>
            <motion.div
              className="fixed inset-0 z-40 bg-ink-900/30 lg:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setOpen(false)}
            />

            <motion.aside
              className="bg-sidebar fixed inset-y-0 left-0 z-50 flex w-[260px] max-w-[80vw] flex-col gap-6 px-3 py-5 lg:hidden"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="flex items-center justify-between">
                <Brand onNavigate={() => setOpen(false)} />
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setOpen(false)}
                  aria-label="Close navigation"
                >
                  <X />
                </Button>
              </div>

              <NavLinks onNavigate={() => setOpen(false)} />
            </motion.aside>
          </>
        ) : null}
      </AnimatePresence>
    </>
  );
}
