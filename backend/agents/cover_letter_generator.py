import logging
from typing import Dict
from services.claude_client import claude

logger = logging.getLogger(__name__)


class CoverLetterGenerator:
    def generate(self, resume_text: str, job: Dict, user_name: str, user_email: str) -> str:
        jd = job.get("job_description") or f"{job.get('role','')} position at {job.get('company','')}"
        skills = []
        # Extract skills from resume text (simple heuristic)
        if resume_text:
            for line in resume_text.split("\n"):
                if "Skills" in line or "SKILLS" in line:
                    continue
                if ":" in line and any(kw in line for kw in ["Languages","iOS","Frontend","Backend","AI","Cloud"]):
                    skills.extend([s.strip() for s in line.split(":")[-1].split(",")][:5])
        profile = {"name": user_name, "email": user_email, "skills": skills[:10]}
        try:
            result = claude.generate_cover_letter(
                user_profile=profile, job_description=jd,
                company=job.get("company", ""), role=job.get("role", ""),
            )
            return result.get("cover_letter", self._fallback(user_name, user_email, job))
        except Exception as e:
            logger.error(f"Cover letter error: {e}")
            return self._fallback(user_name, user_email, job)

    def _fallback(self, name: str, email: str, job: Dict) -> str:
        return (
            f"Dear Hiring Team,\n\n"
            f"I'm excited to apply for the {job.get('role', 'Software Engineer')} position at "
            f"{job.get('company', 'your company')}. My background in software engineering, AI systems, "
            f"and mobile development makes me a strong candidate for this role.\n\n"
            f"I'd welcome the opportunity to discuss how my experience aligns with your needs.\n\n"
            f"Best regards,\n{name}\n{email}"
        )
