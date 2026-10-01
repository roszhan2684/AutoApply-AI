"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Briefcase, CheckCircle2, TrendingUp, Target, Search,
  Zap, RefreshCw, Clock,
} from "lucide-react";
import { Sidebar } from "@/components/Sidebar";
import { StatCard } from "@/components/StatCard";
import { StatusBadge } from "@/components/StatusBadge";
import { MatchScoreBar } from "@/components/MatchScoreBadge";
import { SourceBadge } from "@/components/SourceBadge";
import { RunPipelineModal } from "@/components/RunPipelineModal";
import { applicationsApi, jobsApi } from "@/lib/api";
import toast from "react-hot-toast";

export default function DashboardPage() {
  const [showPipeline, setShowPipeline] = useState(false);
  const [scraping, setScraping] = useState(false);

  const { data: stats, refetch: refetchStats } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: applicationsApi.stats,
  });

  const { data: topJobs, refetch: refetchJobs } = useQuery({
    queryKey: ["top-jobs"],
    queryFn: () => jobsApi.list({ limit: 5, min_score: 60 }),
  });

  const handleScrape = async () => {
    setScraping(true);
    try {
      const r = await jobsApi.scrape();
      toast.success(`Scraped ${r.scraped} jobs, saved ${r.saved} new`);
      refetchStats();
      refetchJobs();
    } catch {
      toast.error("Scraping failed");
    } finally {
      setScraping(false);
    }
  };

  const statCards = [
    {
      label: "Jobs Discovered",
      value: stats?.total_jobs ?? "—",
      sub: `+${stats?.jobs_discovered_today ?? 0} today`,
      icon: Search,
      accent: false,
      delay: 0,
    },
    {
      label: "Matched Jobs",
      value: stats?.jobs_matched ?? "—",
      sub: "above threshold",
      icon: Target,
      accent: false,
      delay: 80,
    },
    {
      label: "Applied",
      value: stats?.jobs_applied ?? "—",
      sub: "via agent",
      icon: CheckCircle2,
      accent: true,
      delay: 160,
    },
    {
      label: "Avg Match Score",
      value: stats?.avg_match_score ? `${Math.round(stats.avg_match_score)}%` : "—",
      sub: "across all jobs",
      icon: TrendingUp,
      accent: false,
      delay: 240,
    },
  ];

  return (
    <div className="flex min-h-screen bg-ink">
      <Sidebar />
      <main className="ml-60 flex-1 p-8">
        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="font-display font-800 text-ghost text-3xl tracking-tight">
              Command Center
            </h1>
            <p className="text-ghost-faint text-sm mt-1.5 font-body">
              {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            <button
              onClick={handleScrape}
              disabled={scraping}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-acid-subtle text-ghost-dim hover:text-ghost text-sm font-body transition-colors disabled:opacity-50"
            >
              <RefreshCw size={14} className={scraping ? "animate-spin" : ""} />
              {scraping ? "Scraping..." : "Scrape Jobs"}
            </button>
            <button
              onClick={() => setShowPipeline(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-acid text-ink text-sm font-display font-bold hover:bg-acid-dim transition-colors shadow-acid-sm"
            >
              <Zap size={14} fill="currentColor" />
              Run Agent
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          {statCards.map((card) => (
            <StatCard key={card.label} {...card} />
          ))}
        </div>

        {/* Two-column layout */}
        <div className="grid grid-cols-3 gap-6">
          {/* Top Matched Jobs */}
          <div className="col-span-2 bg-card border border-acid-subtle rounded-xl overflow-hidden shadow-card">
            <div className="px-5 py-4 border-b border-acid-subtle flex items-center justify-between">
              <div>
                <h2 className="font-display font-bold text-ghost text-sm">Top Matched Jobs</h2>
                <p className="text-ghost-faint text-xs font-mono mt-0.5">Sorted by match score</p>
              </div>
              <Briefcase size={15} className="text-ghost-faint" />
            </div>
            <div className="divide-y divide-acid-subtle">
              {topJobs?.jobs.length ? (
                topJobs.jobs.map((job) => (
                  <div key={job.id} className="px-5 py-4 hover:bg-ink-mid/50 transition-colors">
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-ghost font-body text-sm font-medium truncate">{job.role}</p>
                        <p className="text-ghost-faint text-xs mt-0.5">{job.company} · {job.location || "Remote"}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <SourceBadge source={job.source} />
                        <StatusBadge status={job.status} />
                      </div>
                    </div>
                    <MatchScoreBar score={job.match_score} />
                  </div>
                ))
              ) : (
                <div className="px-5 py-10 text-center text-ghost-faint text-sm">
                  No matched jobs yet — run the agent to find opportunities
                </div>
              )}
            </div>
          </div>

          {/* Right column */}
          <div className="space-y-6">
            {/* Application Status Breakdown */}
            <div className="bg-card border border-acid-subtle rounded-xl overflow-hidden shadow-card">
              <div className="px-5 py-4 border-b border-acid-subtle">
                <h2 className="font-display font-bold text-ghost text-sm">Application Pipeline</h2>
              </div>
              <div className="p-5 space-y-3">
                {stats?.applications_by_status?.length ? (
                  stats.applications_by_status.map(({ status, count }) => (
                    <div key={status} className="flex items-center justify-between">
                      <StatusBadge status={status} />
                      <span className="font-mono text-ghost text-sm font-medium">{count}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-ghost-faint text-xs text-center py-4">No applications yet</p>
                )}
              </div>
            </div>

            {/* Recent Applications */}
            <div className="bg-card border border-acid-subtle rounded-xl overflow-hidden shadow-card">
              <div className="px-5 py-4 border-b border-acid-subtle flex items-center gap-2">
                <Clock size={13} className="text-ghost-faint" />
                <h2 className="font-display font-bold text-ghost text-sm">Recent Activity</h2>
              </div>
              <div className="divide-y divide-acid-subtle">
                {stats?.recent_applications?.length ? (
                  stats.recent_applications.slice(0, 4).map((app) => (
                    <div key={app.id} className="px-5 py-3">
                      <p className="text-ghost text-xs font-body font-medium truncate">{app.role}</p>
                      <p className="text-ghost-faint text-[10px] font-mono mt-0.5">{app.company}</p>
                      <div className="flex items-center justify-between mt-1.5">
                        <StatusBadge status={app.status} />
                        <span className="text-ghost-faint text-[10px] font-mono">
                          {new Date(app.applied_date).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-ghost-faint text-xs text-center py-6">No applications yet</p>
                )}
              </div>
            </div>

            {/* Job Sources breakdown */}
            {stats?.top_sources && stats.top_sources.length > 0 && (
              <div className="bg-card border border-acid-subtle rounded-xl overflow-hidden shadow-card">
                <div className="px-5 py-4 border-b border-acid-subtle">
                  <h2 className="font-display font-bold text-ghost text-sm">Job Sources</h2>
                </div>
                <div className="p-5 space-y-2.5">
                  {stats.top_sources.map(({ source, count }) => {
                    const max = Math.max(...stats.top_sources.map((s) => s.count));
                    return (
                      <div key={source}>
                        <div className="flex items-center justify-between mb-1">
                          <SourceBadge source={source as any} />
                          <span className="font-mono text-ghost-dim text-xs">{count}</span>
                        </div>
                        <div className="h-1 bg-ink-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-acid rounded-full"
                            style={{ width: `${(count / max) * 100}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {showPipeline && (
        <RunPipelineModal
          onClose={() => setShowPipeline(false)}
          onSuccess={() => { refetchStats(); refetchJobs(); }}
        />
      )}
    </div>
  );
}
