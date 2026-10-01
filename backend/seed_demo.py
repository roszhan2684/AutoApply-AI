#!/usr/bin/env python3
"""
seed_demo.py — Populate the database with realistic demo data.

Usage:
    cd backend
    python seed_demo.py
"""
import asyncio
import os
import sys
from datetime import datetime, timedelta
import random

# Allow running from the backend directory
sys.path.insert(0, os.path.dirname(__file__))
os.environ.setdefault("DATABASE_URL", "postgresql+asyncpg://postgres:postgres@localhost:5432/autoapply")

from database.database import init_db, AsyncSessionLocal
from database.models import Job, Application, UserProfile


DEMO_JOBS = [
    {
        "company": "Anthropic", "role": "Software Engineer, iOS",
        "location": "San Francisco, CA", "is_remote": True,
        "source": "linkedin", "match_score": 94.0,
        "match_reasons": ["SwiftUI expertise matches", "AI/ML background is highly relevant", "Python + FastAPI experience aligns"],
        "salary_raw": "$180,000 – $240,000",
        "status": "matched",
        "job_description": "Build iOS apps and tooling for our AI safety research platform. We use SwiftUI, Python, and AWS. Experience with LLMs a strong plus.",
        "apply_link": "https://boards.greenhouse.io/anthropic/jobs/example",
        "posted_date": "2 days ago",
    },
    {
        "company": "Apple", "role": "iOS Engineer — SwiftUI Platform",
        "location": "Cupertino, CA", "is_remote": False,
        "source": "indeed", "match_score": 88.0,
        "match_reasons": ["5+ years SwiftUI requirement matched", "App Store shipping experience", "Performance optimization skills"],
        "salary_raw": "$170,000 – $230,000",
        "status": "applied",
        "job_description": "Join the SwiftUI team to build next-generation UI frameworks. Deep knowledge of UIKit and SwiftUI required.",
        "apply_link": "https://jobs.apple.com/example",
        "posted_date": "1 day ago",
        "cover_letter": "Dear Hiring Team,\n\nI'm thrilled to apply for the iOS Engineer role at Apple. My work on NetSwipe — a SwiftUI app built from zero — demonstrates exactly the kind of craftsmanship Apple values...",
    },
    {
        "company": "OpenAI", "role": "Full Stack Engineer",
        "location": "Remote", "is_remote": True,
        "source": "wellfound", "match_score": 82.0,
        "match_reasons": ["React + TypeScript experience matches", "AI API integration background", "Node.js + Python fullstack"],
        "salary_raw": "$160,000 – $200,000",
        "status": "matched",
        "job_description": "Build user-facing AI products. Stack: Next.js, TypeScript, Python FastAPI. Strong interest in LLMs required.",
        "apply_link": "https://openai.com/careers/example",
        "posted_date": "3 days ago",
    },
    {
        "company": "Figma", "role": "Mobile Engineer",
        "location": "San Francisco, CA", "is_remote": True,
        "source": "greenhouse", "match_score": 79.0,
        "match_reasons": ["React Native experience", "Cross-platform mobile background", "UI/UX sensibility from Figma work"],
        "salary_raw": "$150,000 – $195,000",
        "status": "matched",
        "job_description": "Build Figma's mobile apps in React Native. You'll own features end-to-end from design spec to App Store.",
        "apply_link": "https://boards.greenhouse.io/figma/example",
        "posted_date": "5 days ago",
    },
    {
        "company": "Stripe", "role": "Backend Engineer — Payments",
        "location": "Remote", "is_remote": True,
        "source": "lever", "match_score": 71.0,
        "match_reasons": ["Python FastAPI background", "API design experience", "PostgreSQL knowledge"],
        "salary_raw": "$155,000 – $210,000",
        "status": "matched",
        "job_description": "Build highly-reliable payment infrastructure. Python, Go, distributed systems. Strong CS fundamentals required.",
        "apply_link": "https://stripe.com/jobs/example",
        "posted_date": "1 week ago",
    },
    {
        "company": "Notion", "role": "AI Engineer",
        "location": "Remote", "is_remote": True,
        "source": "linkedin", "match_score": 85.0,
        "match_reasons": ["Claude API and OpenAI API experience", "Product-minded engineering", "Full stack capabilities"],
        "salary_raw": "$165,000 – $210,000",
        "status": "matched",
        "job_description": "Build AI-powered features in Notion. Work with LLMs, embeddings, RAG pipelines. TypeScript + Python.",
        "apply_link": "https://notion.so/careers/example",
        "posted_date": "4 days ago",
    },
    {
        "company": "Linear", "role": "Software Engineer",
        "location": "Remote", "is_remote": True,
        "source": "wellfound", "match_score": 76.0,
        "match_reasons": ["TypeScript expertise", "React performance experience", "Small-team product mindset"],
        "salary_raw": "$145,000 – $185,000",
        "status": "discovered",
        "job_description": "Build the world's best project management tool. TypeScript, React, GraphQL, Postgres.",
        "apply_link": "https://linear.app/careers/example",
        "posted_date": "6 days ago",
    },
    {
        "company": "Vercel", "role": "Developer Experience Engineer",
        "location": "Remote", "is_remote": True,
        "source": "indeed", "match_score": 68.0,
        "match_reasons": ["Next.js production experience", "TypeScript", "API and SDK design"],
        "salary_raw": "$140,000 – $180,000",
        "status": "discovered",
        "job_description": "Improve the developer experience for Next.js and Vercel's deployment platform. Strong Next.js required.",
        "apply_link": "https://vercel.com/careers/example",
        "posted_date": "3 days ago",
    },
    {
        "company": "Databricks", "role": "ML Infrastructure Engineer",
        "location": "San Francisco, CA", "is_remote": False,
        "source": "greenhouse", "match_score": 63.0,
        "match_reasons": ["PySpark/Hadoop experience", "Python ML background", "Cloud (AWS) experience"],
        "salary_raw": "$175,000 – $225,000",
        "status": "discovered",
        "job_description": "Build ML training and serving infrastructure. Python, Spark, Kubernetes. Strong systems background required.",
        "apply_link": "https://databricks.com/careers/example",
        "posted_date": "1 week ago",
    },
    {
        "company": "Twitch", "role": "iOS Engineer",
        "location": "Remote", "is_remote": True,
        "source": "linkedin", "match_score": 57.0,
        "match_reasons": ["iOS/SwiftUI experience", "Streaming media interest"],
        "salary_raw": "$145,000 – $185,000",
        "status": "discovered",
        "job_description": "Build the Twitch iOS app. SwiftUI, AVFoundation, real-time video. 5+ years iOS required.",
        "apply_link": "https://twitch.tv/jobs/example",
        "posted_date": "2 weeks ago",
    },
]

DEMO_APPLICATIONS = [
    {
        "company": "Apple", "role": "iOS Engineer — SwiftUI Platform",
        "job_url": "https://jobs.apple.com/example",
        "status": "interview",
        "match_score": 88.0,
        "applied_date": datetime.utcnow() - timedelta(days=5),
        "cover_letter_used": "Dear Hiring Team,\n\nI'm thrilled to apply for the iOS Engineer role at Apple...",
        "resume_version": "tailored_v1",
        "notes": "Phone screen scheduled for next Thursday with hiring manager.",
    },
    {
        "company": "Notion", "role": "AI Engineer",
        "job_url": "https://notion.so/careers/example",
        "status": "submitted",
        "match_score": 85.0,
        "applied_date": datetime.utcnow() - timedelta(days=2),
        "cover_letter_used": "Dear Notion Team,\n\nBuilding AI-powered tools is exactly what excites me most...",
        "resume_version": "tailored_v1",
    },
    {
        "company": "OpenAI", "role": "Full Stack Engineer",
        "job_url": "https://openai.com/careers/example",
        "status": "viewed",
        "match_score": 82.0,
        "applied_date": datetime.utcnow() - timedelta(days=4),
        "resume_version": "tailored_v1",
    },
    {
        "company": "Figma", "role": "Mobile Engineer",
        "job_url": "https://boards.greenhouse.io/figma/example",
        "status": "submitted",
        "match_score": 79.0,
        "applied_date": datetime.utcnow() - timedelta(days=1),
        "resume_version": "tailored_v1",
    },
    {
        "company": "Stripe", "role": "Backend Engineer — Payments",
        "job_url": "https://stripe.com/jobs/example",
        "status": "rejected",
        "match_score": 71.0,
        "applied_date": datetime.utcnow() - timedelta(days=9),
        "notes": "Automated rejection after 7 days. Likely needed stronger distributed systems background.",
        "response_date": datetime.utcnow() - timedelta(days=2),
    },
]

DEMO_PROFILE = {
    "name": "Roszhan Raj",
    "email": "roszhan@email.com",
    "phone": "(555) 123-4567",
    "linkedin_url": "https://linkedin.com/in/roszhanraj",
    "github_url": "https://github.com/roszhanraj",
    "portfolio_url": "https://roszhanraj.dev",
    "target_roles": ["Software Engineer", "iOS Engineer", "AI Engineer", "Full Stack Developer", "Mobile Engineer"],
    "target_locations": ["Remote", "Los Angeles, CA", "San Francisco, CA"],
    "work_authorization": "US Citizen / Green Card",
    "requires_sponsorship": False,
    "skills": ["Swift", "SwiftUI", "Python", "JavaScript", "TypeScript", "React", "Next.js",
               "Node.js", "FastAPI", "AWS", "MongoDB", "PostgreSQL", "Claude API", "OpenAI API",
               "TensorFlow", "PyTorch", "Docker", "Git", "Figma"],
    "years_experience": 2,
    "min_salary": 140000,
    "resume_text": """ROSZHAN RAJ
roszhan@email.com | (555) 123-4567 | linkedin.com/in/roszhanraj | github.com/roszhanraj
Fullerton, CA | roszhanraj.dev

SUMMARY
M.S. Computer Science candidate (CSUF, 3.95 GPA) with hands-on experience building iOS apps,
AI systems, and full-stack web applications. Founder of NetSwipe (SwiftUI networking app).
Strong background in ML/AI, cloud services (AWS), and modern frontend/backend frameworks.

EDUCATION
M.S. Computer Science — California State University, Fullerton
Expected May 2026 | GPA: 3.95/4.0

EXPERIENCE
Software Engineer Intern — INSAIT Solutions LLC (Remote) | March 2026 – Present
- Building AI-powered tele-consultation demos using AWS Lambda, API Gateway, and Claude API
- Developing R&D prototypes in Python FastAPI with real-time video integration

Founder & Technical Lead — NetSwipe | September 2025 – Present
- Architected SwiftUI iOS app with OTP auth, swipe UX, match-to-chat flow
- Node.js/Express + MongoDB backend with Gmail-based verification

SKILLS
Swift, SwiftUI, Python, TypeScript, React, Node.js, FastAPI, AWS, MongoDB, PostgreSQL,
Claude API, OpenAI API, TensorFlow, PyTorch, Docker, Playwright, Unity, Figma""",
}


async def seed():
    await init_db()
    async with AsyncSessionLocal() as session:
        # Profile
        from sqlalchemy import select
        existing_profile = (await session.execute(select(UserProfile).limit(1))).scalar()
        if not existing_profile:
            session.add(UserProfile(**DEMO_PROFILE))
            print("✅ Created user profile")
        else:
            print("⏭  Profile already exists")

        # Jobs
        existing_jobs = (await session.execute(select(UserProfile))).scalars().all()
        for i, jd in enumerate(DEMO_JOBS):
            ex = (await session.execute(
                select(Job).where(Job.company == jd["company"], Job.role == jd["role"])
            )).scalar()
            if not ex:
                offset = random.randint(0, 14)
                allowed = {c.key for c in Job.__table__.columns}
                job = Job(**{k: v for k, v in jd.items() if k in allowed})
                job.discovered_at = datetime.utcnow() - timedelta(days=offset)
                session.add(job)
        print(f"✅ Seeded {len(DEMO_JOBS)} demo jobs")

        await session.commit()

        # Applications (link to job IDs)
        jobs_result = await session.execute(select(Job))
        jobs = {j.company: j for j in jobs_result.scalars().all()}

        for ad in DEMO_APPLICATIONS:
            ex = (await session.execute(
                select(Application).where(
                    Application.company == ad["company"], Application.role == ad["role"]
                )
            )).scalar()
            if not ex:
                job = jobs.get(ad["company"])
                allowed = {c.key for c in Application.__table__.columns}
                app = Application(**{k: v for k, v in ad.items() if k in allowed})
                if job:
                    app.job_id = job.id
                session.add(app)
        print(f"✅ Seeded {len(DEMO_APPLICATIONS)} demo applications")

        await session.commit()
        print("\n🎉 Demo data ready! Start the server and visit http://localhost:3000")


if __name__ == "__main__":
    asyncio.run(seed())
