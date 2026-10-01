import logging
from typing import Dict
from services.claude_client import claude

logger = logging.getLogger(__name__)

DEFAULT_PROFILE = {
    "name": "Roszhan Raj",
    "email": "roszhan@email.com",
    "skills": ["Swift", "SwiftUI", "Python", "JavaScript", "TypeScript", "React", "Node.js", "FastAPI", "AWS", "MongoDB"],
    "years_experience": 2,
    "work_authorization": "US Citizen / Green Card",
    "requires_sponsorship": False,
}


class JobMatcher:
    def __init__(self, min_score: int = 60):
        self.min_score = min_score

    def analyze(self, job: Dict, resume_text: str) -> Dict:
        jd = job.get("job_description") or f"{job.get('role','')} at {job.get('company','')}. Location: {job.get('location','')}."
        try:
            result = claude.match_job(
                resume_text=resume_text or "No resume provided.",
                job_description=jd,
                job_title=job.get("role", ""),
                company=job.get("company", ""),
            )
            return {
                **job,
                "match_score": result.get("match_score", 0),
                "match_reasons": result.get("reasons", []),
                "matching_skills": result.get("matching_skills", []),
                "missing_skills": result.get("missing_skills", []),
                "verdict": result.get("verdict", "unknown"),
                "recommendation": result.get("recommendation", ""),
            }
        except Exception as e:
            logger.error(f"Job matching error for {job.get('company')}: {e}")
            return {**job, "match_score": 0, "match_reasons": [], "verdict": "error"}

    def batch_analyze(self, jobs: list, resume_text: str) -> list:
        results = [self.analyze(job, resume_text) for job in jobs]
        results.sort(key=lambda x: x.get("match_score", 0), reverse=True)
        return results
