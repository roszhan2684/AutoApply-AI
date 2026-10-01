import axios from "axios";
import type { Job, Application, UserProfile, DashboardStats, PipelineConfig } from "@/types";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000",
  timeout: 60000,
  headers: { "Content-Type": "application/json" },
});

// ── Jobs ──────────────────────────────────────────────────────────────────────
export const jobsApi = {
  list: async (params?: {
    status?: string;
    min_score?: number;
    source?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ jobs: Job[]; total: number }> => {
    const res = await api.get("/api/jobs", { params });
    return res.data;
  },

  get: async (id: number): Promise<Job> => {
    const res = await api.get(`/api/jobs/${id}`);
    return res.data;
  },

  scrape: async (): Promise<{ scraped: number; saved: number }> => {
    const res = await api.post("/api/jobs/scrape");
    return res.data;
  },

  match: async (id: number): Promise<Job> => {
    const res = await api.post(`/api/jobs/${id}/match`);
    return res.data;
  },

  matchAll: async (limit?: number): Promise<{ processed: number }> => {
    const res = await api.post("/api/jobs/match-all", null, { params: { limit } });
    return res.data;
  },

  optimizeResume: async (id: number): Promise<{ tailored_resume: string }> => {
    const res = await api.post(`/api/jobs/${id}/optimize-resume`);
    return res.data;
  },

  generateCoverLetter: async (id: number): Promise<{ cover_letter: string }> => {
    const res = await api.post(`/api/jobs/${id}/cover-letter`);
    return res.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/api/jobs/${id}`);
  },
};

// ── Applications ──────────────────────────────────────────────────────────────
export const applicationsApi = {
  list: async (params?: {
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ applications: Application[]; total: number }> => {
    const res = await api.get("/api/applications", { params });
    return res.data;
  },

  get: async (id: number): Promise<Application> => {
    const res = await api.get(`/api/applications/${id}`);
    return res.data;
  },

  updateStatus: async (id: number, status: string, notes?: string): Promise<Application> => {
    const res = await api.patch(`/api/applications/${id}`, { status, notes });
    return res.data;
  },

  stats: async (): Promise<DashboardStats> => {
    const res = await api.get("/api/applications/stats");
    return res.data;
  },
};

// ── Pipeline ──────────────────────────────────────────────────────────────────
export const pipelineApi = {
  run: async (config: PipelineConfig): Promise<{ message: string; dry_run: boolean }> => {
    const res = await api.post("/api/pipeline/run", config);
    return res.data;
  },

  apply: async (jobId: number, dryRun = true): Promise<{ success: boolean; message: string }> => {
    const res = await api.post(`/api/jobs/${jobId}/apply`, null, { params: { dry_run: dryRun } });
    return res.data;
  },
};

// ── Profile ───────────────────────────────────────────────────────────────────
export const profileApi = {
  get: async (): Promise<UserProfile> => {
    const res = await api.get("/api/profile");
    return res.data;
  },

  update: async (profile: Partial<UserProfile>): Promise<UserProfile> => {
    const res = await api.put("/api/profile", profile);
    return res.data;
  },
};

export default api;
