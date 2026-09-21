"""
Unit tests for Discovery Phase 7 (Brief & Clustering Agent)
"""
import pytest
from datetime import datetime
from fastapi.testclient import TestClient

from services.common.models import Article, FactCheckResult, FactCheckVerdict
from services.common.db import db
from services.registry import get_brief_clustering_service

bc_mod = get_brief_clustering_service()
app = bc_mod.app
cluster_articles = bc_mod.cluster_articles
build_grounded_brief_for_cluster = bc_mod.build_grounded_brief_for_cluster

client = TestClient(app)


def test_story_clustering_by_embedding_similarity():
    """Verify similar articles cluster together while dissimilar ones partition separately."""
    art1 = Article(
        id="art-cluster-1",
        canonical_url="https://news.com/ev-1",
        source="news.com",
        title="Tata Motors launches new commercial EV line in Mumbai",
        extracted_text="Tata Motors today announced its new high efficiency electric truck fleet in Mumbai.",
        content_hash="hash_cl_1",
    )
    art2 = Article(
        id="art-cluster-2",
        canonical_url="https://ndtv.com/ev-2",
        source="ndtv.com",
        title="Tata Motors EV truck fleet unveiled for commercial delivery",
        extracted_text="Electric vehicle expansion: Tata Motors launches new commercial EV lineup.",
        content_hash="hash_cl_2",
    )
    art3 = Article(
        id="art-cluster-3",
        canonical_url="https://sports.com/cricket-1",
        source="sports.com",
        title="India wins cricket championship test match against Australia",
        extracted_text="A dramatic victory in the 5th test match secured the series trophy.",
        content_hash="hash_cl_3",
    )

    db.save_article(art1)
    db.save_article(art2)
    db.save_article(art3)

    clusters = cluster_articles([art1, art2, art3], similarity_threshold=0.60)
    
    # Should create 2 distinct clusters: [art1, art2] (EV news) and [art3] (Cricket)
    assert len(clusters) == 2
    ev_cluster = next(c for c in clusters if any(art.id == "art-cluster-1" for art in c))
    assert len(ev_cluster) == 2
    assert any(art.id == "art-cluster-2" for art in ev_cluster)


@pytest.mark.asyncio
async def test_grounded_sentence_citation_enforcement():
    """Verify that every sentence in a brief summary is strictly grounded with a valid article_id."""
    art_a = Article(
        id="art-ground-1",
        canonical_url="https://reuters.com/a1",
        source="reuters.com",
        source_tier=1,
        title="ISRO successfully conducts test for human spaceflight module",
        extracted_text="ISRO has completed critical propulsion tests for the Gaganyaan mission.",
        content_hash="hash_gr_1",
    )
    art_b = Article(
        id="art-ground-2",
        canonical_url="https://thehindu.com/b2",
        source="thehindu.com",
        source_tier=1,
        title="Gaganyaan mission passes crucial propulsion trials in Bengaluru",
        extracted_text="Propulsion system hot tests were successful at the test facility.",
        content_hash="hash_gr_2",
    )
    db.save_article(art_a)
    db.save_article(art_b)

    # Attach fact check verdicts
    db.save_fact_check(FactCheckResult(article_id=art_a.id, verdict=FactCheckVerdict.VERIFIED))
    db.save_fact_check(FactCheckResult(article_id=art_b.id, verdict=FactCheckVerdict.VERIFIED))

    brief = await build_grounded_brief_for_cluster([art_a, art_b], brief_title="Gaganyaan Propulsion Tests")

    assert brief.title == "Gaganyaan Propulsion Tests"
    assert len(brief.cluster_ids) == 2
    assert len(brief.summary_sentences) > 0

    # Ensure every single sentence is cited to either art_a or art_b
    valid_ids = {art_a.id, art_b.id}
    for sentence_obj in brief.summary_sentences:
        assert sentence_obj["article_id"] in valid_ids
        assert len(sentence_obj["text"]) > 5

    # Check authenticity rollup
    assert brief.authenticity_summary.get("Verified", 0) == 2


def test_briefs_api_endpoints():
    """Verify POST /briefs/generate and GET /briefs endpoints."""
    resp = client.post(
        "/briefs/generate",
        json={
            "time_window_hours": 48,
            "min_cluster_size": 1,
            "similarity_threshold": 0.50,
        }
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "briefs" in data
    assert "total_clusters" in data

    list_resp = client.get("/briefs")
    assert list_resp.status_code == 200
    assert isinstance(list_resp.json(), list)
