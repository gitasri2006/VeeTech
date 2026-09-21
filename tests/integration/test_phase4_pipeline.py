"""
Integration Tests for Discovery Phase 4 Multilingual Pipeline
Tests: Ingest Non-English Article -> Multilingual Tagging & Translation -> Filtering Match against English Entity Profile
"""

import pytest
from fastapi.testclient import TestClient

from services.common.bus import bus
from services.common.db import db
from services.registry import (
    get_multilingual_service,
    get_extraction_service,
    get_entity_profile_service,
    get_filtering_service,
)

multi_mod = get_multilingual_service()
extract_mod = get_extraction_service()
entity_mod = get_entity_profile_service()
filt_mod = get_filtering_service()

client_multi = TestClient(multi_mod.app)
client_extract = TestClient(extract_mod.app)
client_entity = TestClient(entity_mod.app)
client_filter = TestClient(filt_mod.app)


@pytest.fixture(autouse=True)
def clean_pipeline():
    db.articles.clear()
    db.entities.clear()
    db.language_tags.clear()
    db.matches.clear()
    bus.clear()
    yield
    db.articles.clear()
    db.entities.clear()
    db.language_tags.clear()
    db.matches.clear()
    bus.clear()


@pytest.mark.asyncio
async def test_end_to_end_multilingual_matching():
    """
    Test that a Hindi/Tamil article is correctly detected, translated,
    and matches an English-language Entity Profile through Filtering.
    """
    # 1. Onboard English-language Entity Profile for Tata Motors
    ent_resp = client_entity.post("/entities", json={
        "name": "Tata Motors",
        "type": "Company",
        "description": "Indian automotive manufacturing company producing commercial vehicles, passenger cars, and electric buses.",
    })
    assert ent_resp.status_code == 201
    entity = ent_resp.json()
    entity_id = entity["id"]

    # 2. Ingest Hindi-language news article
    hindi_article, _ = await extract_mod.ingest_article({
        "title": "टाटा मोटर्स ने बेंगलुरु में नई इलेक्ट्रिक बसों की डिलीवरी शुरू की",
        "extracted_text": "टाटा मोटर्स ने आज सार्वजनिक परिवहन के लिए नई इलेक्ट्रिक बसों की पहली खेप सौंपी।",
        "canonical_url": "https://hindi.news.in/tata-motors-ev-bus",
        "source": "hindi.news.in",
        "source_tier": 2,
    })

    # 3. Process article via Multilingual Service
    proc_resp = client_multi.post("/process", json={"article_id": hindi_article.id})
    assert proc_resp.status_code == 200
    multi_data = proc_resp.json()

    tag = multi_data["language_tag"]
    assert tag["detected_language"] == "hi"
    assert "Tata Motors" in tag["translated_text"]
    assert "electric" in tag["translated_text"]

    # Verify event on message bus
    multi_events = bus.get_messages("multilingual.tagged")
    assert any(e["article_id"] == hindi_article.id for e in multi_events)

    # 4. Evaluate in Filtering Agent
    # Update article text with translated pivot representation for semantic search
    hindi_article.extracted_text = tag["translated_text"]
    filt_resp = client_filter.post("/filter/evaluate", json={
        "article_id": hindi_article.id,
        "entity_id": entity_id,
        "min_similarity": 0.25,
    })
    assert filt_resp.status_code == 200
    filt_data = filt_resp.json()

    assert filt_data["passed"] is True
    assert filt_data["match"] is not None
    assert "Tata Motors" in filt_data["matched_terms"]
