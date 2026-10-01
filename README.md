# AutoApply AI 🤖

An AI-powered job application agent that automatically discovers jobs, scores them against your
profile, generates tailored resumes and cover letters, and submits applications — all hands-free.

---

## Architecture

```
autoapply-ai/
├── backend/                      # Python FastAPI
│   ├── main.py                   # App entry, CORS, scheduler
│   ├── agents/
│   │   ├── job_scraper.py        # Playwright scraper (LinkedIn, Indeed, Wellfound)
│   │   ├── job_matcher.py        # Claude-powered resume↔job matching
│   │   ├── resume_optimizer.py   # Claude ATS resume tailoring
│   │   ├── cover_letter_generator.py  # Claude cover letter writer
│   │   └── application_bot.py    # Playwright form filler + submitter
│   ├── database/
│   │   ├── models.py             # SQLAlchemy ORM (Job, Application, UserProfile)
│   │   └── database.py           # Async PostgreSQL engine
│   ├── routes/
│   │   ├── jobs.py               # /api/jobs — CRUD + AI actions
│   │   ├── applications.py       # /api/applications — tracking + dashboard stats
│   │   ├── profile.py            # /api/profile — user profile CRUD
│   │   └── pipeline.py           # /api/pipeline — full agent pipeline
│   ├── services/
│   │   └── claude_client.py      # Anthropic API wrapper
│   ├── requirements.txt
│   └── .env.example
│
├── frontend/                     # Next.js 14 + TypeScript + Tailwind
│   ├── app/
│   │   ├── dashboard/page.tsx    # Command center with live stats
│   │   ├── jobs/page.tsx         # Filterable job board
│   │   ├── applications/page.tsx # Application tracker with kanban status
│   │   └── profile/page.tsx      # Profile + resume editor
│   ├── components/
│   │   ├── Sidebar.tsx
│   │   ├── StatCard.tsx
│   │   ├── JobDetailModal.tsx     # AI actions: match, optimize, apply
│   │   ├── RunPipelineModal.tsx   # Pipeline config + launcher
│   │   ├── MatchScoreBadge.tsx
│   │   ├── StatusBadge.tsx
│   │   └── SourceBadge.tsx
│   ├── lib/api.ts                 # Typed API client (axios)
│   └── types/index.ts
│
└── README.md
```

---

## Prerequisites

- **Python 3.11+**
- **Node.js 20+**
- **PostgreSQL 15+** (local or cloud)
- **Anthropic API key** — [get one here](https://console.anthropic.com)

---

## Setup

### 1. Clone and configure environment

```bash
git clone <repo> autoapply-ai
cd autoapply-ai
```

### 2. Backend setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Install Playwright browsers
playwright install chromium

# Configure environment
cp .env.example .env
```

Edit `.env` with your values:

```env
ANTHROPIC_API_KEY=sk-ant-your-key-here
DATABASE_URL=postgresql+asyncpg://postgres:password@localhost:5432/autoapply

USER_NAME=Your Full Name
USER_EMAIL=you@email.com
USER_PHONE=+1 (555) 123-4567
USER_LINKEDIN=https://linkedin.com/in/yourprofile
USER_GITHUB=https://github.com/yourusername
USER_WEBSITE=https://yourportfolio.com
```

### 3. Create PostgreSQL database

```bash
psql -U postgres -c "CREATE DATABASE autoapply;"
```

Tables are auto-created when the server starts.

### 4. Start backend

```bash
cd backend
uvicorn main:app --reload --port 8000
```

API docs available at: http://localhost:8000/docs

### 5. Frontend setup

```bash
cd frontend
npm install
npm run dev
```

Dashboard at: http://localhost:3000

---

## Usage

### Option A: Dashboard UI

1. Open http://localhost:3000
2. Go to **Profile** → paste your resume, fill in your details, set target roles
3. Go to **Dashboard** → click **Scrape Jobs** to discover new listings
4. Click **Run Agent** → configure the pipeline, toggle Dry Run, click Run
5. Watch the **Jobs** and **Applications** tabs populate

### Option B: API directly

```bash
# Scrape jobs
curl -X POST http://localhost:8000/api/jobs/scrape

# Score all unmatched jobs with Claude
curl -X POST http://localhost:8000/api/jobs/match-all?limit=20

# Generate tailored resume for job ID 1
curl -X POST http://localhost:8000/api/jobs/1/optimize-resume

# Generate cover letter
curl -X POST http://localhost:8000/api/jobs/1/cover-letter

# Apply (dry run — no actual submission)
curl -X POST "http://localhost:8000/api/jobs/1/apply?dry_run=true"

# Apply for real
curl -X POST "http://localhost:8000/api/jobs/1/apply?dry_run=false"

# Run full pipeline (dry run)
curl -X POST http://localhost:8000/api/pipeline/run \
  -H "Content-Type: application/json" \
  -d '{"dry_run": true, "max_applications": 5, "min_match_score": 70, "scrape_first": true}'
```

---

## API Reference

### Jobs

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/jobs` | List jobs (filter by status, source, min_score) |
| GET | `/api/jobs/{id}` | Get single job |
| POST | `/api/jobs/scrape` | Trigger scraping (background task) |
| POST | `/api/jobs/match-all` | Score all unmatched jobs with Claude |
| POST | `/api/jobs/{id}/match` | Score one job |
| POST | `/api/jobs/{id}/optimize-resume` | Generate tailored resume |
| POST | `/api/jobs/{id}/cover-letter` | Generate cover letter |
| POST | `/api/jobs/{id}/apply` | Auto-apply via Playwright |
| DELETE | `/api/jobs/{id}` | Delete job |

### Applications

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/applications` | List applications |
| GET | `/api/applications/stats` | Dashboard stats |
| GET | `/api/applications/{id}` | Get application |
| PATCH | `/api/applications/{id}` | Update status/notes |

### Profile

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/profile` | Get user profile |
| PUT | `/api/profile` | Update profile + resume |

### Pipeline

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/pipeline/run` | Full agent pipeline |

---

## AI Prompts

### Job Matching
Claude receives the job description and resume and returns a JSON match score (0–100) with reasons,
matching skills, missing skills, and a recommendation.

### Resume Optimization
Claude rewrites the resume to mirror the job description's language and keywords, reorders sections
by relevance, and maximizes ATS score — without fabricating any experience.

### Cover Letter
Claude writes a 3-4 paragraph professional cover letter with a company-specific hook, 2-3 concrete
experience connections, and a confident close.

---

## Supported Application Platforms

| Platform | Status |
|----------|--------|
| Greenhouse | ✅ Full form fill + submit |
| Lever | ✅ Full form fill + submit |
| LinkedIn Easy Apply | ✅ Multi-step flow |
| Workday | ⚠️ Generic fallback |
| Ashby | ⚠️ Generic fallback |
| Custom / Generic | ✅ Heuristic form fill |

---

## Scheduling

The backend runs a daily job scrape at **8:00 AM UTC** via APScheduler.
To adjust the schedule, edit `main.py`:

```python
scheduler.add_job(_daily_search, "cron", hour=8, minute=0)
```

---

## Safety

- **Dry run mode is ON by default** — no applications are submitted unless you explicitly toggle it off
- Match score threshold defaults to **70%** — only strong matches are applied to
- Max applications per run defaults to **5** — configurable in the pipeline modal

---

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | Next.js 14, TypeScript, Tailwind CSS, React Query |
| Backend | Python 3.11, FastAPI, SQLAlchemy (async) |
| Database | PostgreSQL 15 |
| AI | Anthropic Claude (claude-opus-4-5) |
| Automation | Playwright (Chromium) |
| Scheduler | APScheduler |

---

## License

MIT
