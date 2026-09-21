"""
Integration Tests for Discovery Phase 5 Pipeline
Tests: Ingest Item -> Run Fact Check -> Verify Needs Review Queue -> Submit Analyst Sign-off
"""

import pytest
from fastapi.testclient import TestClient

from services.common.bus import bus
from services.common.db import db
from services.common.models import FactCheckVerdict
from services.registry import (
    get_fact_checking_service,
    get_source_intelligence_service,
    get_extraction_service,
)

fc_mod = get_fact_checking_service()
si_mod = get_source_intelligence_service()
extract_mod = get_extraction_service()

client_fc = TestClient(fc_mod.app)
client_si = TestClient(si_mod.app)
client_extract = TestClient(extract_mod.app)


@pytest.fixture(autouse=True)
def clean_pipeline():
    db.articles.clear()
    db.fact_checks.clear()
    db.source_tiers.clear()
    db.audit_logs.clear()
    bus.clear()
    yield
    db.articles.clear()
    db.fact_checks.clear()
    db.source_tiers.clear()
    db.audit_logs.clear()
    bus.clear()


@pytest.mark.asyncio
async def test_end_to_end_fact_check_and_analyst_sign_off():
    # 1. Ingest suspicious / disputed claim
    art, _ = await extract_mod.ingest_article({
        "title": "Unconfirmed Hoax Video Claims Fabricated Miracle Cure",
        "extracted_text": "A viral video claims a fabricated miracle cure with 100% eradication rate.",
        "canonical_url": "https://viral-rumor.net/post-1",
        "source": "viral-rumor.net",
        "source_tier": 3,
    })

    # 2. Fact Check Evaluation via API
    eval_resp = client_fc.post("/factcheck/evaluate", json={"article_id": art.id})
    assert eval_resp.status_code == 200
    fc_data = eval_resp.json()

    assert fc_data["verdict"] == "Likely False"
    assert fc_data["needs_human_review"] is True
    assert fc_data["authenticity_score"] <= 0.25

    # 3. Check that it appears in Fact-Verification Analyst Queue
    queue_resp = client_fc.get("/factcheck/queue")
    assert queue_resp.status_code == 200
    queue_items = queue_resp.json()
    assert len(queue_items) == 1
    assert queue_items[0]["article_id"] == art.id

    # 4. Fact-Verification Analyst submits human review sign-off
    review_resp = client_fc.post(f"/factcheck/{art.id}/review", json={
        "reviewed_by": "analyst-expert-07",
        "final_verdict": "Likely False",
        "override_reason": "Confirmed against Alt News and PIB official debunk records.",
    })
    assert review_resp.status_code == 200
    reviewed_fc = review_resp.json()

    assert reviewed_fc["needs_human_review"] is False
    assert reviewed_fc["reviewed_by"] == "analyst-expert-07"
    assert "Alt News and PIB" in reviewed_fc["human_override_reason"]

    # 5. Queue must now be empty
    queue_after = client_fc.get("/factcheck/queue").json()
    assert len(queue_after) == 0

    # 6. Verify audit log entry
    audit_logs = db.list_audit_logs()
    assert len(audit_logs) >= 1
    assert audit_logs[0].action_type == "fact_check_human_sign_off"
    assert audit_logs[0].actor_id == "analyst-expert-07"
