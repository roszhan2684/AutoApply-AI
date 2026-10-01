import clsx from "clsx";
import type { JobStatus, ApplicationStatus } from "@/types";

const STATUS_CONFIG: Record<string, { label: string; dot: string; text: string; bg: string }> = {
  discovered: { label: "Discovered", dot: "bg-ghost-faint", text: "text-ghost-dim", bg: "bg-ink-mid" },
  matched: { label: "Matched", dot: "bg-acid", text: "text-acid", bg: "bg-acid/10" },
  applied: { label: "Applied", dot: "bg-status-applied", text: "text-status-applied", bg: "bg-status-applied/10" },
  submitted: { label: "Submitted", dot: "bg-status-applied", text: "text-status-applied", bg: "bg-status-applied/10" },
  viewed: { label: "Viewed", dot: "bg-status-interview", text: "text-status-interview", bg: "bg-status-interview/10" },
  interview: { label: "Interview", dot: "bg-status-interview", text: "text-status-interview", bg: "bg-status-interview/15" },
  offer: { label: "Offer 🎉", dot: "bg-status-offer", text: "text-status-offer", bg: "bg-status-offer/10" },
  rejected: { label: "Rejected", dot: "bg-status-rejected", text: "text-status-rejected", bg: "bg-status-rejected/10" },
  error: { label: "Error", dot: "bg-status-error", text: "text-status-error", bg: "bg-status-error/10" },
};

interface StatusBadgeProps {
  status: JobStatus | ApplicationStatus | string;
  pulse?: boolean;
}

export function StatusBadge({ status, pulse }: StatusBadgeProps) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.discovered;

  return (
    <span className={clsx("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono", cfg.bg, cfg.text)}>
      <span className={clsx("w-1.5 h-1.5 rounded-full flex-shrink-0", cfg.dot, pulse && "animate-pulse")} />
      {cfg.label}
    </span>
  );
}
