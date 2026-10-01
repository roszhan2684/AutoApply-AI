"use client";
import { useState } from "react";
import { X, Zap, AlertTriangle } from "lucide-react";
import { pipelineApi } from "@/lib/api";
import toast from "react-hot-toast";
import clsx from "clsx";

interface RunPipelineModalProps {
  onClose: () => void;
  onSuccess?: () => void;
}

export function RunPipelineModal({ onClose, onSuccess }: RunPipelineModalProps) {
  const [config, setConfig] = useState({
    dry_run: true,
    max_applications: 5,
    min_match_score: 70,
    scrape_first: true,
  });
  const [loading, setLoading] = useState(false);

  const handleRun = async () => {
    setLoading(true);
    try {
      const result = await pipelineApi.run(config);
      toast.success(
        config.dry_run
          ? "Dry run complete — no applications submitted"
          : `Pipeline started — applying to up to ${config.max_applications} jobs`
      );
      onSuccess?.();
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Pipeline failed to start");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-ink-soft border border-acid-subtle rounded-2xl w-full max-w-md shadow-card animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-acid-subtle">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-acid rounded-lg flex items-center justify-center">
              <Zap size={14} className="text-ink" fill="currentColor" />
            </div>
            <div>
              <h2 className="font-display font-bold text-ghost text-base">Run Pipeline</h2>
              <p className="text-ghost-faint text-xs font-body">Configure your job application agent</p>
            </div>
          </div>
          <button onClick={onClose} className="text-ghost-faint hover:text-ghost transition-colors p-1">
            <X size={18} />
          </button>
        </div>

        {/* Config */}
        <div className="p-6 space-y-5">
          {/* Dry Run Toggle */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-ghost text-sm font-body font-medium">Dry Run Mode</p>
              <p className="text-ghost-faint text-xs mt-0.5">
                Simulate the pipeline without submitting any applications
              </p>
            </div>
            <button
              onClick={() => setConfig((c) => ({ ...c, dry_run: !c.dry_run }))}
              className={clsx(
                "relative w-11 h-6 rounded-full transition-colors flex-shrink-0 mt-0.5",
                config.dry_run ? "bg-acid" : "bg-ink-muted"
              )}
            >
              <span
                className={clsx(
                  "absolute top-0.5 w-5 h-5 rounded-full bg-ink transition-transform",
                  config.dry_run ? "translate-x-5" : "translate-x-0.5"
                )}
              />
            </button>
          </div>

          {/* Scrape First Toggle */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-ghost text-sm font-body font-medium">Scrape New Jobs First</p>
              <p className="text-ghost-faint text-xs mt-0.5">
                Fetch fresh jobs from LinkedIn, Indeed, and Wellfound before running
              </p>
            </div>
            <button
              onClick={() => setConfig((c) => ({ ...c, scrape_first: !c.scrape_first }))}
              className={clsx(
                "relative w-11 h-6 rounded-full transition-colors flex-shrink-0 mt-0.5",
                config.scrape_first ? "bg-acid" : "bg-ink-muted"
              )}
            >
              <span
                className={clsx(
                  "absolute top-0.5 w-5 h-5 rounded-full bg-ink transition-transform",
                  config.scrape_first ? "translate-x-5" : "translate-x-0.5"
                )}
              />
            </button>
          </div>

          {/* Max Applications */}
          <div>
            <div className="flex justify-between mb-1.5">
              <label className="text-ghost text-sm font-body font-medium">Max Applications</label>
              <span className="text-acid font-mono text-sm">{config.max_applications}</span>
            </div>
            <input
              type="range"
              min={1}
              max={20}
              value={config.max_applications}
              onChange={(e) => setConfig((c) => ({ ...c, max_applications: Number(e.target.value) }))}
              className="w-full h-1.5 bg-ink-muted rounded-full appearance-none cursor-pointer accent-acid"
            />
            <div className="flex justify-between text-ghost-faint text-[10px] font-mono mt-1">
              <span>1</span><span>20</span>
            </div>
          </div>

          {/* Min Match Score */}
          <div>
            <div className="flex justify-between mb-1.5">
              <label className="text-ghost text-sm font-body font-medium">Min Match Score</label>
              <span className="text-acid font-mono text-sm">{config.min_match_score}%</span>
            </div>
            <input
              type="range"
              min={40}
              max={95}
              step={5}
              value={config.min_match_score}
              onChange={(e) => setConfig((c) => ({ ...c, min_match_score: Number(e.target.value) }))}
              className="w-full h-1.5 bg-ink-muted rounded-full appearance-none cursor-pointer accent-acid"
            />
            <div className="flex justify-between text-ghost-faint text-[10px] font-mono mt-1">
              <span>40%</span><span>95%</span>
            </div>
          </div>

          {/* Warning if live */}
          {!config.dry_run && (
            <div className="flex items-start gap-2.5 bg-status-rejected/10 border border-status-rejected/25 rounded-lg p-3">
              <AlertTriangle size={14} className="text-status-rejected flex-shrink-0 mt-0.5" />
              <p className="text-status-rejected text-xs font-body">
                Live mode will actually submit applications. Ensure your resume and profile are up to date.
              </p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3 px-6 pb-6">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-lg border border-acid-subtle text-ghost-dim hover:text-ghost text-sm font-body transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleRun}
            disabled={loading}
            className="flex-1 py-2.5 rounded-lg bg-acid hover:bg-acid-dim text-ink text-sm font-display font-bold transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-ink border-t-transparent rounded-full animate-spin" />
                Starting...
              </>
            ) : (
              <>
                <Zap size={14} fill="currentColor" />
                {config.dry_run ? "Dry Run" : "Run Agent"}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
