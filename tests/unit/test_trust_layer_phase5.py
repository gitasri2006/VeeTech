"""
Unit Tests for Discovery Phase 5 Trust Layer (Fact-Checking & Source Intelligence)
Compliant with PRD Section 7.7, 7.8 & TRD Section 5.7, 5.8
"""

import pytest

from services.common.db import db
from services.common.models import Article, FactCheckVerdict, MediaType, MediaAsset
from services.registry import get_fact_checking_service, get_source_intelligence_service

fc_mod = get_fact_checking_service()
si_mod = get_source_intelligence_service()


@pytest.fixture(autouse=True)
def clean_trust_state():
    db.articles.clear()
    db.fact_checks.clear()
    db.source_tiers.clear()
    db.media_assets.clear()
    yield
    db.articles.clear()
    db.fact_checks.clear()
    db.source_tiers.clear()
    db.media_assets.clear()


@pytest.mark.asyncio
async def test_fact_check_tier_1_verified():
    art = Article(
        canonical_url="https://reuters.com/tech-news",
        source="reuters.com",
        source_tier=1,
        title="Global Semiconductor Accord Signed",
        extracted_text="Delegates signed the international agreement establishing clear supply chain standards.",
    )
    db.save_article(art)

    res = await fc_mod.evaluate_article_authenticity(art.id)
    assert res.verdict == FactCheckVerdict.VERIFIED
    assert res.authenticity_score >= 0.85
    assert res.needs_human_review is False
    assert len(res.evidence_sources) > 0


@pytest.mark.asyncio
async def test_fact_check_debunked_hoax_mandatory_review():
    art = Article(
        canonical_url="https://fake-news.xyz/miracle-cure",
        source="fake-news.xyz",
        source_tier=3,
        title="Miracle Cure 100% Eradicates All Diseases",
        extracted_text="Viral posts claim a miraculous cure with 100% success rate without clinical trials.",
    )
    db.save_article(art)

    res = await fc_mod.evaluate_article_authenticity(art.id)
    assert res.verdict == FactCheckVerdict.LIKELY_FALSE
    assert res.authenticity_score <= 0.20
    # Mandatory human review rule
    assert res.needs_human_review is True
    assert len(res.evidence_sources) > 0


@pytest.mark.asyncio
async def test_fact_check_disputed_rumor_mandatory_review():
    art = Article(
        canonical_url="https://rumor-blog.net/leak",
        source="rumor-blog.net",
        source_tier=3,
        title="Disputed Rumor of Unannounced Takeover",
        extracted_text="Alleged leak suggests hostile takeover talks between rival defense contractors.",
    )
    db.save_article(art)

    res = await fc_mod.evaluate_article_authenticity(art.id)
    assert res.verdict == FactCheckVerdict.DISPUTED
    # Mandatory human review rule
    assert res.needs_human_review is True


@pytest.mark.asyncio
async def test_fact_check_manipulated_media_detection():
    art = Article(
        canonical_url="https://cdn.example.com/deepfake_clip.mp4",
        source="social",
        source_tier=3,
        title="Speech Video",
        extracted_text="Video of political address.",
        media_type=MediaType.VIDEO,
    )
    db.save_article(art)

    media = MediaAsset(
        article_id=art.id,
        type=MediaType.VIDEO,
        storage_ref="gs://discovery/deepfake.mp4",
        ocr_text="Deepfake tampered audio track detected.",
    )
    db.save_media_asset(media)

    res = await fc_mod.evaluate_article_authenticity(art.id)
    assert res.manipulated_media_flag is True
    assert res.verdict == FactCheckVerdict.LIKELY_FALSE
    assert res.needs_human_review is True


def test_source_intelligence_domain_scoring_and_tiering():
    # Government domain -> Tier 1
    st_gov = si_mod.evaluate_source_credibility("pib.gov.in", platform="web")
    assert st_gov.tier == 1
    assert st_gov.credibility_score >= 0.90

    # Academic domain -> Tier 1
    st_edu = si_mod.evaluate_source_credibility("mit.edu", platform="web")
    assert st_edu.tier == 1

    # High-risk TLD -> Tier 3
    st_spam = si_mod.evaluate_source_credibility("free-crypto-giveaway.xyz", platform="web")
    assert st_spam.tier == 3
    assert st_spam.credibility_score <= 0.30


def test_source_intelligence_analyst_lock_preservation():
    # Create an analyst locked source tier
    st = si_mod.evaluate_source_credibility("custom-source.org", platform="web")
    st.tier = 1
    st.analyst_locked = True
    db.save_source_tier(st)

    # Re-evaluating must preserve the locked Tier 1
    re_eval = si_mod.evaluate_source_credibility("custom-source.org", platform="web")
    assert re_eval.tier == 1
    assert re_eval.analyst_locked is True
