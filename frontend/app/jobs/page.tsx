"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Search, Filter, RefreshCw, Zap, ChevronDown,
  MapPin, Building2, ExternalLink,
} from "lucide-react";
import { Sidebar } from "@/components/Sidebar";
import { StatusBadge } from "@/components/StatusBadge";
import { SourceBadge } from "@/components/SourceBadge";
import { MatchScoreBadge } from "@/components/MatchScoreBadge";
import { JobDetailModal } from "@/components/JobDetailModal";
import { jobsApi } from "@/lib/api";
import toast from "react-hot-toast";
import type { Job } from "@/types";
import clsx from "clsx";

const STATUS_FILTERS = ["all", "discovered", "matched", "applied", "rejected"];
const SOURCE_FILTERS = ["all", "linkedin", "indeed", "wellfound", "greenhouse", "lever"];

export default function JobsPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [minScore, setMinScore] = useState(0);
  const [search, setSearch] = useState("");
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["jobs", statusFilter, sourceFilter, minScore],
    queryFn: () =>
      jobsApi.list({
        status: statusFilter === "all" ? undefined : statusFilter,
        source: sourceFilter === "all" ? undefined : sourceFilter,
        min_score: minScore > 0 ? minScore : undefined,
        limit: 100,
      }),
  });

  const scrapeMutation = useMutation({
    mutationFn: jobsApi.scrape,
    onSuccess: (r) => {
      toast.success(`Scraped ${r.scraped} jobs, ${r.saved} new`);
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
    },
    onError: () => toast.error("Scraping failed"),
  });

  const matchAllMutation = useMutation({
    mutationFn: () => jobsApi.matchAll(50),
    onSuccess: (r) => {
      toast.success(`Scored ${r.processed} jobs with Claude AI`);
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
    },
    onError: () => toast.error("Matching failed"),
  });

  const filteredJobs = (data?.jobs ?? []).filter((j) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      j.role.toLowerCase().includes(q) ||
      j.company.toLowerCase().includes(q) ||
      (j.location || "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="flex min-h-screen bg-ink">
      <Sidebar />
      <main className="ml-60 flex-1 flex flex-col">
        {/* Page header */}
        <div className="px-8 pt-8 pb-5 border-b border-acid-subtle bg-ink">
          <div className="flex items-start justify-between mb-5">
            <div>
              <h1 className="font-display font-800 text-ghost text-3xl tracking-tight">Job Board</h1>
              <p className="text-ghost-faint text-sm mt-1 font-body">
                {data?.total ?? 0} jobs discovered · {filteredJobs.length} showing
              </p>
            </div>
            <div className="flex items-center gap-2.5">
              <button
                onClick={() => scrapeMutation.mutate()}
                disabled={scrapeMutation.isPending}
                className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-acid-subtle text-ghost-dim hover:text-ghost text-sm font-body transition-colors disabled:opacity-50"
              >
                <RefreshCw size={13} className={scrapeMutation.isPending ? "animate-spin" : ""} />
                Scrape
              </button>
              <button
                onClick={() => matchAllMutation.mutate()}
                disabled={matchAllMutation.isPending}
                className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-acid-subtle text-ghost-dim hover:text-ghost text-sm font-body transition-colors disabled:opacity-50"
              >
                <Zap size={13} className={matchAllMutation.isPending ? "animate-pulse text-acid" : ""} />
                {matchAllMutation.isPending ? "Matching..." : "Match All"}
              </button>
            </div>
          </div>

          {/* Filters row */}
          <div className="flex items-center gap-3 flex-wrap">
            {/* Search */}
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-ghost-faint" />
              <input
                type="text"
                placeholder="Search role, company..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bg-ink-mid border border-acid-subtle rounded-lg pl-8 pr-4 py-2 text-sm font-body text-ghost placeholder:text-ghost-faint focus:outline-none focus:border-acid w-56 transition-colors"
              />
            </div>

            {/* Status filter */}
            <div className="flex items-center gap-1.5 bg-ink-mid border border-acid-subtle rounded-lg p-1">
              {STATUS_FILTERS.map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={clsx(
                    "px-3 py-1.5 rounded-md text-xs font-mono capitalize transition-colors",
                    statusFilter === s
                      ? "bg-acid text-ink font-medium"
                      : "text-ghost-faint hover:text-ghost-dim"
                  )}
                >
                  {s}
                </button>
              ))}
            </div>

            {/* Source filter */}
            <div className="flex items-center gap-1.5 bg-ink-mid border border-acid-subtle rounded-lg p-1">
              {SOURCE_FILTERS.slice(0, 4).map((s) => (
                <button
                  key={s}
                  onClick={() => setSourceFilter(s)}
                  className={clsx(
                    "px-3 py-1.5 rounded-md text-xs font-mono capitalize transition-colors",
                    sourceFilter === s
                      ? "bg-acid text-ink font-medium"
                      : "text-ghost-faint hover:text-ghost-dim"
                  )}
                >
                  {s === "all" ? "All Sources" : s}
                </button>
              ))}
            </div>

            {/* Min score */}
            <div className="flex items-center gap-2 bg-ink-mid border border-acid-subtle rounded-lg px-3 py-2">
              <span className="text-ghost-faint text-xs font-mono">Min score:</span>
              <select
                value={minScore}
                onChange={(e) => setMinScore(Number(e.target.value))}
                className="bg-transparent text-ghost text-xs font-mono focus:outline-none cursor-pointer"
              >
                <option value={0}>Any</option>
                <option value={50}>50+</option>
                <option value={65}>65+</option>
                <option value={75}>75+</option>
                <option value={85}>85+</option>
              </select>
            </div>
          </div>
        </div>

        {/* Jobs table */}
        <div className="flex-1 overflow-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-6 h-6 border-2 border-acid border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filteredJobs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <Building2 size={32} className="text-ghost-faint opacity-40" />
              <p className="text-ghost-faint text-sm">No jobs found — try scraping to discover new opportunities</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-acid-subtle">
                  {["Role", "Company", "Location", "Source", "Score", "Status", ""].map((h) => (
                    <th
                      key={h}
                      className="px-6 py-3.5 text-left text-ghost-faint text-[10px] font-mono uppercase tracking-wider"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-acid-subtle">
                {filteredJobs.map((job, i) => (
                  <tr
                    key={job.id}
                    className="hover:bg-ink-mid/40 transition-colors cursor-pointer group"
                    style={{ animationDelay: `${i * 30}ms` }}
                    onClick={() => setSelectedJob(job)}
                  >
                    <td className="px-6 py-4">
                      <div className="font-body font-medium text-ghost group-hover:text-acid transition-colors">
                        {job.role}
                      </div>
                      {job.posted_date && (
                        <div className="text-ghost-faint text-[10px] font-mono mt-0.5">{job.posted_date}</div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-ghost-dim font-body">{job.company}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 text-ghost-faint text-xs">
                        <MapPin size={10} className="flex-shrink-0" />
                        {job.location || "Not specified"}
                        {job.is_remote && <span className="text-acid">· Remote</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <SourceBadge source={job.source} />
                    </td>
                    <td className="px-6 py-4">
                      <MatchScoreBadge score={job.match_score} size="sm" />
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={job.status} />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        {job.apply_link && (
                          <a
                            href={job.apply_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="p-1.5 rounded hover:bg-ink-muted text-ghost-faint hover:text-ghost transition-colors"
                          >
                            <ExternalLink size={13} />
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>

      {selectedJob && (
        <JobDetailModal
          job={selectedJob}
          onClose={() => setSelectedJob(null)}
          onRefresh={() => queryClient.invalidateQueries({ queryKey: ["jobs"] })}
        />
      )}
    </div>
  );
}
