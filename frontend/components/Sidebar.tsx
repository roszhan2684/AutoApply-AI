"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Briefcase,
  FileCheck,
  User,
  Zap,
  Github,
  ChevronRight,
} from "lucide-react";
import clsx from "clsx";

const nav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/jobs", label: "Jobs", icon: Briefcase },
  { href: "/applications", label: "Applications", icon: FileCheck },
  { href: "/profile", label: "Profile", icon: User },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed top-0 left-0 h-screen w-60 bg-ink-soft border-r border-acid-subtle flex flex-col z-40">
      {/* Logo */}
      <div className="px-6 pt-7 pb-6 border-b border-acid-subtle">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-acid rounded-md flex items-center justify-center flex-shrink-0">
            <Zap size={14} className="text-ink" fill="currentColor" />
          </div>
          <div>
            <div className="font-display font-700 text-ghost text-sm leading-none tracking-tight">
              AutoApply
            </div>
            <div className="text-ghost-faint text-[10px] font-mono mt-0.5 tracking-widest uppercase">
              AI Agent
            </div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {nav.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150 group",
                active
                  ? "bg-acid text-ink font-medium"
                  : "text-ghost-dim hover:text-ghost hover:bg-ink-mid"
              )}
            >
              <Icon
                size={16}
                className={clsx(active ? "text-ink" : "text-ghost-faint group-hover:text-ghost-dim")}
              />
              <span className="font-body flex-1">{label}</span>
              {active && <ChevronRight size={13} className="text-ink opacity-60" />}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-acid-subtle">
        <div className="text-ghost-faint text-[10px] font-mono text-center tracking-wider opacity-50">
          v1.0.0 · claude-powered
        </div>
      </div>
    </aside>
  );
}
