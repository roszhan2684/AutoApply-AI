import asyncio
import logging
from playwright.async_api import async_playwright, Browser
from typing import List, Dict

logger = logging.getLogger(__name__)

TARGET_ROLES = [
    "Software Engineer",
    "iOS Engineer",
    "Full Stack Developer",
    "AI Engineer",
    "Mobile Engineer",
    "Backend Engineer",
]


class JobScraper:
    def __init__(self):
        self.jobs: List[Dict] = []

    async def run_all(self) -> List[Dict]:
        async with async_playwright() as pw:
            browser = await pw.chromium.launch(headless=True)
            try:
                results = await asyncio.gather(
                    self.scrape_linkedin(browser),
                    self.scrape_indeed(browser),
                    self.scrape_wellfound(browser),
                    return_exceptions=True,
                )
                for r in results:
                    if isinstance(r, list):
                        self.jobs.extend(r)
                    elif isinstance(r, Exception):
                        logger.error(f"Scraper error: {r}")
            finally:
                await browser.close()
        logger.info(f"Total jobs scraped: {len(self.jobs)}")
        return self.jobs

    async def scrape_linkedin(self, browser: Browser) -> List[Dict]:
        jobs = []
        page = await browser.new_page()
        await page.set_extra_http_headers({"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"})

        for role in TARGET_ROLES[:3]:
            try:
                q = role.replace(" ", "%20")
                url = f"https://www.linkedin.com/jobs/search?keywords={q}&location=United%20States&f_WT=2&f_TPR=r86400"
                await page.goto(url, wait_until="networkidle", timeout=15000)
                await page.wait_for_timeout(2000)
                cards = await page.query_selector_all(".job-search-card")
                for card in cards[:10]:
                    try:
                        t = await card.query_selector(".job-search-card__title")
                        c = await card.query_selector(".job-search-card__company-name")
                        l = await card.query_selector(".job-search-card__location")
                        a = await card.query_selector("a")
                        title = await t.inner_text() if t else ""
                        company = await c.inner_text() if c else ""
                        location = await l.inner_text() if l else ""
                        href = await a.get_attribute("href") if a else ""
                        if title and company:
                            jobs.append({"company": company.strip(), "role": title.strip(), "location": location.strip(),
                                         "apply_link": href.split("?")[0] if href else "", "source": "linkedin",
                                         "job_description": "", "salary_raw": None})
                    except Exception:
                        pass
                await page.wait_for_timeout(1500)
            except Exception as e:
                logger.error(f"LinkedIn error '{role}': {e}")

        await page.close()
        return jobs

    async def scrape_indeed(self, browser: Browser) -> List[Dict]:
        jobs = []
        page = await browser.new_page()
        await page.set_extra_http_headers({"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"})

        for role in TARGET_ROLES[:3]:
            try:
                q = role.replace(" ", "+")
                url = f"https://www.indeed.com/jobs?q={q}&l=Remote&sort=date&fromage=1"
                await page.goto(url, wait_until="networkidle", timeout=15000)
                await page.wait_for_timeout(2000)
                cards = await page.query_selector_all(".job_seen_beacon")
                for card in cards[:10]:
                    try:
                        t = await card.query_selector("h2.jobTitle span")
                        c = await card.query_selector(".companyName")
                        l = await card.query_selector(".companyLocation")
                        s = await card.query_selector(".salary-snippet")
                        a = await card.query_selector("a[data-jk]")
                        title = await t.inner_text() if t else ""
                        company = await c.inner_text() if c else ""
                        location = await l.inner_text() if l else ""
                        salary = await s.inner_text() if s else None
                        href = await a.get_attribute("href") if a else ""
                        link = f"https://www.indeed.com{href}" if href and href.startswith("/") else href
                        if title and company:
                            jobs.append({"company": company.strip(), "role": title.strip(), "location": location.strip(),
                                         "apply_link": link or "", "source": "indeed",
                                         "job_description": "", "salary_raw": salary})
                    except Exception:
                        pass
                await page.wait_for_timeout(1500)
            except Exception as e:
                logger.error(f"Indeed error '{role}': {e}")

        await page.close()
        return jobs

    async def scrape_wellfound(self, browser: Browser) -> List[Dict]:
        jobs = []
        page = await browser.new_page()
        await page.set_extra_http_headers({"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"})

        try:
            await page.goto("https://wellfound.com/jobs?role=software-engineer&remote=true", wait_until="networkidle", timeout=20000)
            await page.wait_for_timeout(3000)
            cards = await page.query_selector_all('[data-test="StartupResult"]')
            for card in cards[:15]:
                try:
                    t = await card.query_selector("h2")
                    c = await card.query_selector("h3")
                    l = await card.query_selector('[class*="location"]')
                    a = await card.query_selector("a[href]")
                    title = await t.inner_text() if t else ""
                    company = await c.inner_text() if c else ""
                    location = await l.inner_text() if l else "Remote"
                    href = await a.get_attribute("href") if a else ""
                    link = f"https://wellfound.com{href}" if href and href.startswith("/") else href
                    if title and company:
                        jobs.append({"company": company.strip(), "role": title.strip(), "location": location.strip(),
                                     "apply_link": link or "", "source": "wellfound",
                                     "job_description": "", "salary_raw": None})
                except Exception:
                    pass
        except Exception as e:
            logger.error(f"Wellfound error: {e}")

        await page.close()
        return jobs

    async def fetch_job_description(self, url: str, browser: Browser) -> str:
        if not url:
            return ""
        try:
            page = await browser.new_page()
            await page.goto(url, wait_until="networkidle", timeout=15000)
            await page.wait_for_timeout(1500)
            for sel in [".job-description", "#job-description", '[data-testid="jobDescriptionText"]',
                        ".jobsearch-jobDescriptionText", ".description__text", "article", "main"]:
                el = await page.query_selector(sel)
                if el:
                    text = await el.inner_text()
                    if len(text) > 200:
                        await page.close()
                        return text[:5000]
            body = await page.inner_text("body")
            await page.close()
            return body[:5000]
        except Exception as e:
            logger.debug(f"JD fetch error {url}: {e}")
            return ""
