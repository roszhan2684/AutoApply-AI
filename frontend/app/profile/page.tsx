"use client";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Save, Plus, X, User, Briefcase, Code } from "lucide-react";
import { Sidebar } from "@/components/Sidebar";
import { profileApi } from "@/lib/api";
import toast from "react-hot-toast";
import type { UserProfile } from "@/types";
import clsx from "clsx";

const DEFAULT_PROFILE: Partial<UserProfile> = {
  name: "",
  email: "",
  phone: "",
  linkedin_url: "",
  github_url: "",
  portfolio_url: "",
  resume_text: "",
  target_roles: ["Software Engineer", "iOS Engineer", "AI Engineer"],
  target_locations: ["Remote", "Los Angeles, CA"],
  work_authorization: "US Citizen / Green Card",
  requires_sponsorship: false,
  skills: ["Swift", "Python", "JavaScript", "TypeScript", "React", "Node.js", "AWS"],
  years_experience: 2,
};

function TagInput({ value, onChange, placeholder }: { value: string[]; onChange: (v: string[]) => void; placeholder?: string }) {
  const [input, setInput] = useState("");
  const add = () => {
    const trimmed = input.trim();
    if (trimmed && !value.includes(trimmed)) {
      onChange([...value, trimmed]);
      setInput("");
    }
  };
  return (
    <div className="flex flex-wrap gap-1.5 p-2.5 bg-ink-mid border border-acid-subtle rounded-lg min-h-[44px]">
      {value.map((tag) => (
        <span key={tag} className="flex items-center gap-1 px-2 py-1 bg-ink-muted text-ghost-dim text-xs font-mono rounded-md">
          {tag}
          <button onClick={() => onChange(value.filter((t) => t !== tag))} className="text-ghost-faint hover:text-status-rejected transition-colors">
            <X size={10} />
          </button>
        </span>
      ))}
      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); add(); } }}
        placeholder={placeholder}
        className="bg-transparent text-ghost text-xs font-mono focus:outline-none placeholder:text-ghost-faint flex-1 min-w-20"
      />
    </div>
  );
}

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div>
      <label className="block text-ghost-faint text-[10px] font-mono uppercase tracking-wider mb-1.5">{label}</label>
      {children}
      {hint && <p className="text-ghost-faint text-[10px] mt-1 font-body">{hint}</p>}
    </div>
  );
}

function Input({ value, onChange, placeholder, type = "text" }: { value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full bg-ink-mid border border-acid-subtle rounded-lg px-3 py-2.5 text-sm text-ghost font-body placeholder:text-ghost-faint focus:outline-none focus:border-acid transition-colors"
    />
  );
}

export default function ProfilePage() {
  const queryClient = useQueryClient();
  const [profile, setProfile] = useState<Partial<UserProfile>>(DEFAULT_PROFILE);
  const [activeSection, setActiveSection] = useState<"personal" | "targets" | "resume">("personal");

  const { data: savedProfile } = useQuery({
    queryKey: ["profile"],
    queryFn: profileApi.get,
  });

  useEffect(() => {
    if (savedProfile) setProfile(savedProfile);
  }, [savedProfile]);

  const saveMutation = useMutation({
    mutationFn: () => profileApi.update(profile),
    onSuccess: () => {
      toast.success("Profile saved");
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
    onError: () => toast.error("Failed to save profile"),
  });

  const set = (key: keyof UserProfile, val: any) => setProfile((p) => ({ ...p, [key]: val }));

  const sections = [
    { id: "personal" as const, label: "Personal Info", icon: User },
    { id: "targets" as const, label: "Job Targets", icon: Briefcase },
    { id: "resume" as const, label: "Resume", icon: Code },
  ];

  return (
    <div className="flex min-h-screen bg-ink">
      <Sidebar />
      <main className="ml-60 flex-1 p-8 max-w-4xl">
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="font-display font-800 text-ghost text-3xl tracking-tight">Profile</h1>
            <p className="text-ghost-faint text-sm mt-1 font-body">Configure your job seeker profile for the AI agent</p>
          </div>
          <button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            className="flex items-center gap-2 px-4 py-2.5 bg-acid text-ink rounded-xl text-sm font-display font-bold hover:bg-acid-dim transition-colors disabled:opacity-50"
          >
            {saveMutation.isPending ? (
              <span className="w-3.5 h-3.5 border-2 border-ink border-t-transparent rounded-full animate-spin" />
            ) : (
              <Save size={14} />
            )}
            Save Profile
          </button>
        </div>

        {/* Section tabs */}
        <div className="flex gap-1 mb-6 bg-ink-mid border border-acid-subtle rounded-xl p-1 w-fit">
          {sections.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveSection(id)}
              className={clsx(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-body transition-colors",
                activeSection === id ? "bg-acid text-ink font-medium" : "text-ghost-faint hover:text-ghost"
              )}
            >
              <Icon size={13} />
              {label}
            </button>
          ))}
        </div>

        <div className="bg-card border border-acid-subtle rounded-2xl p-6 shadow-card">
          {activeSection === "personal" && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <Field label="Full Name">
                  <Input value={profile.name || ""} onChange={(v) => set("name", v)} placeholder="Roszhan Raj" />
                </Field>
                <Field label="Email">
                  <Input type="email" value={profile.email || ""} onChange={(v) => set("email", v)} placeholder="you@email.com" />
                </Field>
                <Field label="Phone">
                  <Input value={profile.phone || ""} onChange={(v) => set("phone", v)} placeholder="(555) 123-4567" />
                </Field>
                <Field label="Years Experience">
                  <Input type="number" value={String(profile.years_experience || 0)} onChange={(v) => set("years_experience", Number(v))} placeholder="2" />
                </Field>
                <Field label="LinkedIn URL">
                  <Input value={profile.linkedin_url || ""} onChange={(v) => set("linkedin_url", v)} placeholder="https://linkedin.com/in/..." />
                </Field>
                <Field label="GitHub URL">
                  <Input value={profile.github_url || ""} onChange={(v) => set("github_url", v)} placeholder="https://github.com/..." />
                </Field>
                <Field label="Portfolio URL" hint="Your personal website or portfolio">
                  <Input value={profile.portfolio_url || ""} onChange={(v) => set("portfolio_url", v)} placeholder="https://yoursite.dev" />
                </Field>
                <Field label="Work Authorization">
                  <select
                    value={profile.work_authorization || ""}
                    onChange={(e) => set("work_authorization", e.target.value)}
                    className="w-full bg-ink-mid border border-acid-subtle rounded-lg px-3 py-2.5 text-sm text-ghost font-body focus:outline-none focus:border-acid transition-colors"
                  >
                    <option>US Citizen / Green Card</option>
                    <option>OPT/CPT</option>
                    <option>H-1B</option>
                    <option>H-1B Transfer</option>
                    <option>Other</option>
                  </select>
                </Field>
              </div>

              <Field label="Requires Visa Sponsorship">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => set("requires_sponsorship", !profile.requires_sponsorship)}
                    className={clsx(
                      "relative w-11 h-6 rounded-full transition-colors",
                      profile.requires_sponsorship ? "bg-acid" : "bg-ink-muted"
                    )}
                  >
                    <span className={clsx("absolute top-0.5 w-5 h-5 rounded-full bg-ink transition-transform", profile.requires_sponsorship ? "translate-x-5" : "translate-x-0.5")} />
                  </button>
                  <span className="text-ghost-dim text-sm font-body">
                    {profile.requires_sponsorship ? "Yes — requires sponsorship" : "No — no sponsorship needed"}
                  </span>
                </div>
              </Field>

              <Field label="Min Salary Expectation" hint="Used for filtering and cover letter generation">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ghost-faint text-sm">$</span>
                  <input
                    type="number"
                    value={profile.min_salary || ""}
                    onChange={(e) => set("min_salary", Number(e.target.value))}
                    placeholder="120000"
                    className="w-full bg-ink-mid border border-acid-subtle rounded-lg pl-7 pr-3 py-2.5 text-sm text-ghost font-mono placeholder:text-ghost-faint focus:outline-none focus:border-acid transition-colors"
                  />
                </div>
              </Field>
            </div>
          )}

          {activeSection === "targets" && (
            <div className="space-y-5">
              <Field label="Target Roles" hint="Press Enter or comma to add each role">
                <TagInput
                  value={profile.target_roles || []}
                  onChange={(v) => set("target_roles", v)}
                  placeholder="Add role..."
                />
              </Field>
              <Field label="Target Locations" hint="Add 'Remote' for remote-only">
                <TagInput
                  value={profile.target_locations || []}
                  onChange={(v) => set("target_locations", v)}
                  placeholder="Add location..."
                />
              </Field>
              <Field label="Technical Skills" hint="All technologies and languages you know">
                <TagInput
                  value={profile.skills || []}
                  onChange={(v) => set("skills", v)}
                  placeholder="Add skill..."
                />
              </Field>
            </div>
          )}

          {activeSection === "resume" && (
            <div className="space-y-4">
              <Field
                label="Master Resume"
                hint="Paste your full resume as plain text. Claude will tailor it for each job automatically."
              >
                <textarea
                  value={profile.resume_text || ""}
                  onChange={(e) => set("resume_text", e.target.value)}
                  rows={24}
                  placeholder="Paste your full resume here..."
                  className="w-full bg-ink-mid border border-acid-subtle rounded-lg px-4 py-3 text-sm text-ghost font-mono placeholder:text-ghost-faint focus:outline-none focus:border-acid transition-colors resize-none leading-relaxed"
                />
              </Field>
              <p className="text-ghost-faint text-xs font-mono text-right">
                {(profile.resume_text || "").length.toLocaleString()} characters · {Math.ceil((profile.resume_text || "").split(" ").length / 250)} min read
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
