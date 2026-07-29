"use client";

import { IconTile } from "@theseosaas/ui/components/icon-tile";
import { cn } from "@theseosaas/ui/lib/utils";
import {
  BarChart3,
  FileSearch,
  KeyRound,
  LayoutDashboard,
  PenLine,
  Search,
  Settings,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * App shell navigation.
 *
 * Order mirrors the product's core loop — Audit → Opportunities → Generate →
 * Track — so the sidebar itself teaches the workflow. Strategist lands here in
 * v0.2, between Content and Settings.
 */
interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/audits", label: "Audits", icon: FileSearch },
  { href: "/keywords", label: "Keywords", icon: KeyRound },
  { href: "/competitors", label: "Competitors", icon: BarChart3 },
  { href: "/content", label: "Content", icon: PenLine },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function AppSidebar({ className }: { className?: string }) {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        "bg-sidebar border-line flex w-[232px] shrink-0 flex-col gap-6 border-r px-3 py-5",
        className,
      )}
    >
      <Link href="/dashboard" className="flex items-center gap-2.5 px-2 no-underline">
        <IconTile tone="ink" size="md">
          <Search />
        </IconTile>
        <span className="font-display text-ink-900 text-md font-semibold tracking-tight">
          TheSEOSaaS
        </span>
      </Link>

      <nav className="flex flex-1 flex-col gap-0.5">
        {NAV_ITEMS.map((item) => {
          // startsWith so /content/[id] keeps Content highlighted.
          const isActive =
            pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
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
    </aside>
  );
}
