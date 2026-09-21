"""
Discovery Content Ingestion Models
Defines normalized schemas for in-app media playback and clean article reading.
"""

from datetime import datetime
from typing import Any, Dict, List, Literal, Optional
from pydantic import BaseModel, Field


ContentType = Literal["youtube", "article", "rss", "image", "video", "audio", "unsupported"]


class ArticleContent(BaseModel):
    title: str
    author: Optional[str] = None
    published_at: Optional[str] = None
    source_name: Optional[str] = None
    canonical_url: Optional[str] = None
    language: Optional[str] = None
    hero_image: Optional[str] = None
    excerpt: Optional[str] = None
    text: str
    word_count: int = 0
    reading_time_minutes: int = 1


class YouTubeContent(BaseModel):
    video_id: str
    embed_url: str
    title: Optional[str] = None
    author: Optional[str] = None
    published_at: Optional[str] = None
    thumbnail_url: Optional[str] = None
    description: Optional[str] = None


class RSSContent(BaseModel):
    title: str
    link: str
    description: Optional[str] = None
    published_at: Optional[str] = None
    source_name: Optional[str] = None
    author: Optional[str] = None
    image_url: Optional[str] = None


class ContentPreviewResponse(BaseModel):
    success: bool = True
    content_type: ContentType
    original_url: str
    source_name: Optional[str] = None
    extraction_status: Literal["success", "partial", "unavailable", "blocked"] = "success"
    article: Optional[ArticleContent] = None
    youtube: Optional[YouTubeContent] = None
    rss: Optional[RSSContent] = None
    error_message: Optional[str] = None
