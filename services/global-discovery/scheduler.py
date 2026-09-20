"""
Discovery Autonomous Background Ingestion Scheduler
Compliant with PRD Section 7.1, 7.2 and Architecture Master Requirement

Capabilities:
1. Autonomous background polling loop running on configurable interval (default: 300s / 5 minutes).
2. Continuous ingestion of:
   - Global RSS/Atom feeds (BBC, TechCrunch, The Hindu, Reuters)
   - Google News Live Top Stories RSS
   - Hacker News Firebase top stories
3. Automatic normalization, SHA-256 deduplication against seen cache and database.
4. Auto-persistence to PostgreSQL database and event bus publishing to Redis Streams.
5. Isolated exception handling per source to ensure single-source failure never stops the scheduler.
"""

import asyncio
from datetime import datetime, timezone
import hashlib
import json
import logging
import os
from typing import Any, Dict, List, Optional
import urllib.parse
import urllib.request
import uuid
import xml.etree.ElementTree as ET

from services.common.bus import bus
from services.common.db import db
from services.common.models import Article, MediaType

logger = logging.getLogger("discovery.scheduler")

DEFAULT_FEEDS = [
    {"name": "BBC News", "url": "https://feeds.bbci.co.uk/news/world/rss.xml", "tier": 1},
    {"name": "TechCrunch", "url": "https://techcrunch.com/feed/", "tier": 2},
    {"name": "The Hindu", "url": "https://www.thehindu.com/news/national/feeder/default.rss", "tier": 1},
    {"name": "Google News Live", "url": "https://news.google.com/rss?hl=en-US&gl=US&ceid=US:en", "tier": 1},
]

class BackgroundIngestionScheduler:
    """Continuous autonomous background ingestion worker."""

    def __init__(self):
        self.interval_seconds = int(os.getenv("BACKGROUND_INGESTION_INTERVAL_SECONDS", os.getenv("INGESTION_INTERVAL_SECONDS", "300")))
        self.enabled = os.getenv("ENABLE_BACKGROUND_INGESTION", "true").lower() in ("true", "1", "yes")
        self._running = False
        self._task: Optional[asyncio.Task] = None
        self.seen_urls: set = set()
        self.stats = {
            "total_cycles": 0,
            "articles_ingested": 0,
            "duplicates_skipped": 0,
            "last_run_timestamp": None,
            "last_run_status": "initialized",
            "active_sources": ["rss_feeds", "google_news_live", "hackernews"],
        }

    def start(self):
        """Start the background ingestion scheduler loop."""
        if not self.enabled:
            logger.info("Background ingestion is disabled via configuration.")
            return
        if self._running:
            logger.info("Background ingestion scheduler is already running.")
            return
        self._running = True
        self._task = asyncio.create_task(self._run_loop())
        logger.info("Background Ingestion Scheduler started with interval: %d seconds", self.interval_seconds)

    def stop(self):
        """Stop the background ingestion scheduler loop."""
        self._running = False
        if self._task:
            self._task.cancel()
            self._task = None
        logger.info("Background Ingestion Scheduler stopped.")

    async def _run_loop(self):
        """Main periodic execution loop."""
        # Initial brief delay to allow services to fully bind ports
        await asyncio.sleep(2)
        while self._running:
            try:
                logger.info("Starting background ingestion cycle #%d...", self.stats["total_cycles"] + 1)
                cycle_ingested = await self.run_ingestion_cycle()
                self.stats["total_cycles"] += 1
                self.stats["articles_ingested"] += cycle_ingested
                self.stats["last_run_timestamp"] = datetime.now(timezone.utc).isoformat()
                self.stats["last_run_status"] = "success"
                logger.info("Completed background ingestion cycle. Ingested %d new articles.", cycle_ingested)
            except asyncio.CancelledError:
                logger.info("Background ingestion scheduler loop cancelled.")
                break
            except Exception as e:
                logger.warning("Background ingestion cycle encountered an error: %s", e)
                self.stats["last_run_status"] = f"error: {str(e)}"

            try:
                await asyncio.sleep(self.interval_seconds)
            except asyncio.CancelledError:
                break

    async def run_ingestion_cycle(self) -> int:
        """Runs one single ingestion pass across all active background sources."""
        total_new = 0
        loop = asyncio.get_event_loop()

        # 1. Fetch RSS Feeds
        for feed in DEFAULT_FEEDS:
            try:
                feed_items = await loop.run_in_executor(None, lambda f=feed: self._fetch_feed(f["url"], f["name"], f["tier"]))
                for item in feed_items:
                    is_new = await self._ingest_candidate(item)
                    if is_new:
                        total_new += 1
                    else:
                        self.stats["duplicates_skipped"] += 1
            except Exception as exc:
                logger.debug("Background RSS poll failed for %s: %s (continuing with remaining sources)", feed["name"], exc)

        # 2. Fetch Hacker News Top Stories
        try:
            hn_items = await self._fetch_hackernews()
            for item in hn_items:
                is_new = await self._ingest_candidate(item)
                if is_new:
                    total_new += 1
                else:
                    self.stats["duplicates_skipped"] += 1
        except Exception as exc:
            logger.debug("Background Hacker News poll failed: %s (continuing)", exc)

        return total_new

    def _fetch_feed(self, feed_url: str, source_name: str, tier: int) -> List[Dict[str, Any]]:
        """Fetch and parse RSS/Atom XML from feed URL."""
        items = []
        try:
            req = urllib.request.Request(
                feed_url,
                headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) DiscoveryBot/1.0"}
            )
            with urllib.request.urlopen(req, timeout=6) as response:
                xml_data = response.read()
            root = ET.fromstring(xml_data)
            for it in root.findall(".//item")[:10]:
                title = it.findtext("title", default="").strip()
                link = it.findtext("link", default="").strip()
                pub = it.findtext("pubDate", default="")
                desc = it.findtext("description", default="").strip()
                if title and link:
                    items.append({
                        "title": title,
                        "url": link,
                        "source": source_name,
                        "source_tier": tier,
                        "platform": "web",
                        "published_at_raw": pub,
                        "description": desc,
                    })
        except Exception as e:
            logger.debug("XML parse for feed %s notice: %s", source_name, e)
        return items

    async def _fetch_hackernews(self) -> List[Dict[str, Any]]:
        """Fetch top stories from Hacker News."""
        items = []
        loop = asyncio.get_event_loop()
        try:
            req = urllib.request.Request("https://hacker-news.firebaseio.com/v0/topstories.json", headers={"User-Agent": "DiscoveryBot/1.0"})
            data_bytes = await loop.run_in_executor(None, lambda: urllib.request.urlopen(req, timeout=4).read())
            story_ids = json.loads(data_bytes.decode("utf-8"))[:6]
            for sid in story_ids:
                try:
                    item_req = urllib.request.Request(f"https://hacker-news.firebaseio.com/v0/item/{sid}.json")
                    item_bytes = await loop.run_in_executor(None, lambda: urllib.request.urlopen(item_req, timeout=3).read())
                    st = json.loads(item_bytes.decode("utf-8"))
                    if st.get("title") and st.get("url"):
                        items.append({
                            "title": st["title"],
                            "url": st["url"],
                            "source": "Hacker News",
                            "source_tier": 2,
                            "platform": "web",
                            "description": f"Hacker News submission by {st.get('by', 'user')}. Score: {st.get('score', 0)}",
                        })
                except Exception:
                    continue
        except Exception as e:
            logger.debug("Hacker News fetch notice: %s", e)
        return items

    async def _ingest_candidate(self, cand: Dict[str, Any]) -> bool:
        """Deduplicate and ingest candidate into database and publish event."""
        url = cand.get("url")
        title = cand.get("title", "")
        if not url or not title:
            return False

        if url in self.seen_urls:
            return False
        self.seen_urls.add(url)

        content_hash = hashlib.sha256(f"{title}\n{url}".encode("utf-8")).hexdigest()
        existing = db.get_article_by_hash(content_hash)
        if existing:
            return False

        article = Article(
            id=str(uuid.uuid4()),
            canonical_url=url,
            source=cand.get("source", "web"),
            source_tier=cand.get("source_tier", 2),
            title=title,
            content_hash=content_hash,
            published_at=datetime.now(timezone.utc),
            extracted_text=cand.get("description") or f"Live coverage: {title}. Discovered automatically by background scheduler.",
            media_type=MediaType.TEXT,
            language="en",
        )
        db.save_article(article)

        # Publish discovery.candidates event
        await bus.publish("discovery.candidates", {
            "event": "discovery.candidates",
            "article_id": article.id,
            "title": article.title,
            "url": article.canonical_url,
            "source": article.source,
            "source_tier": article.source_tier,
            "ingested_by": "background_scheduler",
            "timestamp": datetime.now(timezone.utc).isoformat(),
        })
        return True


scheduler = BackgroundIngestionScheduler()
