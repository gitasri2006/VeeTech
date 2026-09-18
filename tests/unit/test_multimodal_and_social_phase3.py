"""
Unit Tests for VeriScope Phase 3 Social Platform Adapters & Multimodal Sub-Modules
Compliant with PRD Section 7.2, 8.2, 8.3 & TRD Section 5.2
"""

from datetime import datetime, timezone
import pytest

from services.common.models import MediaType
from services.extraction.social_adapters import (
    get_social_adapter,
    InstagramAdapter,
    XTwitterAdapter,
    YouTubeAdapter,
    RedditAdapter,
    TelegramAdapter,
    FacebookAdapter,
    TikTokAdapter,
)
from services.extraction.multimodal_processor import (
    ImageProcessor,
    AudioProcessor,
    VideoProcessor,
)


def test_instagram_adapter_parsing():
    adapter = get_social_adapter("instagram")
    assert isinstance(adapter, InstagramAdapter)

    payload = {
        "id": "ig_12345",
        "username": "techradar",
        "caption": "Excited to test the new humanoid robotics platform from @acmerobotics! #AI #Robotics",
        "like_count": 4500,
        "comments": ["Looks incredible!", "When is the launch?"],
        "media_type": "IMAGE",
        "media_url": "https://cdn.instagram.com/p/123.jpg",
        "timestamp": datetime.now(timezone.utc),
    }

    res = adapter.parse_payload(payload)
    assert res.platform == "instagram"
    assert res.author_handle == "@techradar"
    assert "humanoid robotics platform" in res.body_text
    assert res.media_type == MediaType.IMAGE
    assert res.engagement_metrics["like_count"] == 4500
    assert len(res.comments_sample) == 2


def test_x_twitter_adapter_parsing():
    adapter = get_social_adapter("x")
    assert isinstance(adapter, XTwitterAdapter)

    payload = {
        "id": "x_98765",
        "username": "elonmusk",
        "text": "Tesla Full Self Driving v13 rollout starting this weekend.",
        "retweet_count": 12000,
        "like_count": 85000,
        "thread_replies": ["Excited for the test drive", "Does it include highway end-to-end?"],
    }

    res = adapter.parse_payload(payload)
    assert res.platform == "x"
    assert res.author_handle == "@elonmusk"
    assert "Tesla Full Self Driving" in res.body_text
    assert "Reply: Excited for the test drive" in res.body_text
    assert res.engagement_metrics["retweet_count"] == 12000


def test_youtube_adapter_parsing():
    adapter = get_social_adapter("youtube")
    assert isinstance(adapter, YouTubeAdapter)

    payload = {
        "video_id": "yt_abc123",
        "title": "Quantum Supremacy Demo at MIT Lab",
        "description": "In-depth look at 1000-qubit neutral atom processor.",
        "transcript": "Hello everyone, today we demonstrate coherent superposition across 1000 qubits.",
        "channel_title": "MIT Quantum Group",
        "view_count": 250000,
        "like_count": 15000,
    }

    res = adapter.parse_payload(payload)
    assert res.platform == "youtube"
    assert res.media_type == MediaType.VIDEO
    assert "Quantum Supremacy Demo" in res.title
    assert "coherent superposition" in res.body_text
    assert res.author_handle == "MIT Quantum Group"


def test_reddit_adapter_parsing():
    adapter = get_social_adapter("reddit")
    assert isinstance(adapter, RedditAdapter)

    payload = {
        "id": "t3_rdt123",
        "subreddit": "artificial",
        "author": "deeplearn_guru",
        "title": "Discussion on multimodal reasoning architectures",
        "selftext": "What are your thoughts on native video understanding models?",
        "score": 450,
        "top_comments": ["Cross-attention is key", "Latency remains the primary hurdle"],
    }

    res = adapter.parse_payload(payload)
    assert res.platform == "reddit"
    assert "[r/artificial]" in res.title
    assert "Cross-attention is key" in res.body_text
    assert res.author_handle == "u/deeplearn_guru"


def test_telegram_adapter_parsing():
    adapter = get_social_adapter("telegram")
    assert isinstance(adapter, TelegramAdapter)

    payload = {
        "channel_username": "breakingnews_wire",
        "message_id": 4451,
        "text": "Flash: Global trade negotiations conclude in Geneva.",
        "views": 32000,
    }

    res = adapter.parse_payload(payload)
    assert res.platform == "telegram"
    assert res.author_handle == "@breakingnews_wire"
    assert "Flash: Global trade" in res.body_text
    assert res.engagement_metrics["views"] == 32000


def test_image_processor_ocr_and_captioning():
    output = ImageProcessor.process_image(
        mock_embedded_text="Breaking: Central Bank Announces 0.5% Interest Rate Cut",
        mock_visual_scene="Press conference with Governor standing at podium with official seal.",
    )
    assert output.media_type == MediaType.IMAGE
    assert output.ocr_text == "Breaking: Central Bank Announces 0.5% Interest Rate Cut"
    assert "Press conference with Governor" in output.caption
    assert "[Image OCR Text]" in output.extracted_text
    assert "[Image Visual Caption]" in output.extracted_text


def test_audio_processor_asr_transcription():
    output = AudioProcessor.process_audio(
        mock_transcript="Welcome to the Tech Daily Podcast. Today we cover semiconductor supply chains.",
    )
    assert output.media_type == MediaType.AUDIO
    assert output.transcript == "Welcome to the Tech Daily Podcast. Today we cover semiconductor supply chains."
    assert "[Audio Transcript]" in output.extracted_text


def test_video_processor_composite_extraction():
    output = VideoProcessor.process_video(
        mock_audio_transcript="CEO presents new electric aircraft prototype.",
        mock_on_screen_text="Lower Third: AeroCorp CEO Johnathan Vance",
        mock_keyframe_captions=[
            "Keyframe 00:10 - Aircraft taxiing on runway",
            "Keyframe 01:00 - High altitude test flight demonstration",
        ],
    )
    assert output.media_type == MediaType.VIDEO
    assert output.transcript == "CEO presents new electric aircraft prototype."
    assert output.ocr_text == "Lower Third: AeroCorp CEO Johnathan Vance"
    assert len(output.keyframes) == 2
    assert "[Video Audio Track]" in output.extracted_text
    assert "[On-Screen Text]" in output.extracted_text
    assert "[Keyframe Visual Descriptions]" in output.extracted_text
