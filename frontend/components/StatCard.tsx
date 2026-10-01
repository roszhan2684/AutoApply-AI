"use client";
import clsx from "clsx";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  icon: LucideIcon;
  accent?: boolean;
  trend?: { value: number; label: string };
  delay?: number;
}

export function StatCard({ label, value, sub, icon: Icon, accent, trend, delay = 0 }: StatCardProps) {
  return (
    <div
      className={clsx(
        "relative rounded-xl p-5 border overflow-hidden animate-slide-up",
        accent
          ? "bg-acid border-acid shadow-acid-glow"
          : "bg-card border-acid-subtle shadow-card"
      )}
      style={{ animationDelay: `${delay}ms`, animationFillMode: "both" }}
    >
      {/* Subtle grid bg */}
      {!accent && (
        <div className="absolute inset-0 bg-grid-pattern bg-grid-40 opacity-100 pointer-events-none" />
      )}

      <div className="relative flex items-start justify-between">
        <div>
          <p className={clsx("text-xs font-mono tracking-widest uppercase mb-3", accent ? "text-ink/60" : "text-ghost-faint")}>
            {label}
          </p>
          <p className={clsx("font-display font-bold leading-none", accent ? "text-ink text-4xl" : "text-ghost text-3xl")}>
            {typeof value === "number" && value % 1 !== 0 ? value.toFixed(1) : value}
          </p>
          {sub && (
            <p className={clsx("text-xs mt-1.5 font-body", accent ? "text-ink/60" : "text-ghost-faint")}>
              {sub}
            </p>
          )}
          {trend && (
            <p className={clsx("text-xs mt-2 font-mono", trend.value >= 0 ? "text-acid" : "text-status-rejected")}>
              {trend.value >= 0 ? "+" : ""}{trend.value}% {trend.label}
            </p>
          )}
        </div>
        <div className={clsx("p-2.5 rounded-lg", accent ? "bg-ink/10" : "bg-ink-mid border border-acid-subtle")}>
          <Icon size={18} className={accent ? "text-ink" : "text-acid"} />
        </div>
      </div>
    </div>
  );
}
