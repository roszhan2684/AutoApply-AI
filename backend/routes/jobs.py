from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from typing import Optional
import logging

from database.database import get_db
from database.models import Job, Application, UserProfile

router = APIRouter()
logger = logging.getLogger(__name__)


# ── Helpers ───────────────────────────────────────────────────────────────────

def _job_dict(j: Job) -> dict:
    return {
        "id": j.id, "company": j.company, "role": j.role, "location": j.location,
        "job_description": j.job_description, "apply_link": j.apply_link,
        "salary_min": j.salary_min, "salary_max": j.salary_max, "salary_raw": j.salary_raw,
        "source": j.source or "other", "match_score": j.match_score,
        "match_reasons": j.match_reasons, "is_remote": j.is_remote or False,
        "posted_date": j.posted_date, "status": j.status,
        "discovered_at": j.discovered_at.isoformat() if j.discovered_at else None,
        "tailored_resume": j.tailored_resume, "cover_letter": j.cover_letter,
    }

async def _get_profile(db):
    r = await db.execute(select(UserProfile).limit(1))
    return r.scalar()


# ── List / Get ────────────────────────────────────────────────────────────────

@router.get("")
async def list_jobs(
    status: Optional[str] = None, source: Optional[str] = None,
    min_score: Optional[float] = None, limit: int = Query(50, le=200), offset: int = 0,
    db: AsyncSession = Depends(get_db),
):
    filters = []
    if status: filters.append(Job.status == status)
    if source: filters.append(Job.source == source)
    if min_score is not None: filters.append(Job.match_score >= min_score)

    q = select(Job).order_by(Job.match_score.desc().nullslast(), Job.discovered_at.desc())
    if filters: q = q.where(and_(*filters))

    count_q = select(func.count()).select_from(Job)
    if filters: count_q = count_q.where(and_(*filters))

    total = (await db.execute(count_q)).scalar()
    jobs = (await db.execute(q.offset(offset).limit(limit))).scalars().all()
    return {"jobs": [_job_dict(j) for j in jobs], "total": total}


@router.get("/{job_id}")
async def get_job(job_id: int, db: AsyncSession = Depends(get_db)):
    job = await db.get(Job, job_id)
    if not job: raise HTTPException(404, "Job not found")
    return _job_dict(job)


# ── Scrape ────────────────────────────────────────────────────────────────────

@router.post("/scrape")
async def scrape_jobs(background_tasks: BackgroundTasks):
    background_tasks.add_task(_scrape_and_save)
    return {"message": "Scraping started in background", "scraped": 0, "saved": 0}

async def _scrape_and_save():
    from database.database import AsyncSessionLocal
    from agents.job_scraper import JobScraper
    scraper = JobScraper()
    jobs = await scraper.run_all()
    saved = 0
    async with AsyncSessionLocal() as session:
        for jd in jobs:
            ex = await session.execute(
                select(Job).where(Job.company == jd["company"], Job.role == jd["role"], Job.source == jd.get("source"))
            )
            if ex.scalar(): continue
            allowed = {c.key for c in Job.__table__.columns}
            session.add(Job(**{k: v for k, v in jd.items() if k in allowed}))
            saved += 1
        await session.commit()
    logger.info(f"Scrape done: {len(jobs)} found, {saved} saved")


# ── AI Actions ────────────────────────────────────────────────────────────────

@router.post("/{job_id}/match")
async def match_job(job_id: int, db: AsyncSession = Depends(get_db)):
    job = await db.get(Job, job_id)
    if not job: raise HTTPException(404, "Job not found")
    profile = await _get_profile(db)
    from agents.job_matcher import JobMatcher
    result = JobMatcher().analyze(_job_dict(job), profile.resume_text if profile else "")
    job.match_score = result.get("match_score")
    job.match_reasons = result.get("match_reasons", [])
    if (job.match_score or 0) >= 60: job.status = "matched"
    await db.commit(); await db.refresh(job)
    return _job_dict(job)


@router.post("/match-all")
async def match_all_jobs(limit: int = 20, db: AsyncSession = Depends(get_db)):
    jobs = (await db.execute(select(Job).where(Job.match_score == None).limit(limit))).scalars().all()
    profile = await _get_profile(db)
    from agents.job_matcher import JobMatcher
    matcher = JobMatcher(); count = 0
    for job in jobs:
        try:
            r = matcher.analyze(_job_dict(job), profile.resume_text if profile else "")
            job.match_score = r.get("match_score")
            job.match_reasons = r.get("match_reasons", [])
            if (job.match_score or 0) >= 60: job.status = "matched"
            count += 1
        except Exception as e:
            logger.error(f"Match error {job.company}: {e}")
    await db.commit()
    return {"processed": count}


@router.post("/{job_id}/optimize-resume")
async def optimize_resume(job_id: int, db: AsyncSession = Depends(get_db)):
    job = await db.get(Job, job_id)
    if not job: raise HTTPException(404, "Job not found")
    profile = await _get_profile(db)
    from agents.resume_optimizer import ResumeOptimizer
    tailored = ResumeOptimizer().optimize(profile.resume_text if profile else "", _job_dict(job))
    job.tailored_resume = tailored
    await db.commit()
    return {"tailored_resume": tailored}


@router.post("/{job_id}/cover-letter")
async def generate_cover_letter(job_id: int, db: AsyncSession = Depends(get_db)):
    job = await db.get(Job, job_id)
    if not job: raise HTTPException(404, "Job not found")
    profile = await _get_profile(db)
    from agents.cover_letter_generator import CoverLetterGenerator
    letter = CoverLetterGenerator().generate(
        resume_text=profile.resume_text if profile else "",
        job=_job_dict(job),
        user_name=profile.name if profile else "Applicant",
        user_email=profile.email if profile else "",
    )
    job.cover_letter = letter
    await db.commit()
    return {"cover_letter": letter}


@router.post("/{job_id}/apply")
async def apply_to_job(job_id: int, dry_run: bool = True, db: AsyncSession = Depends(get_db)):
    job = await db.get(Job, job_id)
    if not job: raise HTTPException(404, "Job not found")
    from agents.application_bot import ApplicationBot
    result = await ApplicationBot().apply(job=_job_dict(job), cover_letter=job.cover_letter, dry_run=dry_run)
    if result.get("success") and not dry_run:
        job.status = "applied"
        db.add(Application(
            job_id=job.id, company=job.company, role=job.role,
            job_url=job.apply_link or "", status="submitted",
            match_score=job.match_score, cover_letter_used=job.cover_letter,
        ))
        await db.commit()
    return result


@router.delete("/{job_id}")
async def delete_job(job_id: int, db: AsyncSession = Depends(get_db)):
    job = await db.get(Job, job_id)
    if not job: raise HTTPException(404, "Job not found")
    await db.delete(job); await db.commit()
    return {"deleted": True}
