"""
Integration Tests for VeriScope Phase 3 Pipeline
Tests: Social Media Ingestion (Instagram, X, YouTube) and Multimodal Ingestion (Image, Audio, Video)
Verifies: Normalized Article + MediaAsset + SocialPost persistence and Event Bus publishing
"""

import pytest
from fastapi.testclient import TestClient

from services.common.bus import bus
from services.common.db import db
from services.common.models import MediaType
from services.registry import get_extraction_service

extract_mod = get_extraction_service()
client = TestClient(extract_mod.app)


@pytest.fixture(autouse=True)
def clean_extraction_state():
    db.articles.clear()
    db.media_assets.clear()
    db.social_posts.clear()
    bus.clear()
    yield
    db.articles.clear()
    db.media_assets.clear()
    db.social_posts.clear()
    bus.clear()


def test_social_ingestion_endpoint():
    """Verify POST /extract/social creates normalized Article + SocialPost."""
    payload = {
        "platform": "instagram",
        "raw_payload": {
            "id": "ig_post_999",
            "username": "fintechnews",
            "caption": "Stripe expands corporate billing suite with real-time tax compliance features in 50 countries.",
            "like_count": 8900,
            "media_type": "IMAGE",
            "media_url": "https://cdn.instagram.com/p/tax_update.jpg",
        },
        "source_tier": 2,
    }

    resp = client.post("/extract/social", json=payload)
    assert resp.status_code == 200
    data = resp.json()

    assert data["status"] == "success"
    article = data["article"]
    social = data["social_post"]

    assert "Stripe expands corporate billing" in article["extracted_text"]
    assert article["source"] == "instagram.com"
    assert article["source_tier"] == 2
    assert social["platform"] == "instagram"
    assert social["handle"] == "@fintechnews"
    assert social["engagement_metrics"]["like_count"] == 8900

    # Check persistence
    assert db.get_article(article["id"]) is not None
    assert db.get_social_post_by_article(article["id"]) is not None

    # Check event bus
    events = bus.get_messages("extraction.completed")
    assert any(e["article_id"] == article["id"] for e in events)


def test_multimodal_image_ingestion_endpoint():
    """Verify POST /extract/multimodal for Image creates Article + MediaAsset with OCR."""
    payload = {
        "media_type": "image",
        "storage_ref": "gs://veriscope-assets/infographic_01.png",
        "title": "Quarterly Financial Overview Infographic",
        "source_name": "analyst_upload",
        "mock_ocr_text": "Net Revenue: $4.2B (+24% YoY). Operating Margin: 28%.",
        "mock_caption": "Bar chart illustrating consecutive quarterly revenue expansion.",
    }

    resp = client.post("/extract/multimodal", json=payload)
    assert resp.status_code == 200
    data = resp.json()

    article = data["article"]
    media = data["media_asset"]

    assert article["media_type"] == "image"
    assert "Net Revenue: $4.2B" in article["extracted_text"]
    assert media["type"] == "image"
    assert media["ocr_text"] == "Net Revenue: $4.2B (+24% YoY). Operating Margin: 28%."
    assert "Bar chart" in media["caption"]

    # Check DB persistence
    assert db.get_article(article["id"]) is not None
    media_list = db.get_media_by_article(article["id"])
    assert len(media_list) == 1
    assert media_list[0].id == media["id"]



def test_multimodal_video_ingestion_endpoint():
    """Verify POST /extract/multimodal for Video creates Article + MediaAsset with transcript & keyframes."""
    payload = {
        "media_type": "video",
        "storage_ref": "gs://veriscope-assets/press_conf.mp4",
        "title": "Autonomous Vehicle Safety Briefing",
        "mock_transcript": "Our latest safety benchmarks indicate a 99.99% obstacle avoidance reliability rating in heavy rain.",
        "mock_ocr_text": "Slide 4: LiDAR and Radar Sensor Fusion",
        "mock_keyframes": [
            "Keyframe 00:15 - Vehicle in rain testing tunnel",
            "Keyframe 01:20 - Sensor fusion point cloud visualization",
        ],
    }

    resp = client.post("/extract/multimodal", json=payload)
    assert resp.status_code == 200
    data = resp.json()

    article = data["article"]
    media = data["media_asset"]

    assert article["media_type"] == "video"
    assert "99.99% obstacle avoidance" in article["extracted_text"]
    assert media["transcript"] == "Our latest safety benchmarks indicate a 99.99% obstacle avoidance reliability rating in heavy rain."
    assert len(media["keyframes"]) == 2


def test_multimodal_audio_ingestion_endpoint():
    """Verify POST /extract/multimodal for Audio creates Article + MediaAsset with transcript."""
    payload = {
        "media_type": "audio",
        "storage_ref": "gs://veriscope-assets/earnings_call.mp3",
        "title": "Q3 2026 Earnings Call Recording",
        "mock_transcript": "We experienced accelerating enterprise demand for our automated fact verification APIs across Asia Pacific.",
    }

    resp = client.post("/extract/multimodal", json=payload)
    assert resp.status_code == 200
    data = resp.json()

    article = data["article"]
    media = data["media_asset"]

    assert article["media_type"] == "audio"
    assert "fact verification APIs" in article["extracted_text"]
    assert media["type"] == "audio"
    assert "fact verification APIs" in media["transcript"]
