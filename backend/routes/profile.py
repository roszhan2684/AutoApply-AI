from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional, List
import logging

from database.database import get_db
from database.models import UserProfile

router = APIRouter()
logger = logging.getLogger(__name__)


class ProfileUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    linkedin_url: Optional[str] = None
    github_url: Optional[str] = None
    portfolio_url: Optional[str] = None
    resume_text: Optional[str] = None
    target_roles: Optional[List[str]] = None
    target_locations: Optional[List[str]] = None
    min_salary: Optional[float] = None
    work_authorization: Optional[str] = None
    requires_sponsorship: Optional[bool] = None
    skills: Optional[List[str]] = None
    years_experience: Optional[int] = None


def _profile_dict(p: UserProfile) -> dict:
    return {
        "id": p.id, "name": p.name, "email": p.email, "phone": p.phone,
        "linkedin_url": p.linkedin_url, "github_url": p.github_url,
        "portfolio_url": p.portfolio_url, "resume_text": p.resume_text,
        "target_roles": p.target_roles or [], "target_locations": p.target_locations or [],
        "min_salary": p.min_salary, "work_authorization": p.work_authorization,
        "requires_sponsorship": p.requires_sponsorship, "skills": p.skills or [],
        "years_experience": p.years_experience,
    }


@router.get("")
async def get_profile(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(UserProfile).limit(1))
    profile = result.scalar()
    if not profile:
        # Return empty profile scaffold
        return {
            "id": None, "name": "", "email": "", "phone": "",
            "linkedin_url": "", "github_url": "", "portfolio_url": "",
            "resume_text": "", "target_roles": [], "target_locations": [],
            "min_salary": None, "work_authorization": "US Citizen / Green Card",
            "requires_sponsorship": False, "skills": [], "years_experience": 0,
        }
    return _profile_dict(profile)


@router.put("")
async def update_profile(body: ProfileUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(UserProfile).limit(1))
    profile = result.scalar()

    if not profile:
        profile = UserProfile()
        db.add(profile)

    for field, value in body.model_dump(exclude_none=True).items():
        setattr(profile, field, value)

    await db.commit()
    await db.refresh(profile)
    return _profile_dict(profile)
