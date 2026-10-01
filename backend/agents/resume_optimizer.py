import logging
from pathlib import Path
from typing import Dict
from services.claude_client import claude

logger = logging.getLogger(__name__)

MASTER_RESUME = """
ROSZHAN RAJ
roszhan@email.com | (555) 123-4567 | linkedin.com/in/roszhanraj | github.com/roszhanraj
Fullerton, CA | roszhanraj.dev

SUMMARY
M.S. Computer Science candidate (CSUF, 3.95 GPA) with hands-on experience building iOS apps,
AI systems, and full-stack web applications. Founder of NetSwipe (SwiftUI networking app).
Strong background in ML/AI, cloud services (AWS), and modern frontend/backend frameworks.

EDUCATION
M.S. Computer Science — California State University, Fullerton
Expected May 2026 | GPA: 3.95/4.0

B.S. Computer Science — California State University, Fullerton
Graduated May 2024

EXPERIENCE
Software Engineer Intern — INSAIT Solutions LLC (Remote)
March 2026 – Present
- Building AI-powered tele-consultation demos using AWS Lambda, API Gateway, and Claude API
- Developing R&D prototypes in Python FastAPI with real-time video integration
- Delivered Dental Tele-Consult Demo reducing setup time by 40%

Founder & Technical Lead — NetSwipe
September 2025 – Present
- Architected and built SwiftUI iOS app from scratch with real-time OTP auth and swipe UX
- Designed Node.js/Express + MongoDB backend with Gmail-based email verification
- Led end-to-end product development: design, development, and deployment

PROJECTS
AI Clinical Copilot (2026)
- Multi-page clinical management system with mock AWS transcription, S3, and Bedrock/Claude
- Built with vanilla JS, Python FastAPI; simulates real-world healthcare AI workflow

AI Job Copilot Chrome Extension (2026)
- Chrome extension that auto-fills job applications using OpenAI GPT + resume parsing
- Handles radio buttons, dropdowns, checkboxes, and file upload via DataTransfer API

CampusWay — AR/VR Navigation (2025)
- Unity + Blender AR navigation app for CSUF campus with team of 4

AdMind — Cal Hacks 12.0 (2024)
- AI-powered ad emotion analysis using Claude 3, Bright Data, Chroma DB

SKILLS
Languages: Swift, Python, JavaScript/TypeScript, Java, C++, SQL
iOS/Mobile: SwiftUI, UIKit, React Native, Xcode
Frontend: React, Next.js, TailwindCSS
Backend: Node.js, FastAPI, Express, REST APIs
AI/ML: TensorFlow, PyTorch, Claude API, OpenAI API
Cloud: AWS (Lambda, S3, API Gateway, Bedrock), Firebase, PostgreSQL, MongoDB
Tools: Git, Docker, Figma, Blender, Unity, Playwright
"""


class ResumeOptimizer:
    def __init__(self, master_resume: str = None):
        self.master_resume = master_resume or MASTER_RESUME
        Path("resumes/tailored").mkdir(parents=True, exist_ok=True)

    def optimize(self, resume_text: str, job: Dict) -> str:
        source = resume_text if resume_text and len(resume_text) > 100 else self.master_resume
        jd = job.get("job_description") or f"{job.get('role','')} at {job.get('company','')}"
        try:
            result = claude.optimize_resume(
                original_resume=source, job_description=jd,
                company=job.get("company", ""), role=job.get("role", ""),
            )
            return result.get("optimized_resume", source)
        except Exception as e:
            logger.error(f"Resume optimization error: {e}")
            return source

    def get_master_resume(self) -> str:
        return self.master_resume

    def update_master_resume(self, content: str):
        self.master_resume = content
