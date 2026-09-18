"""
Unit Tests for VeriScope Phase 1 Semantic Core
Tests: Entity Profile Generation, Edit-Precedence Lock, Semantic Shortlisting, and Confidence Routing
"""

from datetime import datetime, timezone
import pytest

from services.common.db import db
from services.common.models import Entity, Article, Rule, Match, ValidationStatus, Validation
from services.common.embeddings import embedding_service
from services.registry import (
    get_entity_profile_service,
    get_filtering_service,
    get_contextual_validation_service,
)

ep_service = get_entity_profile_service()
filt_service = get_filtering_service()
cv_service = get_contextual_validation_service()


@pytest.fixture(autouse=True)
def clean_db():
    db.entities.clear()
    db.rules.clear()
    db.articles.clear()
    db.matches.clear()
    db.validations.clear()
    yield
    db.entities.clear()
    db.rules.clear()
    db.articles.clear()
    db.matches.clear()
    db.validations.clear()


def test_entity_profile_embedding_generation():
    entity = Entity(
        name="Stripe",
        type="Company",
        aliases=["Stripe Payments", "Stripe Inc"],
        seed_terms=["fintech", "payment gateway", "developer APIs", "merchant billing"],
        disambiguation_context="Stripe is an online payment processing company for internet businesses.",
    )
    embedding = ep_service.build_entity_embedding(entity)
    assert len(embedding) == 768
    norm = sum(x * x for x in embedding) ** 0.5
    assert abs(norm - 1.0) < 1e-3


def test_edit_precedence_lock_behavior():
    entity = Entity(
        name="Tata Motors",
        type="Company",
        aliases=["Tata Motors Ltd", "JLR Owner"],
        seed_terms=["electric bus", "commercial vehicle"],
        analyst_edited_fields=["seed_terms", "aliases"],
    )
    db.save_entity(entity)

    saved = db.get_entity(entity.id)
    assert "seed_terms" in saved.analyst_edited_fields
    assert "aliases" in saved.analyst_edited_fields


@pytest.mark.asyncio
async def test_semantic_filtering_pass_and_reject():
    entity = Entity(
        name="Apple",
        type="Company",
        aliases=["Apple Inc", "Apple Computer"],
        seed_terms=["iPhone", "MacBook", "iOS", "M4 chip", "Tim Cook"],
        disambiguation_context="Apple Inc consumer electronics maker.",
    )
    entity.embedding = ep_service.build_entity_embedding(entity)
    db.save_entity(entity)

    rule = Rule(entity_id=entity.id, min_source_tier=3, recency_window="30d")
    db.save_rule(rule)

    rel_art = Article(
        canonical_url="https://techcrunch.com/apple-m4-mac",
        source="techcrunch.com",
        source_tier=1,
        title="Apple Announces M4 MacBook Pro Lineup",
        extracted_text="Apple today unveiled the new MacBook Pro powered by the M4 chip family with high performance neural engines.",
    )
    db.save_article(rel_art)

    passed_rel, sim_rel, _, terms_rel, match_rel = await filt_service.evaluate_article_for_entity(
        article=rel_art, entity=entity, rule=rule, min_similarity=0.35
    )
    assert passed_rel is True
    assert sim_rel >= 0.35
    assert match_rel is not None
    assert "Apple" in terms_rel

    irr_art = Article(
        canonical_url="https://farming.org/organic-fruit",
        source="farming.org",
        source_tier=3,
        title="Organic Peach and Honeycrisp Orchard Yields",
        extracted_text="Farmers in the Pacific Northwest reported healthy peach and gala tree growth.",
    )
    db.save_article(irr_art)

    passed_irr, sim_irr, _, _, match_irr = await filt_service.evaluate_article_for_entity(
        article=irr_art, entity=entity, rule=rule, min_similarity=0.35
    )
    assert passed_irr is False
    assert match_irr is None


@pytest.mark.asyncio
async def test_contextual_validation_three_way_routing():
    entity = Entity(
        name="Tesla",
        disambiguation_context="Tesla Inc electric vehicle and clean energy manufacturer.",
        exclusion_terms=["nikola tesla", "serbian museum", "19th century inventor"],
    )
    db.save_entity(entity)

    art_good = Article(
        canonical_url="https://reuters.com/tesla-gigafactory",
        source="reuters.com",
        title="Tesla Opens Gigafactory Expansion for Battery Storage",
        extracted_text="Tesla Inc has completed construction on its new battery storage assembly line with high throughput.",
    )
    db.save_article(art_good)

    match_good = Match(article_id=art_good.id, entity_id=entity.id, confidence_score=0.92)
    db.save_match(match_good)

    val_good, _, action_good = await cv_service.validate_candidate_match(match_good.id, force_qa_sample=False, qa_sample_rate=0.0)
    assert val_good.validated_status == ValidationStatus.APPROVED
    assert action_good == "auto_approved"

    art_bad = Article(
        canonical_url="https://history.org/nikola-tesla",
        source="history.org",
        title="Nikola Tesla Inventions Exhibited in Serbian Museum",
        extracted_text="Historians gathered to view alternating current patents by the 19th century inventor Nikola Tesla.",
    )
    db.save_article(art_bad)

    match_bad = Match(article_id=art_bad.id, entity_id=entity.id, confidence_score=0.70)
    db.save_match(match_bad)

    val_bad, _, action_bad = await cv_service.validate_candidate_match(match_bad.id, force_qa_sample=False)
    assert val_bad.validated_status == ValidationStatus.REJECTED
    assert action_bad == "auto_rejected"


@pytest.mark.asyncio
async def test_contextual_validation_qa_sampling():
    entity = Entity(
        name="Stripe",
        disambiguation_context="Stripe fintech payments platform.",
        exclusion_terms=["tiger", "zebra"],
    )
    db.save_entity(entity)

    art = Article(
        canonical_url="https://fintech.com/stripe-volume",
        source="fintech.com",
        title="Stripe Processes Record Volume",
        extracted_text="Stripe online payment APIs reached massive growth across enterprise online retailers.",
    )
    db.save_article(art)

    match = Match(article_id=art.id, entity_id=entity.id, confidence_score=0.95)
    db.save_match(match)

    val, is_sampled, action = await cv_service.validate_candidate_match(match.id, force_qa_sample=True)
    assert is_sampled is True
    assert val.validated_status == ValidationStatus.NEEDS_REVIEW
    assert action == "qa_sample_review"
    assert "[QA Sample 5%]" in val.reason
