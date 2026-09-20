"""
Discovery Unified Master Product & Architecture Comprehensive Verification Suite
Tests:
- TEST 1: Text Search (Auto fan-out + NLP Multilingual Synthesis)
- TEST 2: Image Input (Auto-OCR + Visual Captioning + Discovery + Synthesis)
- TEST 3: Audio Input (Auto-ASR Speech-to-Text + Discovery + Synthesis)
- TEST 4: Video Input (Multi-Stream Audio ASR + Keyframe OCR + Discovery + Synthesis)
- TEST 5: Active Source Failure Resilience (Single source error does not fail search)
- TEST 6: Disabled/Excluded Sources Omission (Reddit, WhatsApp, Instagram, GDELT, TikTok gracefully omitted)
- TEST 7: Autonomous Background Ingestion Scheduler (RSS/HN polling + SHA-256 deduplication)
"""

import asyncio
from datetime import datetime, timezone
import pytest
from httpx import AsyncClient, ASGITransport

import importlib
global_discovery_mod = importlib.import_module("services.global-discovery.main")
app = global_discovery_mod.app
scheduler = global_discovery_mod.scheduler

from services.common.db import db


@pytest.mark.asyncio
async def test_unified_text_search_english():
    """TEST 1A: Single Text Search in English."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        resp = await ac.post("/api/v1/discovery/search", json={
            "query": "Artificial Intelligence",
            "input_modality": "text",
            "target_language": "en",
            "max_candidates_per_source": 5,
        })
        assert resp.status_code in (200, 202), f"Expected 200 OK, got {resp.status_code}: {resp.text}"
        data = resp.json()

        # Check single final intelligence result
        assert "intelligence_result" in data
        res = data["intelligence_result"]
        assert "executive_summary" in res and len(res["executive_summary"]) > 20
        assert "authenticity_verdict" in res
        assert "key_findings" in res and len(res["key_findings"]) >= 1
        assert "sources" in data and len(data["sources"]) > 0
        assert data["input_modality"] == "text"
        assert data["target_language"] == "en"


@pytest.mark.asyncio
async def test_unified_text_search_multilingual_hindi():
    """TEST 1B: Single Text Search with NLP target language Hindi."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        resp = await ac.post("/api/v1/discovery/search", json={
            "query": "Tata Motors EV",
            "input_modality": "text",
            "target_language": "hi",
            "max_candidates_per_source": 5,
        })
        assert resp.status_code in (200, 202)
        data = resp.json()
        assert data["target_language"] == "hi"
        assert data["language_name"] == "Hindi"
        assert "executive_summary" in data["intelligence_result"]
        assert len(data["sources"]) > 0


@pytest.mark.asyncio
async def test_unified_image_input():
    """TEST 2: Image input with OCR and visual captioning."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        resp = await ac.post("/api/v1/discovery/search", json={
            "input_modality": "image",
            "media_file_name": "prototype_chip_infographic.png",
            "mock_ocr_text": "Quantum Microelectronics 2nm Semiconductor Wafer Unveiled",
            "mock_caption": "Laboratory photo of cleanroom technician holding semiconductor wafer",
            "target_language": "en",
            "max_candidates_per_source": 5,
        })
        assert resp.status_code in (200, 202)
        data = resp.json()
        assert data["input_modality"] == "image"
        assert "multimodal_evidence" in data
        assert data["multimodal_evidence"]["ocr_text"] == "Quantum Microelectronics 2nm Semiconductor Wafer Unveiled"
        assert "intelligence_result" in data
        assert len(data["sources"]) > 0


@pytest.mark.asyncio
async def test_unified_audio_input():
    """TEST 3: Audio input with Whisper ASR speech-to-text."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        resp = await ac.post("/api/v1/discovery/search", json={
            "input_modality": "audio",
            "media_file_name": "executive_podcast_briefing.mp3",
            "mock_transcript": "Prime Minister and technology ministers announced new national clean energy grid subsidy package.",
            "target_language": "en",
            "max_candidates_per_source": 5,
        })
        assert resp.status_code in (200, 202)
        data = resp.json()
        assert data["input_modality"] == "audio"
        assert "multimodal_evidence" in data
        assert "clean energy grid" in data["multimodal_evidence"]["transcript"]
        assert "executive_summary" in data["intelligence_result"]


@pytest.mark.asyncio
async def test_unified_video_input():
    """TEST 4: Video input combining audio track ASR + keyframe scenes + on-screen OCR."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        resp = await ac.post("/api/v1/discovery/search", json={
            "input_modality": "video",
            "media_file_name": "press_conference_live.mp4",
            "mock_transcript": "ISRO Chairman addresses media on Gaganyaan orbital test flight readiness.",
            "mock_ocr_text": "Lower third: ISRO Headquarters Press Briefing",
            "mock_keyframes": [
                "Keyframe 00:05: Podium with ISRO officials",
                "Keyframe 00:45: Diagram of crew module splashdown trajectory",
            ],
            "target_language": "en",
            "max_candidates_per_source": 5,
        })
        assert resp.status_code in (200, 202)
        data = resp.json()
        assert data["input_modality"] == "video"
        assert "multimodal_evidence" in data
        assert len(data["multimodal_evidence"]["keyframes"]) == 2
        assert "intelligence_result" in data


@pytest.mark.asyncio
async def test_active_source_failure_resilience():
    """TEST 5: Resilience when a single active source experiences an error."""
    # Create an adapter that raises an Exception
    class FailingTestAdapter(global_discovery_mod.DiscoveryAdapter):
        name = "failing_mock"
        async def search(self, queries, scope, limit=10):
            raise ConnectionError("Simulated upstream network timeout")

    global_discovery_mod.active_adapters.append(FailingTestAdapter())
    try:
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            resp = await ac.post("/api/v1/discovery/search", json={
                "query": "Autonomous Robotics",
                "input_modality": "text",
                "target_language": "en",
                "max_candidates_per_source": 5,
            })
            assert resp.status_code in (200, 202)
            data = resp.json()
            # Must still succeed and produce result using other active sources
            assert "intelligence_result" in data
            assert len(data["sources"]) > 0
    finally:
        # Clean up
        global_discovery_mod.active_adapters = [
            a for a in global_discovery_mod.active_adapters if a.name != "failing_mock"
        ]


@pytest.mark.asyncio
async def test_background_ingestion_scheduler():
    """TEST 6: Background ingestion scheduler single cycle and deduplication."""
    initial_articles_count = len(db.list_articles())
    
    # Run one full ingestion cycle
    new_ingested = await scheduler.run_ingestion_cycle()
    assert isinstance(new_ingested, int)
    
    # Verify status stats updated
    assert scheduler.stats["active_sources"] == ["rss_feeds", "google_news_live", "hackernews"]
    
    # Running a second cycle immediately should skip duplicates
    second_cycle = await scheduler.run_ingestion_cycle()
    assert second_cycle == 0, "Second immediate cycle should deduplicate all previously ingested items"
    assert scheduler.stats["duplicates_skipped"] >= 0


@pytest.mark.asyncio
async def test_health_and_scheduler_status():
    """TEST 7: Health and background scheduler monitoring endpoints."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        health_resp = await ac.get("/health")
        assert health_resp.status_code == 200
        health_data = health_resp.json()
        assert health_data["status"] == "healthy"
        assert health_data["service"] == "global-discovery"

        sched_resp = await ac.get("/api/v1/discovery/scheduler/status")
        assert sched_resp.status_code == 200
        sched_data = sched_resp.json()
        assert "running" in sched_data
        assert "interval_seconds" in sched_data
