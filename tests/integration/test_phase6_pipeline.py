"""
Integration test for Discovery Phase 6 (Pipeline B — Public WhatsApp Verification Flow)
"""
import pytest
from fastapi.testclient import TestClient

from services.common.models import FactCheckVerdict, MediaType
from services.common.db import db
from services.registry import get_whatsapp_bot_service

wb_mod = get_whatsapp_bot_service()
client = TestClient(wb_mod.app)


@pytest.mark.asyncio
async def test_end_to_end_whatsapp_verified_news_flow():
    """
    Pipeline B: User submits high-credibility verified news claim.
    Expected: Immediate verified reply without requiring manual analyst queueing.
    """
    user_phone = "+919876500001"
    
    # Send verified news query
    response = client.post(
        "/whatsapp/simulate",
        json={
            "from_number": user_phone,
            "message_type": "text",
            "text_content": "Finance Minister announces new solar power subsidy scheme for farmers in budget 2026",
            "consent_given": True,
        }
    )
    assert response.status_code == 200
    data = response.json()
    
    assert data["status"] == "replied"
    assert data["verdict"] in [FactCheckVerdict.VERIFIED.value, FactCheckVerdict.UNVERIFIED.value]
    assert data["needs_human_review"] is False
    assert "Discovery Verdict" in data["message"]
    assert len(data["phone_number_hash"]) == 64


@pytest.mark.asyncio
async def test_end_to_end_whatsapp_misinformation_and_analyst_sign_off():
    """
    Pipeline B: User submits viral hoax / debunked claim.
    Expected:
    1. Returns interim 'in-review' notice.
    2. Flags needs_human_review=True and enqueues in Analyst Queue.
    3. Analyst reviews and approves verdict via Moderation API.
    4. Outbound final reply generated and audit log recorded.
    """
    user_phone = "+919876500002"
    hoax_claim = "UNESCO declares national anthem of India as the best anthem in the world 2026 forward"

    # 1. Inbound query submission
    response = client.post(
        "/whatsapp/simulate",
        json={
            "from_number": user_phone,
            "message_type": "text",
            "text_content": hoax_claim,
            "consent_given": True,
        }
    )
    assert response.status_code == 200
    data = response.json()

    assert data["status"] == "queued_for_review"
    assert data["needs_human_review"] is True
    assert data["verdict"] == FactCheckVerdict.LIKELY_FALSE.value
    assert "Discovery Verification In Progress" in data["message"]
    query_id = data["query_id"]

    # 2. Verify query is listed in the moderation queue
    queue_resp = client.get("/whatsapp/queue")
    assert queue_resp.status_code == 200
    queue_items = queue_resp.json()
    assert any(q["id"] == query_id for q in queue_items)

    # 3. Fact-Verification Analyst reviews and signs off
    approve_resp = client.post(
        f"/whatsapp/moderation/{query_id}/approve",
        json={
            "final_verdict": FactCheckVerdict.LIKELY_FALSE.value,
            "reviewed_by": "analyst-pankaj",
            "analyst_notes": "Repeated viral internet rumor. UNESCO has officially denied issuing any such anthem rankings.",
        }
    )
    assert approve_resp.status_code == 200
    approved_data = approve_resp.json()
    assert approved_data["status"] == "replied"
    assert approved_data["needs_human_review"] is False
    assert "MISINFORMATION / LIKELY FALSE" in approved_data["reply_text"]
    assert "UNESCO has officially denied" in approved_data["reply_text"]

    # 4. Verify audit log entry was created
    audit_logs = db.list_audit_logs()
    assert any(
        log.target_id == query_id and log.action_type == "whatsapp_analyst_approval"
        for log in audit_logs
    )


@pytest.mark.asyncio
async def test_end_to_end_whatsapp_multimodal_image_verification():
    """
    Pipeline B: User submits an image verification query with OCR caption.
    """
    user_phone = "+919876500003"
    
    response = client.post(
        "/whatsapp/simulate",
        json={
            "from_number": user_phone,
            "message_type": "image",
            "media_url": "https://sample.storage/whatsapp/election_ballot_rumor.jpg",
            "media_caption": "Leaked secret ballot paper showing pre-marked votes in 2026 election",
            "consent_given": True,
        }
    )
    assert response.status_code == 200
    data = response.json()
    assert data["status"] in ["replied", "queued_for_review"]
    assert data["phone_number_hash"]


def test_whatsapp_analytics_endpoint():
    """Verify analytics reporting of total queries and distribution."""
    resp = client.get("/whatsapp/analytics")
    assert resp.status_code == 200
    analytics = resp.json()
    
    assert "total_queries" in analytics
    assert analytics["total_queries"] >= 2
    assert "verdict_breakdown" in analytics
    assert "language_breakdown" in analytics
    assert "media_type_breakdown" in analytics
    assert analytics["sla_target_response_seconds"] == 60
