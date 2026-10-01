from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from contextlib import asynccontextmanager
import logging

from database.database import init_db
from routes.jobs import router as jobs_router
from routes.applications import router as applications_router
from routes.profile import router as profile_router
from routes.pipeline import router as pipeline_router

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
logger = logging.getLogger(__name__)

scheduler = AsyncIOScheduler()

@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    scheduler.add_job(_daily_search, "cron", hour=8, minute=0, id="daily_search")
    scheduler.start()
    logger.info("✅ AutoApply AI started")
    yield
    scheduler.shutdown()
    logger.info("AutoApply AI shutting down")

async def _daily_search():
    logger.info("⏰ Daily job search triggered")
    from agents.job_scraper import JobScraper
    scraper = JobScraper()
    await scraper.run_all()

app = FastAPI(
    title="AutoApply AI",
    description="AI-powered job application agent",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(jobs_router, prefix="/api/jobs", tags=["jobs"])
app.include_router(applications_router, prefix="/api/applications", tags=["applications"])
app.include_router(profile_router, prefix="/api/profile", tags=["profile"])
app.include_router(pipeline_router, prefix="/api/pipeline", tags=["pipeline"])

@app.get("/")
async def root():
    return {"service": "AutoApply AI", "status": "running", "version": "1.0.0"}

@app.get("/api/health")
async def health():
    return {"status": "ok"}
