import clsx from "clsx";

interface MatchScoreBadgeProps {
  score?: number;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
}

function getScoreColor(score: number) {
  if (score >= 80) return { ring: "border-acid", text: "text-acid", bg: "bg-acid/10" };
  if (score >= 60) return { ring: "border-status-interview", text: "text-status-interview", bg: "bg-status-interview/10" };
  if (score >= 40) return { ring: "border-ghost-faint", text: "text-ghost-dim", bg: "bg-ink-mid" };
  return { ring: "border-status-rejected/50", text: "text-status-rejected", bg: "bg-status-rejected/10" };
}

function getVerdict(score: number) {
  if (score >= 80) return "Strong Match";
  if (score >= 65) return "Good Match";
  if (score >= 45) return "Weak Match";
  return "Low Match";
}

export function MatchScoreBadge({ score, size = "md", showLabel = false }: MatchScoreBadgeProps) {
  if (score === undefined || score === null) {
    return (
      <span className="text-ghost-faint text-xs font-mono border border-ink-muted px-2 py-0.5 rounded">
        —
      </span>
    );
  }

  const colors = getScoreColor(score);
  const sizeClasses = {
    sm: "w-9 h-9 text-xs",
    md: "w-12 h-12 text-sm",
    lg: "w-16 h-16 text-lg",
  };

  return (
    <div className="flex items-center gap-2">
      <div
        className={clsx(
          "rounded-full flex items-center justify-center border-2 font-display font-bold flex-shrink-0",
          colors.ring,
          colors.text,
          colors.bg,
          sizeClasses[size]
        )}
      >
        {score}
      </div>
      {showLabel && (
        <span className={clsx("text-xs font-mono", colors.text)}>{getVerdict(score)}</span>
      )}
    </div>
  );
}

export function MatchScoreBar({ score }: { score?: number }) {
  if (!score) return null;
  const colors = getScoreColor(score);
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1 bg-ink-muted rounded-full overflow-hidden">
        <div
          className={clsx("h-full rounded-full transition-all duration-700", {
            "bg-acid": score >= 80,
            "bg-status-interview": score >= 60 && score < 80,
            "bg-ghost-faint": score >= 40 && score < 60,
            "bg-status-rejected": score < 40,
          })}
          style={{ width: `${score}%` }}
        />
      </div>
      <span className={clsx("text-xs font-mono w-8 text-right", colors.text)}>{score}%</span>
    </div>
  );
}
