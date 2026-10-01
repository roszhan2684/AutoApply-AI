"""
Application Bot Agent
Uses Playwright to automatically fill and submit job applications.
Handles LinkedIn Easy Apply, Greenhouse, Lever, and generic forms.
"""
import asyncio
import logging
import os
from pathlib import Path
from typing import Optional
from playwright.async_api import async_playwright, Page, Browser
from services.claude_client import claude
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger(__name__)

# User info from environment
USER_INFO = {
    "first_name": os.getenv("USER_FIRST_NAME", "Roszhan"),
    "last_name": os.getenv("USER_LAST_NAME", "Raj"),
    "full_name": os.getenv("USER_NAME", "Roszhan Raj"),
    "email": os.getenv("USER_EMAIL", "roszhan@email.com"),
    "phone": os.getenv("USER_PHONE", "5551234567"),
    "location": os.getenv("USER_LOCATION", "Fullerton, CA"),
    "linkedin": os.getenv("USER_LINKEDIN", "https://linkedin.com/in/roszhanraj"),
    "github": os.getenv("USER_GITHUB", "https://github.com/roszhanraj"),
    "portfolio": os.getenv("USER_PORTFOLIO", "https://roszhanraj.dev"),
    "work_authorization": os.getenv("USER_WORK_AUTH", "yes"),
    "visa_sponsorship": os.getenv("USER_VISA", "no"),
    "years_experience": os.getenv("USER_YEARS_EXP", "2"),
    "degree": "Master's",
    "school": "California State University, Fullerton",
    "gpa": "3.95",
    "salary_expectation": os.getenv("USER_SALARY", "130000"),
}

# Standard yes/no answers
YES_NO_FIELDS = {
    "authorized": "yes",
    "authorization": "yes",
    "work authorization": "yes",
    "eligible to work": "yes",
    "visa sponsorship": "no",
    "require sponsorship": "no",
    "sponsor": "no",
    "18 years": "yes",
    "background check": "yes",
    "drug test": "yes",
}


class ApplicationBot:
    def __init__(self, headless: bool = True, slow_mo: int = 300):
        self.headless = headless
        self.slow_mo = slow_mo
        self.resume_dir = Path("resumes/tailored")
        self.screenshots_dir = Path("screenshots")
        self.screenshots_dir.mkdir(parents=True, exist_ok=True)
        self.retry_attempts = 3

    async def apply(
        self,
        job: dict,
        resume_path: Optional[str] = None,
        cover_letter: Optional[str] = None,
        dry_run: bool = False
    ) -> dict:
        """
        Main entry point. Detects application platform and applies.
        """
        apply_url = job.get("apply_link", "")
        company = job.get("company", "Unknown")
        role = job.get("role", "Engineer")

        if not apply_url:
            return {"success": False, "error": "No apply link", "company": company, "role": role}

        logger.info(f"🤖 Applying to {company} - {role}")
        logger.info(f"   URL: {apply_url}")

        # Detect platform
        platform = self._detect_platform(apply_url)
        logger.info(f"   Platform: {platform}")

        result = {"success": False, "company": company, "role": role, "platform": platform, "url": apply_url}

        for attempt in range(self.retry_attempts):
            try:
                async with async_playwright() as p:
                    browser = await p.chromium.launch(
                        headless=self.headless,
                        slow_mo=self.slow_mo,
                        args=["--no-sandbox", "--disable-setuid-sandbox"]
                    )
                    context = await browser.new_context(
                        viewport={"width": 1280, "height": 800},
                        user_agent=(
                            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                            "AppleWebKit/537.36 (KHTML, like Gecko) "
                            "Chrome/120.0.0.0 Safari/537.36"
                        )
                    )
                    page = await context.new_page()

                    if platform == "greenhouse":
                        outcome = await self._apply_greenhouse(page, apply_url, resume_path, cover_letter, dry_run)
                    elif platform == "lever":
                        outcome = await self._apply_lever(page, apply_url, resume_path, cover_letter, dry_run)
                    elif platform == "linkedin":
                        outcome = await self._apply_linkedin_easy(page, apply_url, resume_path, dry_run)
                    else:
                        outcome = await self._apply_generic(page, apply_url, resume_path, cover_letter, dry_run)

                    await browser.close()
                    result.update(outcome)

                    if result.get("success"):
                        break

            except Exception as e:
                logger.error(f"Attempt {attempt + 1} failed for {company}: {e}")
                result["error"] = str(e)
                if attempt < self.retry_attempts - 1:
                    await asyncio.sleep(2 ** attempt)

        return result

    def _detect_platform(self, url: str) -> str:
        url_lower = url.lower()
        if "greenhouse.io" in url_lower or "boards.greenhouse" in url_lower:
            return "greenhouse"
        elif "lever.co" in url_lower:
            return "lever"
        elif "linkedin.com" in url_lower:
            return "linkedin"
        elif "workday" in url_lower:
            return "workday"
        elif "ashbyhq.com" in url_lower:
            return "ashby"
        elif "jobs.ashby" in url_lower:
            return "ashby"
        return "generic"

    async def _apply_greenhouse(
        self,
        page: Page,
        url: str,
        resume_path: Optional[str],
        cover_letter: Optional[str],
        dry_run: bool
    ) -> dict:
        """Handle Greenhouse application forms."""
        await page.goto(url, timeout=30000, wait_until="domcontentloaded")
        await page.wait_for_timeout(2000)

        # Fill basic info
        await self._fill_field(page, "#first_name", USER_INFO["first_name"])
        await self._fill_field(page, "#last_name", USER_INFO["last_name"])
        await self._fill_field(page, "#email", USER_INFO["email"])
        await self._fill_field(page, "#phone", USER_INFO["phone"])

        # Location
        await self._fill_field(page, "#job_application_location", USER_INFO["location"])

        # LinkedIn / Website
        await self._fill_field(page, "input[name*='linkedin']", USER_INFO["linkedin"])
        await self._fill_field(page, "input[name*='website']", USER_INFO["portfolio"])
        await self._fill_field(page, "input[name*='github']", USER_INFO["github"])

        # Resume upload
        if resume_path and Path(resume_path).exists():
            file_input = page.locator("input[type='file']").first
            if await file_input.count() > 0:
                await file_input.set_input_files(resume_path)
                await page.wait_for_timeout(1500)

        # Cover letter textarea
        if cover_letter:
            cover_letter_area = page.locator("textarea[name*='cover']")
            if await cover_letter_area.count() > 0:
                await cover_letter_area.fill(cover_letter[:3000])

        # Handle custom questions
        await self._handle_custom_questions(page)

        # Screenshot before submit
        screenshot_path = self.screenshots_dir / f"greenhouse_{USER_INFO['email'][:10]}.png"
        await page.screenshot(path=str(screenshot_path))

        if not dry_run:
            submit_btn = page.locator("input[type='submit'], button[type='submit']").first
            if await submit_btn.count() > 0:
                await submit_btn.click()
                await page.wait_for_timeout(3000)
                return {"success": True, "screenshot": str(screenshot_path)}
            return {"success": False, "error": "Submit button not found"}

        return {"success": True, "dry_run": True, "screenshot": str(screenshot_path)}

    async def _apply_lever(
        self,
        page: Page,
        url: str,
        resume_path: Optional[str],
        cover_letter: Optional[str],
        dry_run: bool
    ) -> dict:
        """Handle Lever application forms."""
        await page.goto(url, timeout=30000, wait_until="domcontentloaded")
        await page.wait_for_timeout(2000)

        # Click Apply button if on job listing page
        apply_btn = page.locator("a[data-qa='btn-apply-bottom'], a.postings-btn")
        if await apply_btn.count() > 0:
            await apply_btn.first.click()
            await page.wait_for_timeout(2000)

        await self._fill_field(page, "input[name='name']", USER_INFO["full_name"])
        await self._fill_field(page, "input[name='email']", USER_INFO["email"])
        await self._fill_field(page, "input[name='phone']", USER_INFO["phone"])
        await self._fill_field(page, "input[name='org']", "")  # Current company — left blank

        # URLs
        await self._fill_field(page, "input[name='urls[LinkedIn]']", USER_INFO["linkedin"])
        await self._fill_field(page, "input[name='urls[GitHub]']", USER_INFO["github"])
        await self._fill_field(page, "input[name='urls[Portfolio]']", USER_INFO["portfolio"])

        # Resume upload
        if resume_path and Path(resume_path).exists():
            file_input = page.locator("input[type='file']").first
            if await file_input.count() > 0:
                await file_input.set_input_files(resume_path)
                await page.wait_for_timeout(1500)

        # Cover letter
        if cover_letter:
            cl_input = page.locator("textarea[name*='cover'], div[data-qa='cover-letter-text']")
            if await cl_input.count() > 0:
                await cl_input.fill(cover_letter[:3000])

        await self._handle_custom_questions(page)

        screenshot_path = self.screenshots_dir / "lever_app.png"
        await page.screenshot(path=str(screenshot_path))

        if not dry_run:
            submit_btn = page.locator("button[type='submit'], input[type='submit']").last
            if await submit_btn.count() > 0:
                await submit_btn.click()
                await page.wait_for_timeout(3000)
                return {"success": True, "screenshot": str(screenshot_path)}
            return {"success": False, "error": "Submit button not found"}

        return {"success": True, "dry_run": True, "screenshot": str(screenshot_path)}

    async def _apply_linkedin_easy(
        self,
        page: Page,
        url: str,
        resume_path: Optional[str],
        dry_run: bool
    ) -> dict:
        """Handle LinkedIn Easy Apply flow."""
        await page.goto(url, timeout=30000, wait_until="domcontentloaded")
        await page.wait_for_timeout(2000)

        # LinkedIn requires login — check for Easy Apply button
        easy_apply = page.locator("button.jobs-apply-button, button[aria-label*='Easy Apply']")
        if await easy_apply.count() == 0:
            return {"success": False, "error": "LinkedIn Easy Apply not available or requires login"}

        await easy_apply.click()
        await page.wait_for_timeout(1500)

        # Multi-step form handling
        max_steps = 10
        for step in range(max_steps):
            # Fill phone if visible
            phone_input = page.locator("input[id*='phoneNumber-nationalNumber']")
            if await phone_input.count() > 0:
                await phone_input.fill(USER_INFO["phone"])

            # Handle yes/no radio groups
            await self._handle_radio_groups(page)

            # Handle dropdowns
            await self._handle_dropdowns(page)

            # Resume upload
            if resume_path and Path(resume_path).exists():
                file_input = page.locator("input[type='file']")
                if await file_input.count() > 0:
                    await file_input.set_input_files(resume_path)
                    await page.wait_for_timeout(1500)

            # Next or Submit
            next_btn = page.locator("button[aria-label='Continue to next step']")
            submit_btn = page.locator("button[aria-label='Submit application']")
            review_btn = page.locator("button[aria-label='Review your application']")

            if await submit_btn.count() > 0 and not dry_run:
                await submit_btn.click()
                await page.wait_for_timeout(2000)
                return {"success": True}
            elif await submit_btn.count() > 0 and dry_run:
                return {"success": True, "dry_run": True}
            elif await review_btn.count() > 0:
                await review_btn.click()
                await page.wait_for_timeout(1500)
            elif await next_btn.count() > 0:
                await next_btn.click()
                await page.wait_for_timeout(1500)
            else:
                break

        return {"success": False, "error": "Could not complete LinkedIn Easy Apply flow"}

    async def _apply_generic(
        self,
        page: Page,
        url: str,
        resume_path: Optional[str],
        cover_letter: Optional[str],
        dry_run: bool
    ) -> dict:
        """Generic form filler for unknown platforms."""
        await page.goto(url, timeout=30000, wait_until="domcontentloaded")
        await page.wait_for_timeout(3000)

        # Common field mappings
        field_map = {
            "name": USER_INFO["full_name"],
            "full_name": USER_INFO["full_name"],
            "first_name": USER_INFO["first_name"],
            "last_name": USER_INFO["last_name"],
            "email": USER_INFO["email"],
            "phone": USER_INFO["phone"],
            "linkedin": USER_INFO["linkedin"],
            "github": USER_INFO["github"],
            "website": USER_INFO["portfolio"],
            "location": USER_INFO["location"],
            "city": USER_INFO["location"].split(",")[0],
        }

        for field_key, value in field_map.items():
            await self._fill_by_label_or_name(page, field_key, value)

        # Resume upload
        if resume_path and Path(resume_path).exists():
            file_inputs = page.locator("input[type='file']")
            count = await file_inputs.count()
            if count > 0:
                await file_inputs.first.set_input_files(resume_path)
                await page.wait_for_timeout(1500)

        # Cover letter
        if cover_letter:
            textareas = page.locator("textarea")
            count = await textareas.count()
            if count > 0:
                await textareas.first.fill(cover_letter[:3000])

        await self._handle_custom_questions(page)
        await self._handle_radio_groups(page)
        await self._handle_dropdowns(page)

        screenshot_path = self.screenshots_dir / f"generic_{url[:30].replace('/', '_')}.png"
        await page.screenshot(path=str(screenshot_path))

        if not dry_run:
            submit_btns = page.locator(
                "button[type='submit'], input[type='submit'], "
                "button:text('Submit'), button:text('Apply')"
            )
            if await submit_btns.count() > 0:
                await submit_btns.first.click()
                await page.wait_for_timeout(3000)
                return {"success": True, "screenshot": str(screenshot_path)}
            return {"success": False, "error": "No submit button found"}

        return {"success": True, "dry_run": True, "screenshot": str(screenshot_path)}

    async def _fill_field(self, page: Page, selector: str, value: str):
        """Fill an input field if it exists and value is non-empty."""
        if not value:
            return
        try:
            el = page.locator(selector).first
            if await el.count() > 0 and await el.is_visible():
                await el.clear()
                await el.fill(value)
        except Exception:
            pass

    async def _fill_by_label_or_name(self, page: Page, key: str, value: str):
        """Try to fill a field by matching label text or name attribute."""
        if not value:
            return
        selectors = [
            f"input[name*='{key}']",
            f"input[id*='{key}']",
            f"input[placeholder*='{key}']",
        ]
        for selector in selectors:
            try:
                el = page.locator(selector).first
                if await el.count() > 0 and await el.is_visible():
                    await el.clear()
                    await el.fill(value)
                    return
            except Exception:
                continue

    async def _handle_custom_questions(self, page: Page):
        """Handle unknown text inputs and textareas on the form."""
        try:
            textareas = page.locator("textarea:not([name*='cover'])")
            count = await textareas.count()
            for i in range(min(count, 5)):
                ta = textareas.nth(i)
                if await ta.is_visible():
                    label_text = await page.evaluate(
                        """(el) => {
                            const label = document.querySelector(`label[for="${el.id}"]`);
                            return label ? label.innerText : el.placeholder || el.name;
                        }""",
                        await ta.element_handle()
                    )
                    if label_text:
                        current_val = await ta.input_value()
                        if not current_val:
                            answers = claude.generate_application_answers(
                                questions=[label_text],
                                user_profile={"name": USER_INFO["full_name"]},
                                job_info={}
                            )
                            answer = answers.get(label_text, "")
                            if answer:
                                await ta.fill(answer[:1000])
        except Exception as e:
            logger.debug(f"Custom question handling error: {e}")

    async def _handle_radio_groups(self, page: Page):
        """Handle yes/no and authorization radio buttons."""
        try:
            radios = page.locator("input[type='radio']")
            count = await radios.count()
            for i in range(count):
                radio = radios.nth(i)
                if not await radio.is_visible():
                    continue
                radio_val = (await radio.get_attribute("value") or "").lower()
                radio_label = (await radio.get_attribute("aria-label") or "").lower()

                for keyword, answer in YES_NO_FIELDS.items():
                    if keyword in radio_label:
                        if answer == "yes" and radio_val in ["yes", "true", "1"]:
                            await radio.check()
                        elif answer == "no" and radio_val in ["no", "false", "0"]:
                            await radio.check()
        except Exception as e:
            logger.debug(f"Radio handling error: {e}")

    async def _handle_dropdowns(self, page: Page):
        """Handle common select dropdowns."""
        try:
            selects = page.locator("select")
            count = await selects.count()
            for i in range(count):
                sel = selects.nth(i)
                if not await sel.is_visible():
                    continue
                sel_name = (await sel.get_attribute("name") or "").lower()
                sel_id = (await sel.get_attribute("id") or "").lower()
                combined = sel_name + sel_id

                if "country" in combined:
                    await sel.select_option(label="United States")
                elif "degree" in combined or "education" in combined:
                    await sel.select_option(label="Master's Degree")
                elif "experience" in combined or "years" in combined:
                    await sel.select_option({"index": 2})
                elif "authorize" in combined or "sponsor" in combined:
                    await sel.select_option(label="Yes")
        except Exception as e:
            logger.debug(f"Dropdown handling error: {e}")


# Singleton
bot = ApplicationBot(headless=True)
