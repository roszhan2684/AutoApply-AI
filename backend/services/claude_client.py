import anthropic
import os
import json
import logging
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger(__name__)


class ClaudeClient:
    def __init__(self):
        self.client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
        self.model = "claude-opus-4-5"

    def _call(self, system: str, user: str, max_tokens: int = 2000) -> str:
        msg = self.client.messages.create(
            model=self.model, max_tokens=max_tokens,
            system=system, messages=[{"role": "user", "content": user}],
        )
        return msg.content[0].text

    def _json_call(self, system: str, user: str, max_tokens: int = 1000) -> dict:
        raw = self._call(system, user, max_tokens)
        raw = raw.strip().lstrip("```json").lstrip("```").rstrip("```").strip()
        return json.loads(raw)

    def match_job(self, resume_text: str, job_description: str, job_title: str, company: str) -> dict:
        system = (
            "You are an expert technical recruiter. Analyze resume-to-job fit. "
            "Respond ONLY with valid JSON, no markdown, no preamble."
        )
        user = f"""
Analyze this resume vs job and return JSON.

JOB: {job_title} at {company}
JOB DESCRIPTION:
{job_description[:3000]}

RESUME:
{resume_text[:3000]}

Return exactly:
{{
  "match_score": <0-100 integer>,
  "verdict": "<strong_match|good_match|weak_match|no_match>",
  "matching_skills": ["skill1", "skill2"],
  "missing_skills": ["skill1", "skill2"],
  "reasons": ["reason1", "reason2", "reason3"],
  "recommendation": "<one sentence>"
}}"""
        try:
            return self._json_call(system, user)
        except Exception as e:
            logger.error(f"match_job error: {e}")
            return {"match_score": 0, "verdict": "error", "matching_skills": [], "missing_skills": [], "reasons": [], "recommendation": ""}

    def optimize_resume(self, original_resume: str, job_description: str, company: str, role: str) -> dict:
        system = (
            "You are a world-class resume writer and ATS expert. "
            "Rewrite resumes to target specific jobs. Keep all facts truthful. "
            "Respond ONLY with valid JSON."
        )
        user = f"""
Optimize this resume for the following job.

JOB: {role} at {company}
JOB DESCRIPTION:
{job_description[:3000]}

ORIGINAL RESUME:
{original_resume[:3000]}

Return exactly:
{{
  "optimized_resume": "<full resume text with \\n for newlines>",
  "changes_made": ["change1", "change2"],
  "keywords_added": ["kw1", "kw2"],
  "ats_score_estimate": <integer 0-100>,
  "sections_reordered": <true|false>
}}"""
        try:
            return self._json_call(system, user, max_tokens=3000)
        except Exception as e:
            logger.error(f"optimize_resume error: {e}")
            return {"optimized_resume": original_resume, "changes_made": [], "keywords_added": [], "ats_score_estimate": 60, "sections_reordered": False}

    def generate_cover_letter(self, user_profile: dict, job_description: str, company: str, role: str, tone: str = "professional") -> dict:
        name = user_profile.get("name", "Applicant")
        email = user_profile.get("email", "")
        skills = ", ".join(user_profile.get("skills", [])[:10])
        system = (
            "You are a master cover letter writer. Write compelling, personalized letters. "
            "Respond ONLY with valid JSON."
        )
        user = f"""
Write a cover letter.

APPLICANT: {name} ({email})
SKILLS: {skills}
ROLE: {role} at {company}
TONE: {tone}
JOB DESCRIPTION:
{job_description[:2500]}

Return exactly:
{{
  "cover_letter": "<full letter text with \\n for newlines>",
  "subject_line": "<email subject>",
  "key_points": ["point1", "point2", "point3"]
}}"""
        try:
            return self._json_call(system, user, max_tokens=1200)
        except Exception as e:
            logger.error(f"generate_cover_letter error: {e}")
            fallback = f"Dear Hiring Team,\n\nI'm excited to apply for the {role} position at {company}.\n\nBest,\n{name}"
            return {"cover_letter": fallback, "subject_line": f"Application – {role} at {company}", "key_points": []}

    def generate_application_answers(self, questions: list, user_profile: dict, job_info: dict) -> dict:
        system = "You are a job applicant. Answer application questions concisely and professionally. Respond ONLY with valid JSON."
        user = f"""
Answer these application questions for {user_profile.get('name', 'the applicant')}.

QUESTIONS: {json.dumps(questions)}
PROFILE SUMMARY: {json.dumps({k: user_profile.get(k) for k in ['name','skills','years_experience','work_authorization']})}

Return: {{"question_text": "answer", ...}}"""
        try:
            return self._json_call(system, user, max_tokens=800)
        except Exception as e:
            logger.error(f"generate_application_answers error: {e}")
            return {}


claude = ClaudeClient()
