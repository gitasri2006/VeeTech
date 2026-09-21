"""
Discovery YouTube In-App Handler
Extracts video IDs and embeds without requiring YouTube Data API keys.
Optionally fetches public oEmbed metadata for accurate title and channel name.
"""

import logging
import re
import urllib.parse
from typing import Optional
import httpx

from services.content_ingestion.models import YouTubeContent

logger = logging.getLogger("discovery.youtube_handler")

# Regex to match various YouTube URL formats
YOUTUBE_REGEX = re.compile(
    r"(?:https?://)?(?:www\.|m\.)?(?:youtube\.com/(?:watch\?v=|embed/|v/|shorts/)|youtu\.be/)([a-zA-Z0-9_-]{11})",
    re.IGNORECASE,
)


def extract_youtube_video_id(url: str) -> Optional[str]:
    """Extracts the 11-character YouTube video ID from any valid YouTube URL."""
    if not url:
        return None
    match = YOUTUBE_REGEX.search(url)
    if match:
        return match.group(1)
    
    # Query param fallback
    try:
        parsed = urllib.parse.urlparse(url)
        if "youtube.com" in parsed.netloc:
            qs = urllib.parse.parse_qs(parsed.query)
            if "v" in qs and qs["v"] and len(qs["v"][0]) == 11:
                return qs["v"][0]
    except Exception:
        pass

    return None


def is_youtube_url(url: str) -> bool:
    """Returns True if the URL points to a YouTube video or short."""
    if not url:
        return False
    return extract_youtube_video_id(url) is not None


async def get_youtube_content(url: str, fallback_title: Optional[str] = None) -> Optional[YouTubeContent]:
    """
    Constructs a YouTubeContent object for in-app playback.
    Uses public YouTube oEmbed (no API key required) to fetch title, channel author, and thumbnail.
    """
    video_id = extract_youtube_video_id(url)
    if not video_id:
        return None

    embed_url = f"https://www.youtube.com/embed/{video_id}?rel=0"
    thumbnail_url = f"https://img.youtube.com/vi/{video_id}/hqdefault.jpg"
    
    title = fallback_title or "YouTube Video"
    author = "YouTube"

    # Fetch public oEmbed metadata with 3s timeout
    try:
        oembed_url = f"https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v={video_id}&format=json"
        async with httpx.AsyncClient(timeout=3.0, follow_redirects=True) as client:
            resp = await client.get(oembed_url)
            if resp.status_code == 200:
                data = resp.json()
                title = data.get("title") or title
                author = data.get("author_name") or author
                if data.get("thumbnail_url"):
                    thumbnail_url = data.get("thumbnail_url")
    except Exception as exc:
        logger.debug("YouTube oEmbed fetch notice: %s", exc)

    return YouTubeContent(
        video_id=video_id,
        embed_url=embed_url,
        title=title,
        author=author,
        thumbnail_url=thumbnail_url,
    )
