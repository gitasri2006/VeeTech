"""
Integration Tests for Discovery Phase 2 Pipeline
Tests: Bare Keyword Search -> Global Discovery Fan-Out -> Candidate Ingestion into Pipeline
"""

import pytest
from fastapi.testclient import TestClient

from services.common.bus import bus
from services.common.db import db
from services.registry import (
    get_global_discovery_service,
    get_extraction_service,
    get_entity_profile_service,
    get_filtering_service,
)

discovery_mod = get_global_discovery_service()
extract_mod = get_extraction_service()
entity_mod = get_entity_profile_service()
filt_mod = get_filtering_service()

client_discovery = TestClient(discovery_mod.app)
client_extract = TestClient(extract_mod.app)
client_entity = TestClient(entity_mod.app)


@pytest.fixture(autouse=True)
def clean_pipeline():
    discovery_mod.seen_urls_cache.clear()
    discovery_mod.discovery_jobs.clear()
    db.articles.clear()
    db.entities.clear()
    db.matches.clear()
    bus.clear()
    yield
    discovery_mod.seen_urls_cache.clear()
    discovery_mod.discovery_jobs.clear()
    db.articles.clear()
    db.entities.clear()
    db.matches.clear()
    bus.clear()


def test_discovery_search_api_bare_keyword():
    """Verify bare keyword search returns candidates via API."""
    payload = {
        "keywords": ["generative AI enterprise"],
        "scope": {
            "recency_window": "7d",
            "platforms": ["web", "x", "youtube"],
        },
        "max_candidates_per_source": 5,
    }

    resp = client_discovery.post("/api/v1/discovery/search", json=payload)
    assert resp.status_code in (200, 202)
    data = resp.json()
    assert data["status"] == "completed"
    assert data["candidates_count"] > 0
    assert len(data["candidates"]) > 0

    # Verify event on message bus
    events = bus.get_messages("discovery.candidates")
    assert len(events) == 1
    assert events[0]["candidates_count"] == data["candidates_count"]


@pytest.mark.asyncio
async def test_end_to_end_bare_keyword_to_ingested_article():
    """
    Test full flow from bare keyword:
    1. Bare keyword entered into Global Discovery.
    2. Discovery finds candidates across web & social.
    3. Extraction service consumes candidates and extracts clean Article rows into DB.
    """
    # 1. Global Discovery search
    search_res = await discovery_mod.execute_discovery(keywords=["autonomous vehicles LiDAR"], limit=3)
    assert search_res["candidates_count"] > 0
    candidate = search_res["candidates"][0]

    # 2. Ingest candidate via Extraction service
    mock_html = f"""
    <html>
      <head>
        <title>{candidate['title']}</title>
        <meta property="og:site_name" content="{candidate['source']}" />
      </head>
      <body>
        <article>
          <h1>{candidate['title']}</h1>
          <p>Breakthrough LiDAR sensors enable next-generation autonomous navigation in dense urban traffic.</p>
        </article>
      </body>
    </html>
    """

    art, is_new = await extract_mod.ingest_article({
        "title": candidate["title"],
        "canonical_url": candidate["url"],
        "source": candidate["source"],
        "extracted_text": "Breakthrough LiDAR sensors enable next-generation autonomous navigation in dense urban traffic.",
    })

    assert is_new is True
    assert art.canonical_url == candidate["url"]
    assert db.get_article(art.id) is not None

    # Check extraction bus event
    ext_events = bus.get_messages("extraction.completed")
    assert any(e["article_id"] == art.id for e in ext_events)
