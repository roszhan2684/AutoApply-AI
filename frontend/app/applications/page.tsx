"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { FileCheck, ChevronDown, Edit3, ExternalLink } from "lucide-react";
import { Sidebar } from "@/components/Sidebar";
import { StatusBadge } from "@/components/StatusBadge";
import { MatchScoreBadge } from "@/components/MatchScoreBadge";
import { applicationsApi } from "@/lib/api";
import toast from "react-hot-toast";
import type { Application, ApplicationStatus } from "@/types";
import clsx from "clsx";

const STATUS_OPTIONS: ApplicationStatus[] = [
  "submitted", "viewed", "interview", "offer", "rejected",
];

const STATUS_FILTER_OPTIONS = ["all", ...STATUS_OPTIONS];

function EditStatusDropdown({ app, onUpdate }: { app: Application; onUpdate: (status: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
        className="flex items-center gap-1 text-ghost-faint hover:text-ghost transition-colors"
      >
        <Edit3 size={11} />
        <ChevronDown size={10} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-6 z-20 bg-ink-soft border border-acid-subtle rounded-xl overflow-hidden shadow-card w-36 py-1">
            {STATUS_OPTIONS.map((s) => (
              <button
                key={s}
                className={clsx(
                  "w-full text-left px-3 py-2 text-xs font-mono capitalize transition-colors",
                  app.status === s ? "text-acid bg-acid/5" : "text-ghost-dim hover:bg-ink-mid"
                )}
                onClick={(e) => { e.stopPropagation(); onUpdate(s); setOpen(false); }}
              >
                {s}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default function ApplicationsPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("all");
  const [expanded, setExpanded] = useState<number | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["applications", statusFilter],
    queryFn: () =>
      applicationsApi.list({
        status: statusFilter === "all" ? undefined : statusFilter,
        limit: 100,
      }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      applicationsApi.updateStatus(id, status),
    onSuccess: () => {
      toast.success("Status updated");
      queryClient.invalidateQueries({ queryKey: ["applications"] });
    },
    onError: () => toast.error("Update failed"),
  });

  const apps = data?.applications ?? [];

  return (
    <div className="flex min-h-screen bg-ink">
      <Sidebar />
      <main className="ml-60 flex-1 flex flex-col">
        {/* Header */}
        <div className="px-8 pt-8 pb-5 border-b border-acid-subtle">
          <div className="flex items-start justify-between mb-5">
            <div>
              <h1 className="font-display font-800 text-ghost text-3xl tracking-tight">Applications</h1>
              <p className="text-ghost-faint text-sm mt-1 font-body">
                {data?.total ?? 0} total applications tracked
              </p>
            </div>
            <div className="w-10 h-10 bg-ink-mid border border-acid-subtle rounded-xl flex items-center justify-center">
              <FileCheck size={16} className="text-acid" />
            </div>
          </div>

          {/* Status filter pills */}
          <div className="flex items-center gap-1.5 bg-ink-mid border border-acid-subtle rounded-xl p-1 w-fit">
            {STATUS_FILTER_OPTIONS.map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={clsx(
                  "px-3 py-1.5 rounded-lg text-xs font-mono capitalize transition-colors",
                  statusFilter === s ? "bg-acid text-ink font-medium" : "text-ghost-faint hover:text-ghost-dim"
                )}
              >
                {s === "all" ? "All" : s}
                {s !== "all" && apps.filter((a) => a.status === s).length > 0 && (
                  <span className="ml-1.5 bg-ink-muted rounded px-1">
                    {apps.filter((a) => a.status === s).length}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Applications */}
        <div className="flex-1 overflow-auto px-8 py-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-6 h-6 border-2 border-acid border-t-transparent rounded-full animate-spin" />
            </div>
          ) : apps.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <FileCheck size={32} className="text-ghost-faint opacity-40" />
              <p className="text-ghost-faint text-sm">
                {statusFilter === "all" ? "No applications yet" : `No ${statusFilter} applications`}
              </p>
              <p className="text-ghost-faint text-xs">Run the pipeline to start applying automatically</p>
            </div>
          ) : (
            <div className="space-y-2">
              {apps.map((app) => (
                <div
                  key={app.id}
                  className="bg-card border border-acid-subtle rounded-xl overflow-hidden shadow-card hover:border-acid/30 transition-colors"
                >
                  {/* Row */}
                  <div
                    className="flex items-center gap-4 px-5 py-4 cursor-pointer"
                    onClick={() => setExpanded(expanded === app.id ? null : app.id)}
                  >
                    <MatchScoreBadge score={app.match_score} size="sm" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-ghost font-body font-medium text-sm truncate">{app.role}</p>
                      </div>
                      <p className="text-ghost-faint text-xs font-mono mt-0.5">{app.company}</p>
                    </div>
                    <StatusBadge status={app.status} pulse={app.status === "interview"} />
                    <div className="text-ghost-faint text-xs font-mono w-24 text-right">
                      {new Date(app.applied_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </div>
                    <div className="flex items-center gap-2">
                      {app.job_url && (
                        <a
                          href={app.job_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-ghost-faint hover:text-ghost transition-colors p-1"
                        >
                          <ExternalLink size={13} />
                        </a>
                      )}
                      <EditStatusDropdown
                        app={app}
                        onUpdate={(status) => updateMutation.mutate({ id: app.id, status })}
                      />
                    </div>
                  </div>

                  {/* Expanded detail */}
                  {expanded === app.id && (
                    <div className="border-t border-acid-subtle px-5 py-4 bg-ink-mid/50 grid grid-cols-2 gap-6">
                      {app.cover_letter_used && (
                        <div>
                          <p className="text-ghost-faint text-[10px] font-mono uppercase tracking-wider mb-2">Cover Letter</p>
                          <div className="text-ghost-dim text-xs font-body leading-relaxed line-clamp-6 whitespace-pre-wrap">
                            {app.cover_letter_used}
                          </div>
                        </div>
                      )}
                      {app.notes && (
                        <div>
                          <p className="text-ghost-faint text-[10px] font-mono uppercase tracking-wider mb-2">Notes</p>
                          <p className="text-ghost-dim text-xs font-body">{app.notes}</p>
                        </div>
                      )}
                      <div className="col-span-2 flex items-center gap-6 pt-1 border-t border-acid-subtle">
                        {[
                          ["Applied", new Date(app.applied_date).toLocaleString()],
                          app.response_date ? ["Response", new Date(app.response_date).toLocaleDateString()] : null,
                          app.follow_up_date ? ["Follow Up", new Date(app.follow_up_date).toLocaleDateString()] : null,
                          app.resume_version ? ["Resume Version", app.resume_version] : null,
                        ]
                          .filter(Boolean)
                          .map(([k, v]) => (
                            <div key={k as string}>
                              <p className="text-ghost-faint text-[10px] font-mono uppercase tracking-wider">{k as string}</p>
                              <p className="text-ghost-dim text-xs mt-0.5">{v as string}</p>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
