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
  { href: "/mistakes", label: "Mistakes", icon: AlertTriangle },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Nav() {
  const pathname = usePathname();
  return (
    <aside className="flex w-60 shrink-0 flex-col border-r bg-surface">
      <div className="flex items-center gap-2 px-5 py-5">
        <div className="grid h-8 w-8 place-items-center rounded-[var(--radius)] bg-primary text-primary-foreground font-bold">
          T
        </div>
        <span className="font-semibold tracking-tight">Trading Journal</span>
      </div>
      <nav className="flex-1 space-y-1 px-3">
        {links.map(({ href, label, icon: Icon }) => {
          const active =
            href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-[var(--radius)] px-3 py-2 text-sm font-medium transition",
                active
                  ? "bg-surface-2 text-foreground"
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
