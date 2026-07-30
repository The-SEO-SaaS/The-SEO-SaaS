"use client";

import { Button } from "@theseosaas/ui/components/button";
import { AnimatePresence, motion } from "@theseosaas/ui/components/motion";
import { cn } from "@theseosaas/ui/lib/utils";
import {
  FileSearch,
  LayoutGrid,
  Menu,
  PenLine,
  Search,
  Settings,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import * as React from "react";

import { useSites } from "@/hooks/use-sites";
import { useSession } from "@/hooks/use-session";

/**
 * App shell navigation, matched to the design.
 *
 * Spec: 224px fixed column, #FAFAFB fill, 1px #EDEFF3 right rule, 26px/18px/22px
 * padding. Brand is a rotated 8px square — not the marketing header's magnifier
 * tile — beside a 14.5px / 600 / -0.015em wordmark. A "WORKSPACE" label at
 * 10.5px / 600 / 0.1em sits above the nav.
 *
 * Nav rows are 13.5px at 7px/8px padding with a 6px radius. The active row is
 * white with an inset 1px #E6E9EF ring rather than a tinted fill, which is what
 * makes it read as raised off the sidebar. Keywords and Competitors carry a
 * right-aligned count, the competitor one in #EA580C.
 *
 * The footer pins Settings above a user block: 26px initials avatar, 12.5px
 * name, 11px domain.
 *
 * Below `lg` the whole thing becomes a slide-over drawer — a 224px fixed column
 * would take more than half a phone viewport.
 */
interface NavItem {
  /** Appended to /dashboard/[projectId]; empty string is the dashboard itself. */
  segment: string;
  label: string;
  icon: LucideIcon;
  /** Which count to show, when the site has one. */
  count?: "keywords" | "competitors";
  /** Account-level rather than per-site, so it sits outside the site scope. */
  global?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { segment: "", label: "Dashboard", icon: LayoutGrid },
  { segment: "audits", label: "Audits", icon: FileSearch },
  { segment: "keywords", label: "Keywords", icon: Search, count: "keywords" },
  { segment: "competitors", label: "Competitors", icon: Users, count: "competitors" },
  { segment: "content", label: "Content", icon: PenLine },
];

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
      className="flex items-center gap-[9px] px-1.5 no-underline hover:no-underline"
    >
      <span className="bg-ink-900 size-2 rotate-45 rounded-[2px]" />
      <span className="text-ink-900 text-[14.5px] font-semibold tracking-[-0.015em]">
        TheSEOSaaS
      </span>
    </Link>
  );
}

function NavRow({
  href,
  label,
  icon: Icon,
  count,
  countTone,
  isActive,
  isDisabled,
  onNavigate,
}: {
  href: string;
  label: string;
  icon: LucideIcon;
  count?: number;
  countTone?: "muted" | "opportunity";
  isActive: boolean;
  isDisabled?: boolean;
  onNavigate?: () => void;
}) {
  const inner = (
    <>
      <span className="flex min-w-0 items-center gap-2.5">
        <Icon className="size-[15px] shrink-0" strokeWidth={1.5} />
        <span className="truncate">{label}</span>
      </span>
      {count !== undefined ? (
        <span
          className={cn(
            "shrink-0 text-[11.5px] font-normal",
            countTone === "opportunity" ? "text-[#EA580C]" : "text-[#6B7480]",
          )}
        >
          {count}
        </span>
      ) : null}
    </>
  );

  const base =
    "flex items-center justify-between gap-2.5 rounded-md px-2 py-[7px] text-[13.5px] no-underline transition-colors hover:no-underline";

  if (isDisabled) {
    return (
      <span
        aria-disabled
        className={cn(base, "text-ink-300 cursor-not-allowed font-normal")}
      >
        {inner}
      </span>
    );
  }

  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={cn(
        base,
        isActive
          ? "bg-surface text-ink-900 font-semibold shadow-[inset_0_0_0_1px_#E6E9EF]"
          : "font-normal text-[#6B7480] hover:bg-[#F1F3F7] hover:text-ink-900",
      )}
    >
      {inner}
    </Link>
  );
}

function SidebarBody({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const projectId = useProjectId();
  const { sites } = useSites();
  const { user } = useSession();

  const site = sites.find((entry) => entry.id === projectId) ?? null;

  const initials = (user?.name ?? user?.email ?? "?")
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

  const settingsHref = "/dashboard/settings";
  const settingsActive = pathname.startsWith(settingsHref);

  return (
    <>
      <div className="pb-[30px]">
        <Brand onNavigate={onNavigate} />
      </div>

      <div className="px-1.5 pb-2.5 text-[10.5px] font-semibold tracking-[0.1em] text-[#6B7480]">
        WORKSPACE
      </div>

      <nav className="flex flex-col gap-px">
        {NAV_ITEMS.map((item) => {
          const href = projectId
            ? `/dashboard/${projectId}${item.segment ? `/${item.segment}` : ""}`
            : "/dashboard";

          const isActive =
            item.segment === ""
              ? pathname === href
              : pathname === href || pathname.startsWith(`${href}/`);

          const count =
            !site || !item.count
              ? undefined
              : item.count === "keywords"
                ? site.keywordCount
                : site.competitorCount;

          return (
            <NavRow
              key={item.segment}
              href={href}
              label={item.label}
              icon={item.icon}
              count={count}
              countTone={item.count === "competitors" ? "opportunity" : "muted"}
              isActive={isActive}
              // Without a site there's nothing for a per-site link to point at.
              isDisabled={!projectId && item.segment !== ""}
              onNavigate={onNavigate}
            />
          );
        })}
      </nav>

      <div className="flex-1" />

      <div className="flex flex-col gap-px border-t border-[#EDEFF3] pt-4">
        <NavRow
          href={settingsHref}
          label="Settings"
          icon={Settings}
          isActive={settingsActive}
          onNavigate={onNavigate}
        />

        <div className="flex items-center gap-2.5 px-1.5 pt-2.5">
          <span className="bg-ink-900 inline-flex size-[26px] shrink-0 items-center justify-center rounded-full text-[11px] font-medium text-white">
            {initials || "?"}
          </span>
          <div className="min-w-0">
            <div className="text-ink-900 truncate text-[12.5px] font-medium">
              {user?.name ?? user?.email ?? "Your account"}
            </div>
            <div className="truncate text-[11px] text-[#6B7480]">
              {site?.domain ?? user?.email ?? ""}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

/** Desktop rail. Hidden below lg, where the drawer takes over. */
export function AppSidebar({ className }: { className?: string }) {
  return (
    <aside
      className={cn(
        "hidden w-[224px] shrink-0 flex-col border-r border-[#EDEFF3] bg-[#FAFAFB] px-[18px] pt-[26px] pb-[22px] lg:flex",
        className,
      )}
    >
      <SidebarBody />
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
      <div className="sticky top-0 z-30 flex items-center justify-between border-b border-[#EDEFF3] bg-[#FAFAFB] px-4 py-3 lg:hidden">
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
              className="bg-ink-900/30 fixed inset-0 z-40 lg:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setOpen(false)}
            />

            <motion.aside
              className="fixed inset-y-0 left-0 z-50 flex w-[260px] max-w-[80vw] flex-col bg-[#FAFAFB] px-[18px] pt-[26px] pb-[22px] lg:hidden"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="absolute top-4 right-3">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setOpen(false)}
                  aria-label="Close navigation"
                >
                  <X />
                </Button>
              </div>

              <SidebarBody onNavigate={() => setOpen(false)} />
            </motion.aside>
          </>
        ) : null}
      </AnimatePresence>
    </>
  );
}
