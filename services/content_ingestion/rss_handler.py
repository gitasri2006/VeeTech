"""
Discovery RSS & Feed Normalization Handler
Parses and normalizes RSS/Atom feed items for in-app viewing.
"""

import logging
import urllib.parse
from typing import Optional, Tuple
import feedparser

from services.content_ingestion.models import RSSContent
from services.content_ingestion.ssrf_validator import validate_url_safety

logger = logging.getLogger("discovery.rss_handler")


def is_rss_url(url: str) -> bool:
    """Heuristic check if a URL represents an RSS feed."""
    if not url:
        return False
    url_lower = url.lower()
    return any(k in url_lower for k in [".rss", "/rss", "rss.xml", "feed.xml", "atom.xml", "/feed/", "news.google.com/rss"])


async def extract_rss_content(url: str, fallback_title: Optional[str] = None) -> Tuple[Optional[RSSContent], Optional[str]]:
    """
    Parses an RSS or Atom feed URL safely.
    Returns (RSSContent, error_message).
    """
    is_safe, reason = validate_url_safety(url)
    if not is_safe:
        return None, f"Security policy blocked URL: {reason}"

    try:
        feed = feedparser.parse(url)
        if feed.bozo and not feed.entries:
            return None, "Invalid or unparseable RSS feed."

        if not feed.entries:
            return None, "No entries found in RSS feed."

        entry = feed.entries[0]
        title = entry.get("title") or fallback_title or "RSS Feed Item"
        link = entry.get("link") or url
        description = entry.get("summary") or entry.get("description") or ""
        published_at = entry.get("published") or entry.get("updated")
        author = entry.get("author")
        
        # Source name
        feed_title = feed.feed.get("title") if hasattr(feed, "feed") else None
        source_name = feed_title or urllib.parse.urlparse(url).netloc.replace("www.", "")

        # Image if available
        image_url = None
        if hasattr(feed, "feed") and hasattr(feed.feed, "image") and hasattr(feed.feed.image, "href"):
            image_url = feed.feed.image.href

        rss = RSSContent(
            title=title,
            link=link,
            description=description,
            published_at=published_at,
            source_name=source_name,
            author=author,
            image_url=image_url,
        )
        return rss, None

    except Exception as exc:
        logger.debug("RSS parse error: %s", exc)
        return None, f"Failed to parse RSS feed: {str(exc)}"
