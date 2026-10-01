from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import Optional
import logging
from datetime import datetime

from database.database import get_db
from database.models import Application, Job

router = APIRouter()
logger = logging.getLogger(__name__)


def _app_dict(a: Application) -> dict:
    return {
        "id": a.id, "job_id": a.job_id, "company": a.company or "",
        "role": a.role or "", "job_url": a.job_url,
        "applied_date": a.applied_date.isoformat() if a.applied_date else "",
        "status": a.status or "submitted", "match_score": a.match_score,
        "cover_letter_used": a.cover_letter_used, "resume_version": a.resume_version,
        "notes": a.notes,
        "follow_up_date": a.follow_up_date.isoformat() if a.follow_up_date else None,
        "response_date": a.response_date.isoformat() if a.response_date else None,
    }


@router.get("")
async def list_applications(
    status: Optional[str] = None,
    limit: int = Query(50, le=200), offset: int = 0,
    db: AsyncSession = Depends(get_db),
):
    q = select(Application).order_by(Application.applied_date.desc())
    if status: q = q.where(Application.status == status)
    total = (await db.execute(select(func.count()).select_from(Application))).scalar()
    apps = (await db.execute(q.offset(offset).limit(limit))).scalars().all()
    return {"applications": [_app_dict(a) for a in apps], "total": total}


@router.get("/stats")
async def dashboard_stats(db: AsyncSession = Depends(get_db)):
    # Job counts
    total_jobs = (await db.execute(select(func.count()).select_from(Job))).scalar() or 0
    jobs_matched = (await db.execute(select(func.count()).select_from(Job).where(Job.match_score >= 60))).scalar() or 0
    jobs_applied = (await db.execute(select(func.count()).select_from(Job).where(Job.status == "applied"))).scalar() or 0
    avg_score_row = (await db.execute(select(func.avg(Job.match_score)).where(Job.match_score != None))).scalar()
    avg_score = round(float(avg_score_row), 1) if avg_score_row else 0.0

    # Today's discovered
    today = datetime.utcnow().date()
    jobs_today = (await db.execute(
        select(func.count()).select_from(Job).where(func.date(Job.discovered_at) == today)
    )).scalar() or 0

    # Source breakdown
    source_rows = (await db.execute(
        select(Job.source, func.count(Job.id)).group_by(Job.source)
    )).all()
    top_sources = [{"source": r[0] or "other", "count": r[1]} for r in source_rows]

    # Application status breakdown
    status_rows = (await db.execute(
        select(Application.status, func.count(Application.id)).group_by(Application.status)
    )).all()
    apps_by_status = [{"status": r[0], "count": r[1]} for r in status_rows]

    # Recent applications
    recent_apps = (await db.execute(
        select(Application).order_by(Application.applied_date.desc()).limit(5)
    )).scalars().all()

    # Top jobs by score
    top_jobs = (await db.execute(
        select(Job).where(Job.match_score != None).order_by(Job.match_score.desc()).limit(5)
    )).scalars().all()

    return {
        "total_jobs": total_jobs,
        "jobs_discovered_today": jobs_today,
        "jobs_matched": jobs_matched,
        "jobs_applied": jobs_applied,
        "avg_match_score": avg_score,
        "top_sources": top_sources,
        "applications_by_status": apps_by_status,
        "recent_applications": [_app_dict(a) for a in recent_apps],
        "top_jobs": [_top_job(j) for j in top_jobs],
    }


def _top_job(j: Job) -> dict:
    return {
        "id": j.id, "company": j.company, "role": j.role,
        "location": j.location, "source": j.source or "other",
        "match_score": j.match_score, "status": j.status, "is_remote": j.is_remote or False,
    }


@router.get("/{app_id}")
async def get_application(app_id: int, db: AsyncSession = Depends(get_db)):
    app = await db.get(Application, app_id)
    if not app: raise HTTPException(404, "Application not found")
    return _app_dict(app)


@router.patch("/{app_id}")
async def update_application(app_id: int, body: dict, db: AsyncSession = Depends(get_db)):
    app = await db.get(Application, app_id)
    if not app: raise HTTPException(404, "Application not found")
    if "status" in body: app.status = body["status"]
    if "notes" in body: app.notes = body["notes"]
    await db.commit(); await db.refresh(app)
    return _app_dict(app)
