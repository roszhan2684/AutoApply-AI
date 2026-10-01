import clsx from "clsx";
import type { JobSource } from "@/types";

const SOURCE_CONFIG: Record<string, { label: string; color: string }> = {
  linkedin: { label: "LinkedIn", color: "text-blue-400 bg-blue-400/10 border-blue-400/20" },
  indeed: { label: "Indeed", color: "text-purple-400 bg-purple-400/10 border-purple-400/20" },
  wellfound: { label: "Wellfound", color: "text-orange-400 bg-orange-400/10 border-orange-400/20" },
  greenhouse: { label: "Greenhouse", color: "text-green-400 bg-green-400/10 border-green-400/20" },
  lever: { label: "Lever", color: "text-pink-400 bg-pink-400/10 border-pink-400/20" },
  other: { label: "Other", color: "text-ghost-dim bg-ink-mid border-acid-subtle" },
};

export function SourceBadge({ source }: { source: JobSource | string }) {
  const cfg = SOURCE_CONFIG[source] ?? SOURCE_CONFIG.other;
  return (
    <span className={clsx("text-[10px] font-mono px-1.5 py-0.5 rounded border uppercase tracking-wider", cfg.color)}>
      {cfg.label}
    </span>
  );
}
