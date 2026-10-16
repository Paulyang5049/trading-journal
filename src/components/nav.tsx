"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  BookOpen,
  Wallet,
  Brain,
  AlertTriangle,
  Settings,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { ThemeToggle } from "./theme-toggle";

const links: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/trades", label: "Trading Log", icon: BookOpen },
  { href: "/accounts", label: "Account Capital", icon: Wallet },
  { href: "/preparation", label: "Preparation", icon: Brain },
  { href: "/mistakes", label: "Review & lessons", icon: AlertTriangle },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Nav() {
  const pathname = usePathname();
  return (
    <aside className="flex shrink-0 flex-col border-b bg-surface md:sticky md:top-0 md:h-screen md:w-56 md:border-r md:border-b-0">
      <div className="flex items-center gap-2 px-5 py-5">
        <div className="grid h-8 w-8 place-items-center rounded-[var(--radius)] bg-primary text-primary-foreground font-bold">
          T
        </div>
        <span className="font-semibold tracking-tight">Trading Journal</span>
      </div>
      <div className="hidden px-6 pb-3 pt-5 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted md:block">
        Your workspace
      </div>
      <nav
        aria-label="Main navigation"
        className="flex gap-1 overflow-x-auto px-3 pb-3 md:block md:flex-1 md:space-y-1"
      >
        {links.map(({ href, label, icon: Icon }) => {
          const active =
            href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex shrink-0 items-center gap-3 rounded-[var(--radius)] px-3 py-3 text-sm font-medium transition",
                active
                  ? "bg-primary/10 text-primary"
                  : "text-muted hover:bg-surface-2 hover:text-foreground",
              )}
            >
              <Icon size={18} />
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="flex items-center justify-between border-t px-5 py-3">
        <span className="text-xs text-muted">Free &amp; open source</span>
        <ThemeToggle />
      </div>
    </aside>
  );
}
