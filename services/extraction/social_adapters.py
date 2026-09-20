"""
VeriScope Social Platform Adapters
Compliant with PRD Section 7.2, 8.2 & TRD Section 3, 5.2 (Official APIs only)

Supported Platforms:
- Instagram (Instagram Graph API Business)
- X / Twitter (X API v2)
- YouTube (YouTube Data API v3)
- Facebook (Facebook Graph API)
- Telegram (Telegram Bot API - Public Channels)
- Reddit (Reddit API / PRAW)
"""

from datetime import datetime, timezone
import logging
from typing import Any, Dict, List, Optional
from pydantic import BaseModel

from services.common.models import MediaType, SocialPost

logger = logging.getLogger("veriscope.social_adapters")


class NormalizedSocialContent(BaseModel):
    title: str
    body_text: str
    author_handle: str
    published_at: datetime
    platform: str
    post_url: str
    follower_tier: str = "standard"
    engagement_metrics: Dict[str, Any] = {}
    media_urls: List[str] = []
    media_type: MediaType = MediaType.TEXT
    comments_sample: List[str] = []


class SocialPlatformAdapter:
    platform_name: str = "base"

    def parse_payload(self, raw_data: Dict[str, Any]) -> NormalizedSocialContent:
        raise NotImplementedError


class InstagramAdapter(SocialPlatformAdapter):
    platform_name: str = "instagram"

    def parse_payload(self, raw_data: Dict[str, Any]) -> NormalizedSocialContent:
        caption = raw_data.get("caption", "").strip()
        handle = raw_data.get("username", raw_data.get("handle", "unknown_ig_user"))
        media_urls = raw_data.get("media_urls", [])
        if raw_data.get("media_url") and raw_data["media_url"] not in media_urls:
            media_urls.append(raw_data["media_url"])

        comments = raw_data.get("comments", [])
        engagement = {
            "like_count": raw_data.get("like_count", 0),
            "comments_count": raw_data.get("comments_count", len(comments)),
        }

        # Determine media type
        ig_type = raw_data.get("media_type", "IMAGE").upper()
        mtype = MediaType.VIDEO if "VIDEO" in ig_type else (MediaType.IMAGE if media_urls else MediaType.TEXT)

        title = f"Instagram post by @{handle}: {caption[:60]}..." if len(caption) > 60 else f"Instagram post by @{handle}: {caption}"

        return NormalizedSocialContent(
            title=title,
            body_text=caption,
            author_handle=f"@{handle.lstrip('@')}",
            published_at=raw_data.get("timestamp") or datetime.now(timezone.utc),
            platform="instagram",
            post_url=raw_data.get("permalink", f"https://instagram.com/p/{raw_data.get('id', 'mock_id')}"),
            follower_tier=raw_data.get("follower_tier", "standard"),
            engagement_metrics=engagement,
            media_urls=media_urls,
            media_type=mtype,
            comments_sample=comments[:5],
        )


class XTwitterAdapter(SocialPlatformAdapter):
    platform_name: str = "x"

    def parse_payload(self, raw_data: Dict[str, Any]) -> NormalizedSocialContent:
        text = raw_data.get("text", raw_data.get("full_text", "")).strip()
        handle = raw_data.get("author_handle", raw_data.get("username", "unknown_x_user"))
        engagement = {
            "retweet_count": raw_data.get("retweet_count", 0),
            "like_count": raw_data.get("like_count", 0),
            "reply_count": raw_data.get("reply_count", 0),
        }
        thread_replies = raw_data.get("thread_replies", [])
        full_body = f"{text}\n\n" + "\n".join([f"Reply: {r}" for r in thread_replies]) if thread_replies else text

        media_urls = raw_data.get("media_urls", [])
        mtype = MediaType.IMAGE if media_urls else MediaType.TEXT

        return NormalizedSocialContent(
            title=f"Post on X by @{handle.lstrip('@')}: {text[:70]}...",
            body_text=full_body.strip(),
            author_handle=f"@{handle.lstrip('@')}",
            published_at=raw_data.get("created_at") or datetime.now(timezone.utc),
            platform="x",
            post_url=raw_data.get("post_url", f"https://x.com/{handle}/status/{raw_data.get('id', '123')}"),
            follower_tier=raw_data.get("follower_tier", "standard"),
            engagement_metrics=engagement,
            media_urls=media_urls,
            media_type=mtype,
            comments_sample=thread_replies[:5],
        )


class YouTubeAdapter(SocialPlatformAdapter):
    platform_name: str = "youtube"

    def parse_payload(self, raw_data: Dict[str, Any]) -> NormalizedSocialContent:
        title = raw_data.get("title", "YouTube Video").strip()
        description = raw_data.get("description", "").strip()
        transcript = raw_data.get("transcript", "").strip()
        channel = raw_data.get("channel_title", raw_data.get("author", "YouTube Creator"))

        body_parts = []
        if description:
            body_parts.append(f"Description:\n{description}")
        if transcript:
            body_parts.append(f"Video Transcript:\n{transcript}")
        body_text = "\n\n".join(body_parts) if body_parts else title

        engagement = {
            "view_count": raw_data.get("view_count", 0),
            "like_count": raw_data.get("like_count", 0),
            "comment_count": raw_data.get("comment_count", 0),
        }

        return NormalizedSocialContent(
            title=title,
            body_text=body_text,
            author_handle=channel,
            published_at=raw_data.get("published_at") or datetime.now(timezone.utc),
            platform="youtube",
            post_url=raw_data.get("video_url", f"https://youtube.com/watch?v={raw_data.get('video_id', 'mock_vid')}"),
            follower_tier=raw_data.get("follower_tier", "verified_channel"),
            engagement_metrics=engagement,
            media_urls=[raw_data.get("thumbnail_url", "")],
            media_type=MediaType.VIDEO,
            comments_sample=raw_data.get("top_comments", [])[:5],
        )


class FacebookAdapter(SocialPlatformAdapter):
    platform_name: str = "facebook"

    def parse_payload(self, raw_data: Dict[str, Any]) -> NormalizedSocialContent:
        message = raw_data.get("message", raw_data.get("post_text", "")).strip()
        page_name = raw_data.get("page_name", "Public Page")
        engagement = {
            "shares": raw_data.get("shares_count", 0),
            "reactions": raw_data.get("reactions_count", 0),
        }

        return NormalizedSocialContent(
            title=f"Facebook post by {page_name}: {message[:60]}...",
            body_text=message,
            author_handle=page_name,
            published_at=raw_data.get("created_time") or datetime.now(timezone.utc),
            platform="facebook",
            post_url=raw_data.get("permalink_url", f"https://facebook.com/{raw_data.get('id', 'post_1')}"),
            follower_tier=raw_data.get("follower_tier", "standard"),
            engagement_metrics=engagement,
            media_urls=raw_data.get("media_urls", []),
            media_type=MediaType.TEXT,
            comments_sample=raw_data.get("comments", [])[:5],
        )


class TelegramAdapter(SocialPlatformAdapter):
    platform_name: str = "telegram"

    def parse_payload(self, raw_data: Dict[str, Any]) -> NormalizedSocialContent:
        text = raw_data.get("text", raw_data.get("message", "")).strip()
        channel = raw_data.get("channel_username", "public_channel")
        views = raw_data.get("views", 0)

        return NormalizedSocialContent(
            title=f"Telegram message in @{channel}: {text[:60]}...",
            body_text=text,
            author_handle=f"@{channel.lstrip('@')}",
            published_at=raw_data.get("date") or datetime.now(timezone.utc),
            platform="telegram",
            post_url=f"https://t.me/{channel}/{raw_data.get('message_id', '1')}",
            follower_tier=raw_data.get("channel_tier", "standard"),
            engagement_metrics={"views": views, "forwards": raw_data.get("forwards", 0)},
            media_urls=raw_data.get("media_urls", []),
            media_type=MediaType.TEXT,
            comments_sample=[],
        )


class RedditAdapter(SocialPlatformAdapter):
    platform_name: str = "reddit"

    def parse_payload(self, raw_data: Dict[str, Any]) -> NormalizedSocialContent:
        title = raw_data.get("title", "").strip()
        selftext = raw_data.get("selftext", "").strip()
        subreddit = raw_data.get("subreddit", "news")
        author = raw_data.get("author", "redditor")
        top_comments = raw_data.get("top_comments", [])

        body_parts = [selftext] if selftext else []
        if top_comments:
            body_parts.append("Top Community Comments:\n" + "\n".join([f"- {c}" for c in top_comments[:5]]))
        full_text = "\n\n".join(body_parts) if body_parts else title

        engagement = {
            "score": raw_data.get("score", 0),
            "upvote_ratio": raw_data.get("upvote_ratio", 1.0),
            "num_comments": raw_data.get("num_comments", len(top_comments)),
        }

        return NormalizedSocialContent(
            title=f"[r/{subreddit}] {title}",
            body_text=full_text,
            author_handle=f"u/{author}",
            published_at=raw_data.get("created_utc") or datetime.now(timezone.utc),
            platform="reddit",
            post_url=raw_data.get("url", f"https://reddit.com/r/{subreddit}/comments/{raw_data.get('id', 'post')}"),
            follower_tier=raw_data.get("follower_tier", "standard"),
            engagement_metrics=engagement,
            media_urls=raw_data.get("media_urls", []),
            media_type=MediaType.TEXT,
            comments_sample=top_comments[:5],
        )


# Factory lookup
SOCIAL_ADAPTERS: Dict[str, SocialPlatformAdapter] = {
    "instagram": InstagramAdapter(),
    "x": XTwitterAdapter(),
    "twitter": XTwitterAdapter(),
    "youtube": YouTubeAdapter(),
    "facebook": FacebookAdapter(),
    "telegram": TelegramAdapter(),
    "reddit": RedditAdapter(),
}


def get_social_adapter(platform: str) -> Optional[SocialPlatformAdapter]:
    return SOCIAL_ADAPTERS.get(platform.lower().strip())

