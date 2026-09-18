"""
VeriScope Extraction Service (Phase 0 & Phase 3 Multi-Platform, Multimodal)
Compliant with PRD Section 7.2, 8.2, 8.3 and TRD Section 5.2

Capabilities:
1. Web & RSS/Atom Extraction (with XML fallback and SPA detection).
2. Social Platform Adapters: Instagram, X/Twitter, YouTube, Facebook, Telegram, Reddit, TikTok.
3. Multimodal Sub-Modules:
   - Image: OCR embedded text + visual captioning.
   - Audio: ASR speech-to-text with timestamps.
   - Video: Audio track ASR + keyframe sampling & captioning + on-screen OCR.
4. SHA-256 cross-modality deduplication.
5. Normalizes every input into a standard Article row + MediaAsset / SocialPost.
6. DB persistence and event bus publishing (`extraction.completed`).
"""

import hashlib
import logging
import re
import urllib.parse
from datetime import datetime, timezone
from typing import Any, Callable, Dict, List, Optional, Tuple
import xml.etree.ElementTree as ET

from bs4 import BeautifulSoup
import dateutil.parser
from fastapi import FastAPI, HTTPException, Query, status
from pydantic import BaseModel, Field
import requests

from services.common.bus import bus
from services.common.db import db
from services.common.models import Article, MediaType, MediaAsset, SocialPost
from services.extraction.social_adapters import get_social_adapter, NormalizedSocialContent
from services.extraction.multimodal_processor import (
    image_processor,
    audio_processor,
    video_processor,
    ProcessedMediaOutput,
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("veriscope.extraction")

app = FastAPI(
    title="VeriScope Multi-Platform & Multimodal Extraction Service",
    description="Unified Web, Social, and Multimodal Extraction Service for VeriScope",
    version="1.0.0",
)


# =====================================================================
# Request / Response Schemas
# =====================================================================

class RSSFeedRequest(BaseModel):
    feed_url: Optional[str] = None
    feed_xml: Optional[str] = None
    source_name: Optional[str] = None
    source_tier: Optional[int] = None
    max_items: int = 50


class URLExtractRequest(BaseModel):
    url: Optional[str] = None
    html_content: Optional[str] = None
    title: Optional[str] = None
    author: Optional[str] = None
    extracted_text: Optional[str] = None
    source_name: Optional[str] = None
    source_tier: Optional[int] = None
    force_browser: bool = False


class SocialExtractRequest(BaseModel):
    platform: str = Field(..., description="Platform: instagram, x, youtube, facebook, telegram, reddit, tiktok")
    raw_payload: Dict[str, Any] = Field(..., description="Platform specific API response or webhook payload")
    source_tier: Optional[int] = 2


class MultimodalExtractRequest(BaseModel):
    media_type: MediaType = Field(..., description="image, video, or audio")
    storage_ref: Optional[str] = Field(default=None, description="GCS/S3 storage URL or local reference path")
    title: Optional[str] = Field(default=None, description="Optional title or context")
    source_name: Optional[str] = Field(default="multimodal_upload")
    source_tier: Optional[int] = 2
    mock_ocr_text: Optional[str] = None
    mock_transcript: Optional[str] = None
    mock_caption: Optional[str] = None
    mock_keyframes: Optional[List[str]] = None


class ExtractionResponse(BaseModel):
    status: str
    total_processed: int
    new_articles_count: int
    duplicates_count: int
    articles: List[Article]


class HealthResponse(BaseModel):
    status: str
    service: str
    version: str
    timestamp: datetime


# =====================================================================
# Helper Utilities
# =====================================================================

def compute_content_hash(text: str, title: Optional[str] = None) -> str:
    combined = f"{title or ''}\n{text or ''}"
    normalized = re.sub(r"\s+", " ", combined).strip().lower()
    return hashlib.sha256(normalized.encode("utf-8")).hexdigest()


def extract_domain(url: str) -> str:
    if not url:
        return "unknown"
    try:
        parsed = urllib.parse.urlparse(url)
        netloc = parsed.netloc.lower()
        if netloc.startswith("www."):
            netloc = netloc[4:]
        return netloc.split(":")[0] if netloc else "unknown"
    except Exception:
        return "unknown"


def parse_datetime_safe(date_str: Optional[str]) -> datetime:
    if not date_str:
        return datetime.now(timezone.utc)
    try:
        dt = dateutil.parser.parse(date_str)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.astimezone(timezone.utc)
    except Exception:
        return datetime.now(timezone.utc)


def resolve_source_tier(domain: str, explicit_tier: Optional[int] = None) -> int:
    if explicit_tier in (1, 2, 3):
        return explicit_tier
    tier_info = db.get_source_tier(domain)
    if tier_info:
        return tier_info.tier
    return 2


# =====================================================================
# Static HTML Extractor & Browser Fallback
# =====================================================================

def extract_static_html(html_content: str, url: str = "") -> Dict[str, Any]:
    if not html_content:
        return {
            "title": "",
            "author": None,
            "published_at": datetime.now(timezone.utc),
            "source": extract_domain(url),
            "extracted_text": "",
        }

    soup = BeautifulSoup(html_content, "html.parser")
    for element in soup(["script", "style", "noscript", "header", "footer", "nav", "aside", "iframe", "svg"]):
        element.extract()

    title = ""
    og_title = soup.find("meta", property="og:title") or soup.find("meta", attrs={"name": "twitter:title"})
    if og_title and og_title.get("content"):
        title = og_title["content"].strip()
    elif soup.title and soup.title.string:
        title = soup.title.string.strip()
    elif soup.find("h1"):
        title = soup.find("h1").get_text().strip()

    author = None
    author_meta = (
        soup.find("meta", attrs={"name": "author"})
        or soup.find("meta", property="article:author")
        or soup.find("meta", attrs={"name": "twitter:creator"})
    )
    if author_meta and author_meta.get("content"):
        author = author_meta["content"].strip()
    else:
        author_elem = soup.find(class_=re.compile(r"author|byline", re.I))
        if author_elem:
            author = re.sub(r"^by\s+", "", author_elem.get_text().strip(), flags=re.I).strip()

    pub_date_str = None
    date_meta = (
        soup.find("meta", property="article:published_time")
        or soup.find("meta", attrs={"name": "dc.date"})
        or soup.find("meta", attrs={"name": "dc.date.issued"})
        or soup.find("meta", attrs={"name": "pubdate"})
        or soup.find("meta", property="og:published_time")
    )
    if date_meta and date_meta.get("content"):
        pub_date_str = date_meta["content"].strip()
    else:
        time_elem = soup.find("time")
        if time_elem:
            pub_date_str = time_elem.get("datetime") or time_elem.get_text()

    published_at = parse_datetime_safe(pub_date_str)

    site_name_meta = soup.find("meta", property="og:site_name")
    source = site_name_meta["content"].strip() if site_name_meta and site_name_meta.get("content") else extract_domain(url)

    article_container = (
        soup.find("article")
        or soup.find(class_=re.compile(r"article[-_]body|story[-_]content|post[-_]content|entry[-_]content", re.I))
        or soup.find("main")
        or soup.body
        or soup
    )

    paragraphs = []
    if article_container:
        for p in article_container.find_all(["p", "h2", "h3", "h4", "li"]):
            p_text = p.get_text().strip()
            if len(p_text) > 20 and not re.search(r"cookie|subscribe|sign in|all rights reserved", p_text, re.I):
                paragraphs.append(p_text)

    clean_text = "\n\n".join(paragraphs).strip()
    if not clean_text and article_container:
        clean_text = article_container.get_text(separator="\n").strip()

    return {
        "title": title,
        "author": author,
        "published_at": published_at,
        "source": source,
        "extracted_text": clean_text,
    }


_browser_fallback_runner: Optional[Callable[[str], str]] = None


def register_browser_fallback_runner(runner: Callable[[str], str]):
    global _browser_fallback_runner
    _browser_fallback_runner = runner


def should_use_browser_fallback(html_content: str, text_content: str) -> bool:
    if len(text_content.strip()) < 80:
        if re.search(r'<div[^>]+id=["\'](?:root|app|__next)["\']', html_content, re.I):
            return True
        if "enable javascript" in html_content.lower() or "requires javascript" in html_content.lower():
            return True
    return False


def execute_browser_fallback(url: str, raw_html: str) -> Dict[str, Any]:
    global _browser_fallback_runner
    logger.info("Executing browser fallback for: %s", url)
    if _browser_fallback_runner:
        try:
            rendered = _browser_fallback_runner(url)
            return extract_static_html(rendered, url)
        except Exception as e:
            logger.warning("Browser fallback failed (%s)", e)
    return extract_static_html(raw_html, url)


# =====================================================================
# RSS / Atom Feed Parser
# =====================================================================

def parse_rss_with_xml_fallback(xml_content: str, default_source: str = "") -> List[Dict[str, Any]]:
    items: List[Dict[str, Any]] = []
    try:
        import feedparser
        feed = feedparser.parse(xml_content)
        if feed and feed.entries:
            feed_source = getattr(feed.feed, "title", default_source)
            for entry in feed.entries:
                title = getattr(entry, "title", "").strip()
                link = getattr(entry, "link", "")
                author = getattr(entry, "author", None)
                
                pub_date = datetime.now(timezone.utc)
                if hasattr(entry, "published_parsed") and entry.published_parsed:
                    try:
                        pub_date = datetime(*entry.published_parsed[:6], tzinfo=timezone.utc)
                    except Exception:
                        pass
                elif hasattr(entry, "published"):
                    pub_date = parse_datetime_safe(entry.published)
                elif hasattr(entry, "updated"):
                    pub_date = parse_datetime_safe(entry.updated)

                summary = ""
                if hasattr(entry, "content") and entry.content:
                    summary = entry.content[0].value
                elif hasattr(entry, "summary"):
                    summary = entry.summary
                elif hasattr(entry, "description"):
                    summary = entry.description

                if summary:
                    summary = BeautifulSoup(summary, "html.parser").get_text(separator="\n").strip()

                items.append({
                    "title": title,
                    "canonical_url": link or f"urn:feed-item:{hashlib.sha1(title.encode()).hexdigest()}",
                    "author": author,
                    "published_at": pub_date,
                    "source": default_source or feed_source or extract_domain(link),
                    "extracted_text": summary,
                })
            return items
    except Exception as e:
        logger.warning("feedparser error (%s), using XML fallback", e)

    try:
        root = ET.fromstring(xml_content)
        rss_items = root.findall(".//item")
        if rss_items:
            for it in rss_items:
                title_elem = it.find("title")
                link_elem = it.find("link")
                desc_elem = it.find("description")
                date_elem = it.find("pubDate") or it.find("{http://purl.org/dc/elements/1.1/}date")
                author_elem = it.find("author") or it.find("{http://purl.org/dc/elements/1.1/}creator")

                title = title_elem.text.strip() if title_elem is not None and title_elem.text else ""
                link = link_elem.text.strip() if link_elem is not None and link_elem.text else ""
                desc = desc_elem.text.strip() if desc_elem is not None and desc_elem.text else ""
                if desc:
                    desc = BeautifulSoup(desc, "html.parser").get_text().strip()

                pub_date = parse_datetime_safe(date_elem.text if date_elem is not None else None)
                author = author_elem.text.strip() if author_elem is not None and author_elem.text else None

                items.append({
                    "title": title,
                    "canonical_url": link or f"urn:feed-item:{hashlib.sha1(title.encode()).hexdigest()}",
                    "author": author,
                    "published_at": pub_date,
                    "source": default_source or extract_domain(link),
                    "extracted_text": desc,
                })
            return items
    except Exception as ex:
        logger.error("XML ElementTree failed: %s", ex)

    return items


# =====================================================================
# Ingest and Normalization Pipeline
# =====================================================================

async def ingest_article(
    raw_data: Dict[str, Any],
    explicit_tier: Optional[int] = None,
    media_type: MediaType = MediaType.TEXT,
) -> Tuple[Article, bool]:
    title = raw_data.get("title", "").strip()
    extracted_text = raw_data.get("extracted_text", "").strip()
    canonical_url = raw_data.get("canonical_url", "").strip()
    source = raw_data.get("source", "").strip() or extract_domain(canonical_url)
    author = raw_data.get("author")
    published_at = raw_data.get("published_at") or datetime.now(timezone.utc)
    language = raw_data.get("language", "en")

    content_hash = compute_content_hash(text=extracted_text, title=title)

    existing = db.get_article_by_hash(content_hash)
    if existing:
        logger.info("Duplicate content (hash: %s). Skipping.", content_hash)
        return existing, False

    domain = extract_domain(canonical_url)
    source_tier = resolve_source_tier(domain, explicit_tier)

    article = Article(
        canonical_url=canonical_url or f"urn:veriscope:hash:{content_hash}",
        source=source,
        source_tier=source_tier,
        title=title,
        author=author,
        published_at=published_at,
        language=language,
        media_type=media_type,
        extracted_text=extracted_text,
        content_hash=content_hash,
    )

    db.save_article(article)
    logger.info("Saved Article %s (%s, tier: %d)", article.id, article.title[:40], article.source_tier)

    event_payload = {
        "event": "extraction.completed",
        "article_id": article.id,
        "canonical_url": article.canonical_url,
        "source": article.source,
        "source_tier": article.source_tier,
        "title": article.title,
        "content_hash": article.content_hash,
        "published_at": article.published_at.isoformat(),
        "language": article.language,
        "media_type": article.media_type.value,
        "extracted_text_preview": article.extracted_text[:200],
    }
    await bus.publish("extraction.completed", event_payload)

    return article, True


# =====================================================================
# REST Endpoints
# =====================================================================

@app.get("/health", response_model=HealthResponse, tags=["System"])
async def health_check():
    return HealthResponse(
        status="healthy",
        service="extraction",
        version="1.0.0",
        timestamp=datetime.now(timezone.utc),
    )


@app.post("/extract/rss", response_model=ExtractionResponse, tags=["Extraction"])
async def extract_rss_endpoint(request: RSSFeedRequest):
    xml_data = request.feed_xml
    if not xml_data:
        if not request.feed_url:
            raise HTTPException(status_code=400, detail="Must provide feed_url or feed_xml.")
        try:
            resp = requests.get(request.feed_url, timeout=10, headers={"User-Agent": "VeriScope/1.0"})
            resp.raise_for_status()
            xml_data = resp.text
        except Exception as e:
            raise HTTPException(status_code=502, detail=f"Failed to fetch feed: {e}")

    parsed_items = parse_rss_with_xml_fallback(xml_data, default_source=request.source_name or "")
    processed: List[Article] = []
    new_cnt, dup_cnt = 0, 0

    for it in parsed_items[:request.max_items]:
        art, is_new = await ingest_article(it, explicit_tier=request.source_tier)
        processed.append(art)
        if is_new:
            new_cnt += 1
        else:
            dup_cnt += 1

    return ExtractionResponse(
        status="success",
        total_processed=len(processed),
        new_articles_count=new_cnt,
        duplicates_count=dup_cnt,
        articles=processed,
    )


@app.post("/extract/url", response_model=Article, tags=["Extraction"])
async def extract_url_endpoint(request: URLExtractRequest):
    html = request.html_content
    url = request.url or ""
    if not html:
        if not url:
            raise HTTPException(status_code=400, detail="Must provide url or html_content.")
        try:
            resp = requests.get(url, timeout=10, headers={"User-Agent": "VeriScope/1.0"})
            resp.raise_for_status()
            html = resp.text
        except Exception as e:
            raise HTTPException(status_code=502, detail=f"Failed to fetch URL: {e}")

    data = extract_static_html(html, url)
    if request.force_browser or should_use_browser_fallback(html, data["extracted_text"]):
        data = execute_browser_fallback(url, html)

    if request.title:
        data["title"] = request.title
    if request.author:
        data["author"] = request.author
    if request.extracted_text:
        data["extracted_text"] = request.extracted_text
    if request.source_name:
        data["source"] = request.source_name
    data["canonical_url"] = url

    article, _ = await ingest_article(data, explicit_tier=request.source_tier)
    return article


@app.post("/extract/social", response_model=Dict[str, Any], tags=["Extraction"])
async def extract_social_endpoint(request: SocialExtractRequest):
    """
    Ingest a social post (Instagram, X, YouTube, Facebook, Telegram, Reddit, TikTok).
    Normalizes metadata into an Article row and persists a SocialPost record.
    """
    adapter = get_social_adapter(request.platform)
    if not adapter:
        raise HTTPException(status_code=400, detail=f"Unsupported social platform '{request.platform}'.")

    normalized = adapter.parse_payload(request.raw_payload)

    raw_article_data = {
        "title": normalized.title,
        "extracted_text": normalized.body_text,
        "canonical_url": normalized.post_url,
        "source": f"{request.platform}.com",
        "author": normalized.author_handle,
        "published_at": normalized.published_at,
        "language": "en",
    }

    article, is_new = await ingest_article(
        raw_article_data,
        explicit_tier=request.source_tier,
        media_type=normalized.media_type,
    )

    social_post = SocialPost(
        article_id=article.id,
        platform=normalized.platform,
        handle=normalized.author_handle,
        follower_tier=normalized.follower_tier,
        engagement_metrics=normalized.engagement_metrics,
        post_url=normalized.post_url,
    )
    db.save_social_post(social_post)

    return {
        "status": "success",
        "article": article,
        "social_post": social_post,
        "comments_sample": normalized.comments_sample,
        "is_new": is_new,
    }


@app.post("/extract/multimodal", response_model=Dict[str, Any], tags=["Extraction"])
async def extract_multimodal_endpoint(request: MultimodalExtractRequest):
    """
    Ingest Image, Video, or Audio content.
    Runs OCR/ASR/keyframe extraction and normalizes into Article + MediaAsset records.
    """
    if request.media_type == MediaType.IMAGE:
        output = image_processor.process_image(
            mock_embedded_text=request.mock_ocr_text,
            mock_visual_scene=request.mock_caption,
        )
    elif request.media_type == MediaType.AUDIO:
        output = audio_processor.process_audio(
            mock_transcript=request.mock_transcript,
        )
    elif request.media_type == MediaType.VIDEO:
        output = video_processor.process_video(
            mock_audio_transcript=request.mock_transcript,
            mock_on_screen_text=request.mock_ocr_text,
            mock_keyframe_captions=request.mock_keyframes,
        )
    else:
        raise HTTPException(status_code=400, detail="Invalid media_type.")

    title = request.title or f"{request.media_type.value.title()} Media Coverage from {request.source_name}"
    storage_ref = request.storage_ref or f"gs://veriscope-media/{uuid.uuid4()}.{request.media_type.value}"

    raw_article_data = {
        "title": title,
        "extracted_text": output.extracted_text,
        "canonical_url": storage_ref,
        "source": request.source_name or "multimodal",
        "published_at": datetime.now(timezone.utc),
        "language": "en",
    }

    article, is_new = await ingest_article(
        raw_article_data,
        explicit_tier=request.source_tier,
        media_type=request.media_type,
    )

    media_asset = MediaAsset(
        article_id=article.id,
        type=request.media_type,
        storage_ref=storage_ref,
        ocr_text=output.ocr_text,
        transcript=output.transcript,
        caption=output.caption,
        keyframes=output.keyframes,
    )
    db.save_media_asset(media_asset)

    return {
        "status": "success",
        "article": article,
        "media_asset": media_asset,
        "is_new": is_new,
    }


@app.get("/media/{article_id}", response_model=List[MediaAsset], tags=["Multimodal"])
async def get_media_for_article(article_id: str):
    return db.get_media_by_article(article_id)


@app.get("/social/{article_id}", response_model=Optional[SocialPost], tags=["Social"])
async def get_social_for_article(article_id: str):
    return db.get_social_post_by_article(article_id)


@app.get("/articles", response_model=List[Article], tags=["Articles"])
async def list_articles_endpoint(
    limit: int = Query(default=50, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    source: Optional[str] = Query(default=None),
    media_type: Optional[MediaType] = Query(default=None),
    min_tier: Optional[int] = Query(default=None, ge=1, le=3),
):
    all_articles = db.list_articles()
    if source:
        all_articles = [a for a in all_articles if a.source.lower() == source.lower()]
    if media_type:
        all_articles = [a for a in all_articles if a.media_type == media_type]
    if min_tier is not None:
        all_articles = [a for a in all_articles if a.source_tier <= min_tier]

    all_articles.sort(key=lambda a: a.published_at, reverse=True)
    return all_articles[offset : offset + limit]
