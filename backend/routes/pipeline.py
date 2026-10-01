"""
routes/pipeline.py

Full AutoApply pipeline:
  1. Scrape jobs from LinkedIn / Indeed / Wellfound
  2. Score each job with Claude AI
  3. For qualifying jobs: optimize resume → generate cover letter → auto-apply
  4. Log everything to PostgreSQL
  5. Dashboard reads results live
"""
import asyncio
import logging
from fastapi import APIRouter, BackgroundTasks, Depends
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database.database import get_db, AsyncSessionLocal
from database.models import Job, Application, UserProfile

router = APIRouter()
logger = logging.getLogger(__name__)


# ── Pydantic schemas ──────────────────────────────────────────────────────────

class PipelineConfig(BaseModel):
    dry_run: bool = True
    max_applications: int = 5
    min_match_score: float = 70.0
    scrape_first: bool = True


# ── Background task ───────────────────────────────────────────────────────────

async def _run_pipeline(config: PipelineConfig):
    """Full pipeline in a background task with its own DB session."""
    from agents.job_scraper import JobScraper
    from agents.job_matcher import JobMatcher
    from agents.resume_optimizer import ResumeOptimizer
    from agents.cover_letter_generator import CoverLetterGenerator
    from agents.application_bot import ApplicationBot

    logger.info("🚀 Pipeline started | dry_run=%s max=%d min_score=%.0f",
                config.dry_run, config.max_applications, config.min_match_score)

    # ── 1. Fetch user profile & resume ───────────────────────────────────────
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(UserProfile).limit(1))
        profile = result.scalar()
        resume_text = profile.resume_text if profile else ""
        user_name = profile.name if profile else "Applicant"
        user_email = profile.email if profile else ""

    # ── 2. Scrape new jobs ───────────────────────────────────────────────────
    scraped_count = 0
    if config.scrape_first:
        try:
            scraper = JobScraper()
            raw_jobs = await scraper.run_all()
            scraped_count = len(raw_jobs)

            async with AsyncSessionLocal() as session:
                saved = 0
                for jd in raw_jobs:
                    ex = await session.execute(
                        select(Job).where(
                            Job.company == jd["company"],
                            Job.role == jd["role"],
                            Job.source == jd.get("source"),
                        )
                    )
                    if ex.scalar():
                        continue
                    allowed = {c.key for c in Job.__table__.columns}
                    session.add(Job(**{k: v for k, v in jd.items() if k in allowed}))
                    saved += 1
                await session.commit()
                logger.info("Scraped %d, saved %d new jobs", scraped_count, saved)
        except Exception as e:
            logger.error("Scraping failed: %s", e)

    # ── 3. Load unscored jobs ────────────────────────────────────────────────
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(Job).where(Job.match_score == None).limit(100)
        )
        unscored = result.scalars().all()
        jobs_to_score = [_job_dict(j) for j in unscored]

    # ── 4. Score with Claude ─────────────────────────────────────────────────
    matcher = JobMatcher(min_score=int(config.min_match_score))
    scored = matcher.batch_analyze(jobs_to_score, resume_text)

    # Persist scores
    async with AsyncSessionLocal() as session:
        for sj in scored:
            db_job = await session.get(Job, sj["id"])
            if db_job:
                db_job.match_score = sj.get("match_score", 0)
                db_job.match_reasons = sj.get("match_reasons", [])
                if (db_job.match_score or 0) >= config.min_match_score:
                    db_job.status = "matched"
        await session.commit()

    # ── 5. Filter qualified jobs ─────────────────────────────────────────────
    qualified = [j for j in scored if (j.get("match_score") or 0) >= config.min_match_score]
    qualified = qualified[:config.max_applications]
    logger.info("%d jobs qualified (score ≥ %.0f)", len(qualified), config.min_match_score)

    # ── 6. Optimize resume + cover letter + apply ────────────────────────────
    optimizer = ResumeOptimizer()
    cover_gen = CoverLetterGenerator()
    bot = ApplicationBot()
    succeeded = 0
    errors = []

    for job in qualified:
        job_id = job.get("id")
        try:
            # Generate tailored resume
            tailored = optimizer.optimize(resume_text, job)

            # Generate cover letter
            letter = cover_gen.generate(
                resume_text=resume_text, job=job,
                user_name=user_name, user_email=user_email,
            )

            # Persist to job record
            async with AsyncSessionLocal() as session:
                db_job = await session.get(Job, job_id)
                if db_job:
                    db_job.tailored_resume = tailored
                    db_job.cover_letter = letter
                await session.commit()

            # Apply via Playwright
            result = await bot.apply(job=job, cover_letter=letter, dry_run=config.dry_run)

            # Log application
            async with AsyncSessionLocal() as session:
                db_job = await session.get(Job, job_id)
                if db_job and result.get("success"):
                    db_job.status = "applied" if not config.dry_run else db_job.status

                session.add(Application(
                    job_id=job_id,
                    company=job.get("company", ""),
                    role=job.get("role", ""),
                    job_url=job.get("apply_link", ""),
                    status="submitted" if result.get("success") and not config.dry_run else (
                        "dry_run" if config.dry_run else "error"
                    ),
                    match_score=job.get("match_score"),
                    cover_letter_used=letter,
                    resume_version="tailored_v1",
                    notes=result.get("error") if not result.get("success") else None,
                ))
                await session.commit()

            if result.get("success"):
                succeeded += 1
                logger.info("✅ %s Applied to %s @ %s",
                            "[DRY]" if config.dry_run else "",
                            job.get("role"), job.get("company"))
            else:
                errors.append(f"{job.get('company')}: {result.get('error', 'unknown error')}")
                logger.warning("❌ Failed: %s @ %s — %s",
                               job.get("role"), job.get("company"), result.get("error"))

        except Exception as e:
            errors.append(f"{job.get('company')}: {str(e)}")
            logger.error("Pipeline error for %s: %s", job.get("company"), e)

    logger.info(
        "✅ Pipeline complete | scraped=%d scored=%d qualified=%d succeeded=%d errors=%d",
        scraped_count, len(scored), len(qualified), succeeded, len(errors),
    )
    return {
        "jobs_scraped": scraped_count,
        "jobs_scored": len(scored),
        "jobs_qualified": len(qualified),
        "applications_attempted": len(qualified),
        "applications_succeeded": succeeded,
        "errors": errors,
    }


def _job_dict(j: Job) -> dict:
    return {
        "id": j.id, "company": j.company, "role": j.role,
        "location": j.location, "job_description": j.job_description,
        "apply_link": j.apply_link, "source": j.source or "other",
        "match_score": j.match_score, "salary_raw": j.salary_raw,
    }


# ── Routes ────────────────────────────────────────────────────────────────────

@router.post("/run")
async def run_pipeline(config: PipelineConfig, background_tasks: BackgroundTasks):
    """Kick off the full pipeline in the background."""
    background_tasks.add_task(_run_pipeline, config)
    return {
        "message": "Pipeline started in background",
        "dry_run": config.dry_run,
        "max_applications": config.max_applications,
        "min_match_score": config.min_match_score,
    }


@router.post("/run-sync")
async def run_pipeline_sync(config: PipelineConfig):
    """Run pipeline synchronously (for testing). Returns full result."""
    result = await _run_pipeline(config)
    return result
