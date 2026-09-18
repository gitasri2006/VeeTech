"""
Unit tests for VeriScope Phase 6 (Public Utility — WhatsApp Verification Bot)
"""
import pytest
from datetime import datetime
from fastapi.testclient import TestClient

from services.common.models import FactCheckVerdict, MediaType
from services.common.db import db
from services.registry import get_whatsapp_bot_service

wb_mod = get_whatsapp_bot_service()
app = wb_mod.app
compute_phone_hash = wb_mod.compute_phone_hash
check_rate_limit = wb_mod.check_rate_limit
format_whatsapp_reply = wb_mod.format_whatsapp_reply
_rate_limit_tracker = wb_mod._rate_limit_tracker

client = TestClient(app)


def test_phone_number_salted_hashing():
    """Verify phone numbers are salted and SHA-256 hashed without storing raw PII."""
    raw_phone = "+91-98765-43210"
    raw_phone_2 = "+91 98765 43210"
    hash_1 = compute_phone_hash(raw_phone)
    hash_2 = compute_phone_hash(raw_phone_2)
    
    # Cleaned digits produce identical hash
    assert hash_1 == hash_2
    assert len(hash_1) == 64
    assert raw_phone not in hash_1
    assert "9876543210" not in hash_1


def test_rate_limiting_enforcement():
    """Verify per-phone sliding window rate limit prevents spam."""
    phone_hash = "test_rate_limited_hash_123"
    _rate_limit_tracker[phone_hash] = []
    
    # 10 calls should succeed
    for _ in range(10):
        assert check_rate_limit(phone_hash) is True
        
    # 11th call within the window must fail
    assert check_rate_limit(phone_hash) is False


def test_privacy_consent_workflow():
    """Verify one-time privacy consent flow."""
    test_phone = "+12345678901"
    phone_hash = compute_phone_hash(test_phone)
    if phone_hash in db.whatsapp_consents:
        db.whatsapp_consents.remove(phone_hash)

    # 1. First interaction without consent requests disclaimer
    resp1 = client.post(
        "/whatsapp/simulate",
        json={
            "from_number": test_phone,
            "message_type": "text",
            "text_content": "Is this news true?",
            "consent_given": False,
        }
    )
    assert resp1.status_code == 200
    data1 = resp1.json()
    assert data1["status"] == "consent_required"
    assert "Privacy Notice" in data1["message"]
    assert not db.has_whatsapp_consent(phone_hash)

    # 2. Affirmative reply grants consent
    resp2 = client.post(
        "/whatsapp/simulate",
        json={
            "from_number": test_phone,
            "message_type": "text",
            "text_content": "YES",
            "consent_given": False,
        }
    )
    assert resp2.status_code == 200
    data2 = resp2.json()
    assert data2["status"] == "consent_granted"
    assert db.has_whatsapp_consent(phone_hash)


def test_meta_webhook_challenge_handshake():
    """Verify GET /webhooks/whatsapp verification handshake for Meta setup."""
    response = client.get(
        "/webhooks/whatsapp",
        params={
            "hub.mode": "subscribe",
            "hub.verify_token": "veriscope_meta_verify_token_2026",
            "hub.challenge": "1158201444",
        }
    )
    assert response.status_code == 200
    assert response.json() == 1158201444

    # Invalid token rejected
    bad_resp = client.get(
        "/webhooks/whatsapp",
        params={
            "hub.mode": "subscribe",
            "hub.verify_token": "wrong_token",
            "hub.challenge": "1158201444",
        }
    )
    assert bad_resp.status_code == 403


def test_format_whatsapp_reply():
    """Verify clear markdown formatting with emojis and citations."""
    reply = format_whatsapp_reply(
        verdict=FactCheckVerdict.VERIFIED,
        explanation="This report is verified by official government gazettes.",
        evidence_urls=["https://pib.gov.in/pressrelease/123"],
        language="en"
    )
    assert "✅ *VeriScope Verdict: VERIFIED*" in reply
    assert "https://pib.gov.in/pressrelease/123" in reply
    assert "VeriScope Public Truth Bot" in reply
