"""
Integration Tests for VeriScope Phase 1 Pipeline
Tests full flow: Entity Onboarding -> RSS Ingestion -> Semantic & Rule Filtering -> Contextual Disambiguation
"""

import pytest
from fastapi.testclient import TestClient

from services.common.bus import bus
from services.common.db import db
from services.common.models import ValidationStatus
from services.registry import (
    get_extraction_service,
    get_entity_profile_service,
    get_filtering_service,
    get_contextual_validation_service,
)

extract_mod = get_extraction_service()
entity_mod = get_entity_profile_service()
filt_mod = get_filtering_service()
val_mod = get_contextual_validation_service()

client_entity = TestClient(entity_mod.app)
client_extract = TestClient(extract_mod.app)
client_filter = TestClient(filt_mod.app)
client_val = TestClient(val_mod.app)


@pytest.fixture(autouse=True)
def clean_pipeline_state():
    db.entities.clear()
    db.rules.clear()
    db.articles.clear()
    db.matches.clear()
    db.validations.clear()
    bus.clear()
    yield
    db.entities.clear()
    db.rules.clear()
    db.articles.clear()
    db.matches.clear()
    db.validations.clear()
    bus.clear()


def test_entity_creation_api():
    payload = {
        "name": "NVIDIA",
        "type": "Company",
        "description": "GPU designer and AI acceleration hardware manufacturer.",
    }
    resp = client_entity.post("/entities", json=payload)
    assert resp.status_code == 201
    data = resp.json()
    assert data["name"] == "NVIDIA"
    assert len(data["aliases"]) > 0
    assert len(data["embedding"]) == 768


def test_natural_language_rule_compilation_and_sandbox():
    rule_nl = "only Tier 1 Indian sources from last 48 hours excluding sports"
    resp = client_filter.post("/rules/compile", json={"natural_language": rule_nl})
    assert resp.status_code == 200
    rule = resp.json()
    assert rule["recency_window"] == "48h"
    assert rule["min_source_tier"] == 1
    assert "sports" in rule["boolean_terms"]["must_not_include"]


@pytest.mark.asyncio
async def test_end_to_end_phase1_semantic_pipeline():
    # 1. Onboard Entity
    ent_resp = client_entity.post("/entities", json={
        "name": "Acme Robotics",
        "type": "Company",
        "description": "Industrial autonomous mobile robots and warehouse automation.",
    })
    entity_id = ent_resp.json()["id"]

    # 2. Ingest candidate articles
    feed_xml = """<?xml version="1.0" encoding="UTF-8"?>
    <rss version="2.0">
    <channel>
      <title>Robotics News</title>
      <item>
        <title>Acme Robotics Secures $80M Series C for Autonomous Fleet</title>
        <link>https://techwire.com/acme-series-c</link>
        <description>Acme Robotics announced funding to expand warehouse robot deployments.</description>
        <pubDate>Thu, 18 Sep 2026 10:00:00 GMT</pubDate>
      </item>
      <item>
        <title>Zookeeper Rescues Rare Desert Coyote and Falcon</title>
        <link>https://techwire.com/desert-wildlife</link>
        <description>Sanctuary rangers nursed an injured coyote back to health.</description>
        <pubDate>Thu, 18 Sep 2026 09:00:00 GMT</pubDate>
      </item>
    </channel>
    </rss>
    """
    extract_resp = client_extract.post("/extract/rss", json={"feed_xml": feed_xml, "source_tier": 1})
    assert extract_resp.status_code == 200
    articles = extract_resp.json()["articles"]
    assert len(articles) == 2

    # 3. Evaluate Filtering on both articles
    art_relevant = articles[0]
    art_irrelevant = articles[1]

    filt_resp1 = client_filter.post("/filter/evaluate", json={
        "article_id": art_relevant["id"],
        "entity_id": entity_id,
        "min_similarity": 0.20,
    })
    assert filt_resp1.status_code == 200
    res1 = filt_resp1.json()
    assert res1["passed"] is True
    match_id = res1["match"]["id"]

    filt_resp2 = client_filter.post("/filter/evaluate", json={
        "article_id": art_irrelevant["id"],
        "entity_id": entity_id,
        "min_similarity": 0.35,
    })
    assert filt_resp2.status_code == 200
    res2 = filt_resp2.json()
    assert res2["passed"] is False

    # 4. Contextual Validation on passing match
    val_resp = client_val.post("/validate", json={"match_id": match_id, "force_qa_sample": False})
    assert val_resp.status_code == 200
    val_data = val_resp.json()
    assert val_data["validation"]["validated_status"] in ["approved", "needs_review"]
    assert len(val_data["validation"]["reason"]) > 0

    # 5. Check validation events on bus
    val_events = bus.get_messages("validation.completed")
    assert len(val_events) == 1
    assert val_events[0]["entity_id"] == entity_id
