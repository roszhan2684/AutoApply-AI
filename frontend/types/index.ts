export type JobStatus = "discovered" | "matched" | "applied" | "rejected" | "error";
export type ApplicationStatus = "submitted" | "viewed" | "interview" | "offer" | "rejected" | "error";
export type JobSource = "linkedin" | "indeed" | "wellfound" | "greenhouse" | "lever" | "other";

export interface Job {
  id: number;
  company: string;
  role: string;
  location: string;
  job_description: string;
  apply_link: string;
  salary_min?: number;
  salary_max?: number;
  salary_raw?: string;
  source: JobSource;
  match_score?: number;
  match_reasons?: string[];
  matching_skills?: string[];
  missing_skills?: string[];
  is_remote: boolean;
  posted_date?: string;
  discovered_at: string;
  status: JobStatus;
  tailored_resume?: string;
  cover_letter?: string;
}

export interface Application {
  id: number;
  job_id?: number;
  company: string;
  role: string;
  job_url: string;
  applied_date: string;
  status: ApplicationStatus;
  match_score?: number;
  cover_letter_used?: string;
  resume_version?: string;
  notes?: string;
  follow_up_date?: string;
  response_date?: string;
}

export interface UserProfile {
  id?: number;
  name: string;
  email: string;
  phone: string;
  linkedin_url?: string;
  github_url?: string;
  portfolio_url?: string;
  resume_text: string;
  target_roles: string[];
  target_locations: string[];
  min_salary?: number;
  work_authorization: string;
  requires_sponsorship: boolean;
  skills: string[];
  years_experience: number;
}

export interface DashboardStats {
  total_jobs: number;
  jobs_discovered_today: number;
  jobs_matched: number;
  jobs_applied: number;
  avg_match_score: number;
  top_sources: { source: string; count: number }[];
  applications_by_status: { status: string; count: number }[];
  recent_applications: Application[];
  top_jobs: Job[];
}

export interface PipelineConfig {
  dry_run: boolean;
  max_applications: number;
  min_match_score: number;
  scrape_first: boolean;
}

export interface MatchResult {
  match_score: number;
  verdict: string;
  matching_skills: string[];
  missing_skills: string[];
  reasons: string[];
  recommendation: string;
}
