from sqlalchemy import Column, Integer, String, Float, DateTime, Text, Boolean, JSON
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime

Base = declarative_base()


class Job(Base):
    __tablename__ = "jobs"

    id = Column(Integer, primary_key=True, index=True)
    company = Column(String(255), nullable=False)
    role = Column(String(255), nullable=False)
    location = Column(String(255))
    job_description = Column(Text)
    apply_link = Column(String(1024))
    salary_min = Column(Float, nullable=True)
    salary_max = Column(Float, nullable=True)
    salary_raw = Column(String(255), nullable=True)
    source = Column(String(100))  # linkedin, indeed, wellfound, etc.
    match_score = Column(Float, nullable=True)
    match_reasons = Column(JSON, nullable=True)
    is_remote = Column(Boolean, default=False)
    posted_date = Column(String(100), nullable=True)
    discovered_at = Column(DateTime, default=datetime.utcnow)
    status = Column(String(50), default="discovered")  # discovered, matched, applied, rejected
    tailored_resume = Column(Text, nullable=True)
    cover_letter = Column(Text, nullable=True)


class Application(Base):
    __tablename__ = "applications"

    id = Column(Integer, primary_key=True, index=True)
    job_id = Column(Integer, nullable=True)
    company = Column(String(255), nullable=False)
    role = Column(String(255), nullable=False)
    job_url = Column(String(1024))
    applied_date = Column(DateTime, default=datetime.utcnow)
    status = Column(String(50), default="submitted")  # submitted, viewed, interview, offer, rejected
    match_score = Column(Float, nullable=True)
    cover_letter_used = Column(Text, nullable=True)
    resume_version = Column(String(100), nullable=True)
    notes = Column(Text, nullable=True)
    follow_up_date = Column(DateTime, nullable=True)
    response_date = Column(DateTime, nullable=True)


class UserProfile(Base):
    __tablename__ = "user_profiles"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255))
    email = Column(String(255))
    phone = Column(String(50))
    linkedin_url = Column(String(512), nullable=True)
    github_url = Column(String(512), nullable=True)
    portfolio_url = Column(String(512), nullable=True)
    resume_text = Column(Text)
    target_roles = Column(JSON)  # list of role strings
    target_locations = Column(JSON)  # list of location strings
    min_salary = Column(Float, nullable=True)
    work_authorization = Column(String(100), default="US Citizen")
    requires_sponsorship = Column(Boolean, default=False)
    skills = Column(JSON)
    years_experience = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
