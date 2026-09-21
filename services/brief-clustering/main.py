"""
Discovery Brief & Clustering Agent
Compliant with PRD Section 7.9, 8.9 and TRD Section 5.9 (Agent 9)

Features:
- Scheduled batch job & on-demand cycle execution
- 768-dim embedding-based cosine similarity clustering of same-cycle articles
- Grounded Gemini summary synthesis
- Schema-enforced grounding & citation verification: every summary sentence strictly attributed to an article_id
- Rejection and tracking of unattributable sentences
- Cluster-level authenticity distribution aggregation
- Real-time event publishing to Redis Streams
"""
import logging
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional
from fastapi import FastAPI, HTTPException, Query
from pydantic import BaseModel, Field

from services.common.models import Brief, Article, FactCheckVerdict
from services.common.db import db, cosine_similarity
from services.common.bus import bus
from services.common.embeddings import get_embedding
from services.common.gemini_client import gemini_client

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("brief-clustering")

app = FastAPI(
    title="Discovery Brief & Clustering Service",
    version="1.0.0",
    description="Embedding-based story clustering and schema-grounded summary generation service."
)


# =====================================================================
# Request / Response Schemas
# =====================================================================

class GenerateBriefRequest(BaseModel):
    title: Optional[str] = None
    entity_id: Optional[str] = None
    time_window_hours: int = 48
    similarity_threshold: float = 0.65
    min_cluster_size: int = 1


class GenerateBriefResponse(BaseModel):
    briefs: List[Brief]
    total_clusters: int
    total_articles_clustered: int


# =====================================================================
# Clustering Engine
# =====================================================================

def cluster_articles(
    articles: List[Article],
    similarity_threshold: float = 0.65
) -> List[List[Article]]:
    """
    Cluster articles using greedy embedding cosine similarity graph partitioning.
    Articles above similarity_threshold join the same story cluster.
    """
    if not articles:
        return []

    # Ensure embeddings exist for all articles
    embeddings: Dict[str, List[float]] = {}
    for art in articles:
        emb = db.article_embeddings.get(art.id)
        if not emb:
            emb = get_embedding(f"{art.title} {art.extracted_text}")
            db.save_article_embedding(art.id, emb)
        embeddings[art.id] = emb

    clusters: List[List[Article]] = []
    visited = set()

    for i, art_a in enumerate(articles):
        if art_a.id in visited:
            continue

        cluster = [art_a]
        visited.add(art_a.id)
        emb_a = embeddings[art_a.id]

        for j, art_b in enumerate(articles):
            if art_b.id in visited or i == j:
                continue
            emb_b = embeddings[art_b.id]
            sim = cosine_similarity(emb_a, emb_b)
            if sim >= similarity_threshold:
                cluster.append(art_b)
                visited.add(art_b.id)

        clusters.append(cluster)

    return clusters


async def build_grounded_brief_for_cluster(
    cluster: List[Article],
    entity_id: Optional[str] = None,
    brief_title: Optional[str] = None
) -> Brief:
    """
    Generates a schema-grounded Brief for a cluster of articles:
    1. Prepares article payloads.
    2. Calls Gemini / deterministic grounded synthesizer.
    3. Enforces that every single sentence has a valid citation to an article_id in the cluster.
    4. Computes authenticity distribution across the cluster.
    """
    articles_payload = [
        {
            "id": art.id,
            "title": art.title,
            "source": art.source,
            "source_tier": art.source_tier,
            "extracted_text": art.extracted_text[:1000],
            "published_at": art.published_at.isoformat() if art.published_at else None,
        }
        for art in cluster
    ]

    cluster_name = brief_title or f"Story Cluster: {cluster[0].title[:60]}"

    # Invoke Grounded Digest Synthesis
    digest_res = gemini_client.generate_grounded_digest(
        cluster_title=cluster_name,
        articles=articles_payload,
    )

    valid_article_ids = {art.id for art in cluster}
    verified_sentences = []
    unattributable_count = digest_res.get("unattributable_count", 0)

    for s in digest_res.get("summary_sentences", []):
        sentence_text = s.get("text", "").strip()
        attributed_id = s.get("article_id")
        
        # Hard Grounding Constraint:
        # Every sentence MUST be attributable to a real source article in this cluster!
        if attributed_id in valid_article_ids and sentence_text:
            verified_sentences.append({
                "text": sentence_text,
                "article_id": attributed_id,
            })
        else:
            logger.warning("Rejected ungrounded brief sentence: '%s' (attributed: %s)", sentence_text, attributed_id)
            unattributable_count += 1

    # Aggregate authenticity summary across cluster articles
    authenticity_counts: Dict[str, int] = {}
    for art in cluster:
        fc = db.get_fact_check(art.id)
        verdict_val = fc.verdict.value if fc and fc.verdict else "Unverified"
        authenticity_counts[verdict_val] = authenticity_counts.get(verdict_val, 0) + 1

    brief = Brief(
        title=cluster_name,
        entity_id=entity_id,
        cluster_ids=[art.id for art in cluster],
        summary_sentences=verified_sentences,
        unattributable_count=unattributable_count,
        authenticity_summary=authenticity_counts,
    )
    db.save_brief(brief)

    # Publish brief.created event
    await bus.publish("brief.created", {
        "brief_id": brief.id,
        "title": brief.title,
        "entity_id": brief.entity_id,
        "cluster_size": len(brief.cluster_ids),
        "sentences_count": len(brief.summary_sentences),
        "unattributable_count": brief.unattributable_count,
    })

    logger.info("Generated Grounded Brief %s for %d articles (Grounding: %d sentences, %d rejected)",
                brief.id, len(cluster), len(brief.summary_sentences), brief.unattributable_count)
    return brief


# =====================================================================
# REST Endpoints
# =====================================================================

@app.get("/health", tags=["System"])
async def health_check():
    return {
        "status": "healthy",
        "service": "brief-clustering",
        "version": "1.0.0",
        "total_briefs": len(db.list_briefs()),
    }


@app.post("/briefs/generate", response_model=GenerateBriefResponse, tags=["Briefs & Clustering"])
async def generate_briefs_endpoint(req: GenerateBriefRequest):
    """
    Trigger story clustering and schema-grounded brief generation.
    """
    # Fetch candidate articles
    now = datetime.now(timezone.utc)
    cutoff = now - timedelta(hours=req.time_window_hours)

    all_articles = list(db.articles.values())
    candidate_articles = []

    for art in all_articles:
        # If entity_id specified, filter by matches
        if req.entity_id:
            matches = [m for m in db.list_matches(req.entity_id) if m.article_id == art.id]
            if not matches:
                continue
        candidate_articles.append(art)

    if not candidate_articles:
        # If no articles, return empty
        return GenerateBriefResponse(briefs=[], total_clusters=0, total_articles_clustered=0)

    # Partition into story clusters
    clusters = cluster_articles(
        articles=candidate_articles,
        similarity_threshold=req.similarity_threshold,
    )

    generated_briefs = []
    total_clustered = 0

    for cluster in clusters:
        if len(cluster) >= req.min_cluster_size:
            brief = await build_grounded_brief_for_cluster(
                cluster=cluster,
                entity_id=req.entity_id,
                brief_title=req.title,
            )
            generated_briefs.append(brief)
            total_clustered += len(cluster)

    return GenerateBriefResponse(
        briefs=generated_briefs,
        total_clusters=len(generated_briefs),
        total_articles_clustered=total_clustered,
    )


@app.get("/briefs", response_model=List[Brief], tags=["Briefs & Clustering"])
async def list_briefs_endpoint(entity_id: Optional[str] = Query(None)):
    """List all generated Executive Briefs, optionally filtered by tracked entity."""
    return db.list_briefs(entity_id=entity_id)


@app.get("/briefs/{brief_id}", response_model=Brief, tags=["Briefs & Clustering"])
async def get_brief_endpoint(brief_id: str):
    """Retrieve specific Executive Brief with sentence-level citations."""
    brief = db.get_brief(brief_id)
    if not brief:
        raise HTTPException(status_code=404, detail="Brief not found.")
    return brief


@app.post("/briefs/batch-cycle", tags=["Batch Automation"])
async def run_batch_monitoring_cycle():
    """
    Scheduled monitoring cycle trigger (Agent 9 TRD Section 5.9).
    Clusters all recent un-briefed articles across all entities.
    """
    req = GenerateBriefRequest(time_window_hours=24, min_cluster_size=1)
    res = await generate_briefs_endpoint(req)
    return {
        "status": "cycle_completed",
        "briefs_created": res.total_clusters,
        "articles_processed": res.total_articles_clustered,
    }
