"""
Discovery In-App Content Ingestion Router
Provides safe, fast content preview and article extraction endpoints.
"""

import collections
import logging
import time
import urllib.parse
from typing import Optional

from fastapi import APIRouter, FastAPI, HTTPException, Query
from pydantic import BaseModel

from services.content_ingestion.article_extractor import extract_article_content
from services.content_ingestion.models import (
    ArticleContent,
    ContentPreviewResponse,
    ContentType,
    RSSContent,
    YouTubeContent,
)
from services.content_ingestion.rss_handler import extract_rss_content, is_rss_url
from services.content_ingestion.ssrf_validator import validate_url_safety
from services.content_ingestion.youtube_handler import get_youtube_content, is_youtube_url

logger = logging.getLogger("discovery.content_router")

# Simple in-memory LRU Cache (URL -> (timestamp, ContentPreviewResponse))
CACHE_TTL_SECONDS = 3600  # 1 hour
MAX_CACHE_SIZE = 1000
_preview_cache = collections.OrderedDict()


def get_cached_preview(url: str) -> Optional[ContentPreviewResponse]:
    if url in _preview_cache:
        ts, resp = _preview_cache[url]
        if time.time() - ts < CACHE_TTL_SECONDS:
            _preview_cache.move_to_end(url)
            return resp
        else:
            del _preview_cache[url]
    return None


def set_cached_preview(url: str, resp: ContentPreviewResponse):
    if len(_preview_cache) >= MAX_CACHE_SIZE:
        _preview_cache.popitem(last=False)
    _preview_cache[url] = (time.time(), resp)


def detect_content_type(url: str) -> ContentType:
    """Classifies the URL into appropriate content ingestion handler."""
    if not url:
        return "unsupported"
    
    url_lower = url.lower()
    if is_youtube_url(url):
        return "youtube"
    elif is_rss_url(url):
        return "rss"
    elif any(url_lower.endswith(ext) for ext in [".png", ".jpg", ".jpeg", ".webp", ".gif"]):
        return "image"
    elif any(url_lower.endswith(ext) for ext in [".mp4", ".webm", ".mov"]):
        return "video"
    elif any(url_lower.endswith(ext) for ext in [".mp3", ".wav", ".m4a"]):
        return "audio"
    elif url_lower.startswith("http://") or url_lower.startswith("https://"):
        return "article"
    
    return "unsupported"


app = FastAPI(
    title="Discovery Content Ingestion API",
    description="In-app content extraction and media playback endpoints",
    version="1.0.0",
)


@app.get("/preview", response_model=ContentPreviewResponse, tags=["Content Ingestion"])
async def preview_content_get(
    url: str = Query(..., description="Target source URL to preview in-app"),
    title: Optional[str] = Query(None, description="Discovered source title"),
    snippet: Optional[str] = Query(None, description="Discovered source snippet"),
    source: Optional[str] = Query(None, description="Discovered source/publisher name"),
):
    """
    Fetches and normalizes external URL content for in-app display.
    Supports YouTube embed generation, clean news article extraction, and RSS parsing.
    """
    url = url.strip()
    cached = get_cached_preview(url)
    if cached:
        return cached

    content_type = detect_content_type(url)
    source_name = source or urllib.parse.urlparse(url).netloc.replace("www.", "")

    # 1. YouTube Handler
    if content_type == "youtube":
        yt_content = await get_youtube_content(url, fallback_title=title)
        if yt_content:
            res = ContentPreviewResponse(
                success=True,
                content_type="youtube",
                original_url=url,
                source_name="YouTube",
                extraction_status="success",
                youtube=yt_content,
            )
            set_cached_preview(url, res)
            return res
        else:
            return ContentPreviewResponse(
                success=False,
                content_type="youtube",
                original_url=url,
                source_name="YouTube",
                extraction_status="unavailable",
                error_message="Could not extract valid YouTube video ID from URL.",
            )

    # 2. RSS Handler
    elif content_type == "rss":
        rss_content, err = await extract_rss_content(url, fallback_title=title)
        if rss_content:
            res = ContentPreviewResponse(
                success=True,
                content_type="rss",
                original_url=url,
                source_name=rss_content.source_name or source_name,
                extraction_status="success",
                rss=rss_content,
            )
            set_cached_preview(url, res)
            return res
        else:
            # Fall back to article extractor if RSS failed
            content_type = "article"

    # 3. Article Extraction Handler
    if content_type == "article":
        article_content, err = await extract_article_content(
            url=url,
            fallback_title=title,
            fallback_snippet=snippet,
        )
        if article_content:
            res = ContentPreviewResponse(
                success=True,
                content_type="article",
                original_url=url,
                source_name=article_content.source_name or source_name,
                extraction_status="success",
                article=article_content,
            )
            set_cached_preview(url, res)
            return res
        else:
            res = ContentPreviewResponse(
                success=False,
                content_type="article",
                original_url=url,
                source_name=source_name,
                extraction_status="unavailable",
                error_message=err or "In-app article extraction is unavailable for this source.",
            )
            return res

    # 4. Fallback / Unsupported
    return ContentPreviewResponse(
        success=False,
        content_type="unsupported",
        original_url=url,
        source_name=source_name,
        extraction_status="unavailable",
        error_message="Preview is not supported for this media type.",
    )


class PreviewPostRequest(BaseModel):
    url: str
    title: Optional[str] = None
    snippet: Optional[str] = None
    source: Optional[str] = None


@app.post("/preview", response_model=ContentPreviewResponse, tags=["Content Ingestion"])
async def preview_content_post(req: PreviewPostRequest):
    return await preview_content_get(
        url=req.url,
        title=req.title,
        snippet=req.snippet,
        source=req.source,
    )
