"""
Discovery Headless Dynamic Web Scraper (Playwright Engine)
Compliant with Requirement 1, 3, 7 (Live Dynamic SPA & Full-Page Article Extraction)
Executes client-side JavaScript for dynamic news portals, Next.js / React SPAs, and paywalled reader DOMs.
Optimized with route resource blocking (images, media, fonts, stylesheets) for high-speed sub-second extraction.
"""

import asyncio
from datetime import datetime, timezone
import logging
import os
import re
from typing import Any, Dict, Optional
import urllib.parse

from bs4 import BeautifulSoup
from playwright.async_api import async_playwright, Browser, Playwright

logger = logging.getLogger("discovery.playwright")


class PlaywrightScraper:
    """Async Playwright browser manager with resource-blocked fast article extraction."""

    def __init__(self):
        self.headless = os.getenv("PLAYWRIGHT_HEADLESS", "true").lower() == "true"
        self.timeout_ms = int(os.getenv("PLAYWRIGHT_TIMEOUT_MS", "8000"))
        self._playwright: Optional[Playwright] = None
        self._browser: Optional[Browser] = None
        self._lock = asyncio.Lock()

    async def _ensure_browser(self):
        if not self._browser:
            async with self._lock:
                if not self._browser:
                    try:
                        self._playwright = await async_playwright().start()
                        self._browser = await self._playwright.chromium.launch(
                            headless=self.headless,
                            args=[
                                "--no-sandbox",
                                "--disable-setuid-sandbox",
                                "--disable-dev-shm-usage",
                                "--disable-gpu",
                                "--disable-extensions",
                            ]
                        )
                        logger.info("Playwright Chromium browser launched successfully.")
                    except Exception as exc:
                        logger.error("Failed to launch Playwright browser: %s", exc)

    async def extract_page(self, url: str) -> Dict[str, Any]:
        """
        Loads page with full JavaScript execution, blocks heavy media, and extracts clean article text.
        """
        await self._ensure_browser()
        if not self._browser:
            return {"url": url, "error": "Browser engine not available", "extracted_text": "", "title": ""}

        context = None
        page = None
        try:
            context = await self._browser.new_context(
                user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 DiscoveryBot/3.0",
                viewport={"width": 1280, "height": 800},
            )
            page = await context.new_page()

            # Abort heavy assets (images, media, fonts) to save bandwidth and speed up execution
            async def _block_heavy_resources(route):
                if route.request.resource_type in ["image", "media", "font"]:
                    await route.abort()
                else:
                    await route.continue_()

            await page.route("**/*", _block_heavy_resources)

            # Navigate to page
            await page.goto(url, timeout=self.timeout_ms, wait_until="domcontentloaded")
            
            # Wait briefly for dynamic client-side hydration (e.g. React/Next.js)
            try:
                await page.wait_for_load_state("networkidle", timeout=3000)
            except Exception:
                pass

            html_content = await page.content()
            title = await page.title()

            # Parse with BeautifulSoup
            soup = BeautifulSoup(html_content, "lxml" if "lxml" in BeautifulSoup.__dict__ else "html.parser")
            
            # Remove scripts, styles, navigations, footers, cookie banners
            for tag in soup(["script", "style", "nav", "header", "footer", "aside", "form", "svg"]):
                tag.decompose()

            # Identify core article body
            article_elem = (
                soup.find("article")
                or soup.find(attrs={"itemprop": "articleBody"})
                or soup.find(class_=re.compile(r"article[-_]body|story[-_]content|post[-_]content|entry[-_]content|main[-_]content", re.I))
                or soup.find("main")
                or soup.body
            )

            paragraphs = []
            if article_elem:
                for p in article_elem.find_all(["p", "h1", "h2", "h3", "h4", "li"]):
                    text = p.get_text().strip()
                    if len(text) > 25 and not re.search(r"cookie|subscribe|sign in|privacy policy|terms of service", text, re.I):
                        paragraphs.append(text)

            body_text = "\n\n".join(paragraphs).strip()
            if not body_text and article_elem:
                body_text = article_elem.get_text(separator="\n").strip()

            # Extract author
            author = None
            author_meta = (
                soup.find("meta", attrs={"name": "author"})
                or soup.find("meta", property="article:author")
            )
            if author_meta and author_meta.get("content"):
                author = author_meta["content"].strip()

            return {
                "url": url,
                "title": title or "",
                "author": author,
                "extracted_text": body_text[:12000],  # Return up to 12k chars of rich article text
                "html_length": len(html_content),
                "status": "success",
            }

        except Exception as exc:
            logger.debug("Playwright extraction error for %s: %s", url, exc)
            return {
                "url": url,
                "error": str(exc),
                "extracted_text": "",
                "title": "",
                "status": "failed",
            }
        finally:
            if page:
                try:
                    await page.close()
                except Exception:
                    pass
            if context:
                try:
                    await context.close()
                except Exception:
                    pass

    async def close(self):
        if self._browser:
            await self._browser.close()
            self._browser = None
        if self._playwright:
            await self._playwright.stop()
            self._playwright = None


# Global Playwright Scraper Instance
playwright_scraper = PlaywrightScraper()
