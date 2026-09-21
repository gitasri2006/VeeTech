"""
Full End-to-End Integration Tests for Discovery Phase 7
Validates Pipeline A (Proactive Monitoring) and Pipeline B (Reactive Public Verification)
across all 10 Agent Services.
"""
import pytest
from fastapi.testclient import TestClient

from services.common.models import (
    Entity, Rule, Article, MediaType, ValidationStatus, FactCheckVerdict, UserRole
)
from services.common.db import db
from services.common.bus import bus
from services.registry import (
    get_entity_profile_service,
    get_filtering_service,
    get_contextual_validation_service,
    get_global_discovery_service,
    get_extraction_service,
    get_multilingual_service,
    get_fact_checking_service,
    get_source_intelligence_service,
    get_brief_clustering_service,
    get_whatsapp_bot_service,
)

# Initialize service test clients
entity_client = TestClient(get_entity_profile_service().app)
filter_client = TestClient(get_filtering_service().app)
cv_client = TestClient(get_contextual_validation_service().app)
discovery_client = TestClient(get_global_discovery_service().app)
extract_client = TestClient(get_extraction_service().app)
ml_client = TestClient(get_multilingual_service().app)
fc_client = TestClient(get_fact_checking_service().app)
si_client = TestClient(get_source_intelligence_service().app)
brief_client = TestClient(get_brief_clustering_service().app)
wa_client = TestClient(get_whatsapp_bot_service().app)


@pytest.mark.asyncio
async def test_full_pipeline_a_end_to_end_flow():
    """
    Test Complete Pipeline A (Brand/Entity Continuous Monitoring):
    1. Create & Profile Entity.
    2. Compile Natural Language Filtering Rule.
    3. Perform Global Discovery & Ingest Multimodal Content.
    4. Run Multilingual LID & Translation.
    5. Evaluate Filtering Agent & Shortlist.
    6. Contextual Validation Disambiguation.
    7. Fact-Checking & Source Intelligence Tiering.
    8. Brief & Clustering Grounded Summary Generation.
    """
    # 1. Entity Profile Creation
    create_ent_resp = entity_client.post(
        "/entities",
        json={
            "name": "Tata Motors EV",
            "type": "Company",
            "url": "https://tatamotors.com",
            "aliases": ["Tata Electric", "Tata Passenger Electric Mobility"],
            "seed_terms": ["Tata Motors", "Nexon EV", "Punch EV", "Curvv EV"],
            "exclusion_terms": ["Tata Salt", "Tata Steel", "Tata Chemicals"],
            "disambiguation_context": "Automotive manufacturer producing passenger and commercial electric vehicles.",
        }
    )
    assert create_ent_resp.status_code == 201
    entity_id = create_ent_resp.json()["id"]

    # 2. Rule Compilation
    rule_resp = filter_client.post(
        "/rules/compile",
        json={
            "entity_id": entity_id,
            "natural_language": "Monitor all Tier 1 and Tier 2 news from India within 48 hours excluding sports"
        }
    )
    assert rule_resp.status_code == 200
    rule_id = rule_resp.json()["id"]

    # 3. Source Intelligence & Extraction of Incoming Multilingual News
    si_eval_resp = si_client.post(
        "/sources/evaluate",
        json={"domain_or_handle": "thehindu.com", "platform": "web"}
    )
    assert si_eval_resp.status_code == 200
    assert si_eval_resp.json()["tier"] == 1

    # Ingest Hindi news article
    hindi_art_resp = extract_client.post(
        "/extract/url",
        json={
            "url": "https://thehindu.com/hindi/tata-motors-ev-expansion-2026",
            "title": "टाटा मोटर्स ने बेंगलुरु में नई इलेक्ट्रिक तकनीक लॉन्च की",
            "html_content": "<p>टाटा मोटर्स ने भारत में अपनी अगली पीढ़ी की इलेक्ट्रिक मोबिलिटी तकनीक की घोषणा की।</p>",
            "source": "thehindu.com",
            "author": "Tech Desk",
        }
    )
    assert hindi_art_resp.status_code == 200
    article_id = hindi_art_resp.json()["id"]

    # 4. Multilingual Processing
    ml_resp = ml_client.post(
        "/process",
        json={"article_id": article_id}
    )
    assert ml_resp.status_code == 200
    assert ml_resp.json()["language_tag"]["detected_language"] == "hi"
    assert "Tata Motors" in ml_resp.json()["language_tag"]["translated_text"]

    # 5. Semantic Filtering
    filter_eval_resp = filter_client.post(
        "/filter/evaluate",
        json={
            "article_id": article_id,
            "entity_id": entity_id,
            "min_similarity": 0.25,
        }
    )
    assert filter_eval_resp.status_code == 200
    filt_res = filter_eval_resp.json()
    assert filt_res["passed"] is True
    match_id = filt_res["match"]["id"]

    # 6. Contextual Validation
    cv_eval_resp = cv_client.post(
        "/validate",
        json={"match_id": match_id, "force_qa_sample": False}
    )
    assert cv_eval_resp.status_code == 200
    val_resp = cv_eval_resp.json()
    validation = val_resp["validation"]
    assert validation["validated_status"] == ValidationStatus.APPROVED.value
    assert validation["disambiguation_confidence"] >= 0.70

    # 7. Fact-Checking
    fc_resp = fc_client.post(
        "/factcheck/evaluate",
        json={"article_id": article_id}
    )
    assert fc_resp.status_code == 200
    fc_data = fc_resp.json()
    assert fc_data["verdict"] == FactCheckVerdict.VERIFIED.value

    # 8. Grounded Brief & Story Clustering
    brief_gen_resp = brief_client.post(
        "/briefs/generate",
        json={
            "entity_id": entity_id,
            "time_window_hours": 48,
            "min_cluster_size": 1,
            "similarity_threshold": 0.50,
        }
    )
    assert brief_gen_resp.status_code == 200
    brief_data = brief_gen_resp.json()
    assert brief_data["total_clusters"] >= 1
    
    generated_brief = brief_data["briefs"][0]
    assert len(generated_brief["summary_sentences"]) > 0
    # Confirm sentence citations
    for sent in generated_brief["summary_sentences"]:
        assert sent["article_id"] == article_id
        assert len(sent["text"]) > 0


@pytest.mark.asyncio
async def test_full_pipeline_b_end_to_end_flow():
    """
    Test Complete Pipeline B (Reactive Public Verification Bot):
    1. User submits claim via WhatsApp simulation.
    2. Verification pipeline processes content.
    3. Outbound reply delivered and logged.
    """
    user_phone = "+919999888877"

    response = wa_client.post(
        "/whatsapp/simulate",
        json={
            "from_number": user_phone,
            "message_type": "text",
            "text_content": "India Space Research Organisation successfully tests semi-cryogenic engine for future heavy rockets",
            "consent_given": True,
        }
    )
    assert response.status_code == 200
    res_data = response.json()
    assert res_data["status"] == "replied"
    assert "Discovery Verdict" in res_data["message"]
    assert len(res_data["phone_number_hash"]) == 64
