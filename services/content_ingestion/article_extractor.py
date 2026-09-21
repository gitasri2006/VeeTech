"""
Discovery News Article Extractor
Safely extracts clean article body text, author, publication date, hero image, and metadata
without ads, navigation menus, tracking scripts, or boilerplate.
"""

import json
import logging
import urllib.parse
from datetime import datetime
from typing import Optional, Tuple

from bs4 import BeautifulSoup
import httpx
import trafilatura

from services.content_ingestion.models import ArticleContent
from services.content_ingestion.ssrf_validator import validate_url_safety

logger = logging.getLogger("discovery.article_extractor")

MAX_RESPONSE_SIZE_BYTES = 5 * 1024 * 1024  # 5 MB limit
REQUEST_TIMEOUT_SECONDS = 6.0
DEFAULT_USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 (compatible; DiscoveryIntelligence/3.5; +https://discovery.ai/bot)"


async def fetch_html_safely(url: str) -> Tuple[Optional[str], Optional[str], Optional[str]]:
    """
    Safely fetches HTML content with SSRF checks, size limits, and timeout.
    Returns (html_string, final_url, error_message).
    """
    is_safe, reason = validate_url_safety(url)
    if not is_safe:
        return None, None, f"Security policy blocked URL: {reason}"

    headers = {
        "User-Agent": DEFAULT_USER_AGENT,
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9,ta;q=0.8",
    }

    try:
        async with httpx.AsyncClient(
            timeout=REQUEST_TIMEOUT_SECONDS,
            follow_redirects=True,
            max_redirects=5,
            verify=False,  # Allow self-signed/gov certs
        ) as client:
            resp = await client.get(url, headers=headers)
            
            # Check redirect destination for SSRF
            final_url = str(resp.url)
            is_final_safe, final_reason = validate_url_safety(final_url)
            if not is_final_safe:
                return None, None, f"Redirect destination blocked: {final_reason}"

            if resp.status_code >= 400:
                return None, None, f"HTTP status error: {resp.status_code}"

            content_type = resp.headers.get("content-type", "").lower()
            if "text/html" not in content_type and "xhtml" not in content_type and "xml" not in content_type:
                return None, None, f"Non-HTML content type received: {content_type}"

            content_bytes = resp.content
            if len(content_bytes) > MAX_RESPONSE_SIZE_BYTES:
                return None, None, "Response size exceeded 5MB safety limit."

            html_text = resp.text
            return html_text, final_url, None

    except httpx.TimeoutException:
        return None, None, "Request timed out while connecting to source."
    except httpx.ConnectError:
        return None, None, "Failed to establish connection to source server."
    except Exception as exc:
        return None, None, f"Network error during extraction: {str(exc)}"


def extract_metadata_fallback(soup: BeautifulSoup, fallback_url: str) -> Tuple[Optional[str], Optional[str], Optional[str], Optional[str]]:
    """Extracts title, author, date, and hero image from HTML open graph / meta tags."""
    title = None
    author = None
    published_at = None
    hero_image = None

    # Title
    og_title = soup.find("meta", property="og:title") or soup.find("meta", attrs={"name": "twitter:title"})
    if og_title and og_title.get("content"):
        title = og_title["content"].strip()
    elif soup.title and soup.title.string:
        title = soup.title.string.strip()

    # Author
    meta_author = (
        soup.find("meta", attrs={"name": "author"})
        or soup.find("meta", property="article:author")
        or soup.find("meta", attrs={"name": "twitter:creator"})
    )
    if meta_author and meta_author.get("content"):
        author = meta_author["content"].strip()

    # Published Date
    meta_date = (
        soup.find("meta", property="article:published_time")
        or soup.find("meta", attrs={"name": "publication_date"})
        or soup.find("meta", attrs={"name": "date"})
        or soup.find("meta", property="og:published_time")
    )
    if meta_date and meta_date.get("content"):
        published_at = meta_date["content"].strip()

    # Hero Image
    og_image = soup.find("meta", property="og:image") or soup.find("meta", attrs={"name": "twitter:image"})
    if og_image and og_image.get("content"):
        img_url = og_image["content"].strip()
        if img_url.startswith("//"):
            img_url = "https:" + img_url
        elif img_url.startswith("/"):
            parsed = urllib.parse.urlparse(fallback_url)
            img_url = f"{parsed.scheme}://{parsed.netloc}{img_url}"
        hero_image = img_url

    return title, author, published_at, hero_image


async def extract_article_content(url: str, fallback_title: Optional[str] = None, fallback_snippet: Optional[str] = None) -> Tuple[Optional[ArticleContent], Optional[str]]:
    """
    Extracts high-quality clean article text and metadata.
    Returns (ArticleContent, error_message).
    """
    html_text, final_url, err = await fetch_html_safely(url)
    if not html_text:
        return None, err or "Content could not be retrieved."

    # Parse with BeautifulSoup for metadata tags
    soup = BeautifulSoup(html_text, "html.parser")
    fb_title, fb_author, fb_date, hero_image = extract_metadata_fallback(soup, final_url or url)

    # Use Trafilatura for clean text and structured extraction
    extracted_text = None
    traf_metadata = None
    try:
        extracted_text = trafilatura.extract(
            html_text,
            include_comments=False,
            include_tables=True,
            include_images=False,
            include_links=False,
            output_format="txt",
        )
        traf_metadata = trafilatura.extract_metadata(html_text)
    except Exception as exc:
        logger.debug("Trafilatura extraction notice: %s", exc)

    # Fallback to BeautifulSoup if trafilatura returned empty
    if not extracted_text or len(extracted_text.strip()) < 80:
        paragraphs = []
        for p in soup.find_all("p"):
            p_text = p.get_text().strip()
            if len(p_text) > 30:
                paragraphs.append(p_text)
        if paragraphs:
            extracted_text = "\n\n".join(paragraphs)

    # If still empty, use fallback snippet if available
    if not extracted_text or len(extracted_text.strip()) < 40:
        if fallback_snippet and len(fallback_snippet.strip()) > 30:
            extracted_text = fallback_snippet.strip()
        else:
            return None, "Article text could not be extracted from this publisher."

    # Consolidate metadata
    final_title = (
        (traf_metadata.title if traf_metadata and traf_metadata.title else None)
        or fb_title
        or fallback_title
        or "Extracted Article"
    )
    final_author = (
        (traf_metadata.author if traf_metadata and traf_metadata.author else None)
        or fb_author
    )
    final_date = (
        (traf_metadata.date if traf_metadata and traf_metadata.date else None)
        or fb_date
    )
    hero_img = (
        (traf_metadata.image if traf_metadata and traf_metadata.image else None)
        or hero_image
    )
    language = (
        traf_metadata.language if traf_metadata and traf_metadata.language else "en"
    )

    parsed_domain = urllib.parse.urlparse(final_url or url).netloc.replace("www.", "")
    words = extracted_text.split()
    word_count = len(words)
    reading_time = max(1, word_count // 200)
    excerpt = extracted_text[:280] + "..." if len(extracted_text) > 280 else extracted_text

    article = ArticleContent(
        title=final_title,
        author=final_author,
        published_at=final_date,
        source_name=parsed_domain,
        canonical_url=final_url or url,
        language=language,
        hero_image=hero_img,
        excerpt=excerpt,
        text=extracted_text,
        word_count=word_count,
        reading_time_minutes=reading_time,
    )
    return article, None
