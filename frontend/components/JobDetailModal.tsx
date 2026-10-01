"use client";
import { useState } from "react";
import { X, ExternalLink, FileText, Mail, Send, Loader } from "lucide-react";
import { jobsApi, pipelineApi } from "@/lib/api";
import { MatchScoreBadge } from "./MatchScoreBadge";
import { StatusBadge } from "./StatusBadge";
import { SourceBadge } from "./SourceBadge";
import toast from "react-hot-toast";
import type { Job } from "@/types";
import clsx from "clsx";

interface JobDetailModalProps {
  job: Job;
  onClose: () => void;
  onRefresh?: () => void;
}

type Tab = "overview" | "resume" | "cover_letter";

export function JobDetailModal({ job, onClose, onRefresh }: JobDetailModalProps) {
  const [tab, setTab] = useState<Tab>("overview");
  const [loadingResume, setLoadingResume] = useState(false);
  const [loadingCover, setLoadingCover] = useState(false);
  const [applying, setApplying] = useState(false);
  const [localJob, setLocalJob] = useState<Job>(job);

  const tabs: { id: Tab; label: string; icon: typeof FileText }[] = [
    { id: "overview", label: "Overview", icon: FileText },
    { id: "resume", label: "Tailored Resume", icon: FileText },
    { id: "cover_letter", label: "Cover Letter", icon: Mail },
  ];

  const generateResume = async () => {
    setLoadingResume(true);
    try {
      const result = await jobsApi.optimizeResume(localJob.id);
      setLocalJob((j) => ({ ...j, tailored_resume: result.tailored_resume }));
      setTab("resume");
      toast.success("Resume optimized for this role");
    } catch {
      toast.error("Failed to optimize resume");
    } finally {
      setLoadingResume(false);
    }
  };

  const generateCoverLetter = async () => {
    setLoadingCover(true);
    try {
      const result = await jobsApi.generateCoverLetter(localJob.id);
      setLocalJob((j) => ({ ...j, cover_letter: result.cover_letter }));
      setTab("cover_letter");
      toast.success("Cover letter generated");
    } catch {
      toast.error("Failed to generate cover letter");
    } finally {
      setLoadingCover(false);
    }
  };

  const handleApply = async (dryRun = true) => {
    setApplying(true);
    try {
      const result = await pipelineApi.apply(localJob.id, dryRun);
      if (result.success) {
        toast.success(dryRun ? "Dry run successful" : "Application submitted!");
        onRefresh?.();
        if (!dryRun) onClose();
      } else {
        toast.error("Application failed");
      }
    } catch {
      toast.error("Application error");
    } finally {
      setApplying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-ink-soft border border-acid-subtle rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-card animate-slide-up">
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-acid-subtle">
          <div className="flex items-start gap-4">
            <MatchScoreBadge score={localJob.match_score} size="lg" />
            <div>
              <h2 className="font-display font-bold text-ghost text-lg leading-tight">{localJob.role}</h2>
              <p className="text-ghost-dim text-sm mt-0.5">{localJob.company}</p>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <StatusBadge status={localJob.status} />
                <SourceBadge source={localJob.source} />
                {localJob.is_remote && (
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded border border-acid-subtle text-acid uppercase tracking-wider">
                    Remote
                  </span>
                )}
              </div>
            </div>
          </div>
          <button onClick={onClose} className="text-ghost-faint hover:text-ghost transition-colors p-1 flex-shrink-0">
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-acid-subtle px-6">
          {tabs.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={clsx(
                "py-3 px-1 mr-6 text-sm font-body border-b-2 transition-colors",
                tab === id
                  ? "border-acid text-acid"
                  : "border-transparent text-ghost-faint hover:text-ghost-dim"
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {tab === "overview" && (
            <div className="space-y-5">
              {/* Meta */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  ["Location", localJob.location || "Not specified"],
                  ["Salary", localJob.salary_raw || (localJob.salary_min ? `$${localJob.salary_min.toLocaleString()}+` : "Not listed")],
                  ["Posted", localJob.posted_date || "Unknown"],
                  ["Discovered", new Date(localJob.discovered_at).toLocaleDateString()],
                ].map(([k, v]) => (
                  <div key={k} className="bg-ink-mid rounded-lg px-3 py-2.5">
                    <p className="text-ghost-faint text-[10px] font-mono uppercase tracking-wider">{k}</p>
                    <p className="text-ghost-dim text-sm mt-0.5 font-body">{v}</p>
                  </div>
                ))}
              </div>

              {/* Match reasons */}
              {localJob.match_reasons && localJob.match_reasons.length > 0 && (
                <div>
                  <p className="text-ghost-faint text-xs font-mono uppercase tracking-wider mb-2">Why it matched</p>
                  <ul className="space-y-1.5">
                    {localJob.match_reasons.map((r, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-ghost-dim font-body">
                        <span className="text-acid mt-0.5">•</span>
                        {r}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Missing skills */}
              {localJob.missing_skills && localJob.missing_skills.length > 0 && (
                <div>
                  <p className="text-ghost-faint text-xs font-mono uppercase tracking-wider mb-2">Skills to address</p>
                  <div className="flex flex-wrap gap-1.5">
                    {localJob.missing_skills.map((s) => (
                      <span key={s} className="text-xs px-2 py-1 bg-status-rejected/10 text-status-rejected border border-status-rejected/20 rounded font-mono">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Job description */}
              {localJob.job_description && (
                <div>
                  <p className="text-ghost-faint text-xs font-mono uppercase tracking-wider mb-2">Job Description</p>
                  <div className="text-ghost-dim text-sm font-body leading-relaxed whitespace-pre-wrap bg-ink-mid rounded-lg p-4 max-h-48 overflow-y-auto">
                    {localJob.job_description}
                  </div>
                </div>
              )}

              {/* Link */}
              {localJob.apply_link && (
                <a
                  href={localJob.apply_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-acid text-sm hover:text-acid-dim transition-colors font-mono"
                >
                  View original posting <ExternalLink size={13} />
                </a>
              )}
            </div>
          )}

          {tab === "resume" && (
            <div>
              {localJob.tailored_resume ? (
                <pre className="text-ghost-dim text-xs font-mono leading-relaxed whitespace-pre-wrap bg-ink-mid rounded-lg p-4 overflow-auto">
                  {localJob.tailored_resume}
                </pre>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 gap-4">
                  <p className="text-ghost-faint text-sm">No tailored resume yet</p>
                  <button
                    onClick={generateResume}
                    disabled={loadingResume}
                    className="flex items-center gap-2 px-4 py-2.5 bg-acid text-ink rounded-lg text-sm font-display font-bold hover:bg-acid-dim transition-colors disabled:opacity-50"
                  >
                    {loadingResume ? <Loader size={14} className="animate-spin" /> : <FileText size={14} />}
                    Generate Tailored Resume
                  </button>
                </div>
              )}
            </div>
          )}

          {tab === "cover_letter" && (
            <div>
              {localJob.cover_letter ? (
                <pre className="text-ghost-dim text-sm font-body leading-relaxed whitespace-pre-wrap bg-ink-mid rounded-lg p-4 overflow-auto">
                  {localJob.cover_letter}
                </pre>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 gap-4">
                  <p className="text-ghost-faint text-sm">No cover letter yet</p>
                  <button
                    onClick={generateCoverLetter}
                    disabled={loadingCover}
                    className="flex items-center gap-2 px-4 py-2.5 bg-acid text-ink rounded-lg text-sm font-display font-bold hover:bg-acid-dim transition-colors disabled:opacity-50"
                  >
                    {loadingCover ? <Loader size={14} className="animate-spin" /> : <Mail size={14} />}
                    Generate Cover Letter
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-acid-subtle">
          <div className="flex gap-2">
            {!localJob.tailored_resume && (
              <button
                onClick={generateResume}
                disabled={loadingResume}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-acid-subtle text-ghost-dim hover:text-ghost text-xs font-mono transition-colors disabled:opacity-50"
              >
                {loadingResume ? <Loader size={12} className="animate-spin" /> : <FileText size={12} />}
                Optimize Resume
              </button>
            )}
            {!localJob.cover_letter && (
              <button
                onClick={generateCoverLetter}
                disabled={loadingCover}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-acid-subtle text-ghost-dim hover:text-ghost text-xs font-mono transition-colors disabled:opacity-50"
              >
                {loadingCover ? <Loader size={12} className="animate-spin" /> : <Mail size={12} />}
                Write Cover Letter
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => handleApply(true)}
              disabled={applying}
              className="px-3 py-2 rounded-lg border border-acid-subtle text-ghost-dim hover:text-ghost text-xs font-mono transition-colors disabled:opacity-50"
            >
              Dry Run
            </button>
            <button
              onClick={() => handleApply(false)}
              disabled={applying}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-acid text-ink text-sm font-display font-bold hover:bg-acid-dim transition-colors disabled:opacity-50"
            >
              {applying ? <Loader size={13} className="animate-spin" /> : <Send size={13} />}
              Apply Now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
