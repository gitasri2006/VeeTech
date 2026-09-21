"""
Discovery Filtering Agent (Phase 1 Semantic Core)
Compliant with PRD Section 7.5, TRD Section 5.5, and TRD Section 6

Capabilities:
1. Semantic Shortlist: pgvector cosine similarity of translated/clean text against Entity embedding (default threshold >= 0.35).
2. Deterministic Rule Gate: Geography, source tier, recency window, mandatory/excluded boolean terms, language whitelist.
3. Natural Language Rule Compilation: Compiles human-readable rules into structured filter JSON using Gemini.
4. Rule Sandbox: Tests rules against historical/ingested content before activation.
5. Emits `filtering.passed` event to Redis Streams / MessageBus.
"""

from datetime import datetime, timezone
import logging
from typing import Any, Dict, List, Optional, Tuple
from fastapi import FastAPI, HTTPException, Query, status

from pydantic import BaseModel, Field

from services.common.bus import bus
from services.common.db import db, cosine_similarity
from services.common.embeddings import embedding_service
from services.common.gemini_client import gemini_client
from services.common.models import Article, Entity, Rule, Match, MatchType
from services.filtering.rule_evaluator import rule_evaluator, RuleEvaluationResult

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("discovery.filtering")

app = FastAPI(
    title="Discovery Filtering Agent",
    description="Semantic Shortlisting, Deterministic Rule Gating, and NL Rule Compilation Service",
    version="1.0.0",
)


# =====================================================================
# Request / Response Schemas
# =====================================================================

class EvaluateFilterRequest(BaseModel):
    article_id: str
    entity_id: str
    min_similarity: float = Field(default=0.35, ge=0.0, le=1.0)


class FilterEvaluationResponse(BaseModel):
    passed: bool
    semantic_passed: bool
    similarity_score: float
    rule_passed: bool
    rule_details: Dict[str, Any]
    matched_terms: List[str]
    match: Optional[Match] = None


class CompileNLRuleRequest(BaseModel):
    entity_id: Optional[str] = None
    natural_language: str = Field(..., description="Plain-English rule string (e.g. 'only Tier 1 Indian sources from last 48 hours excluding sports').")


class CreateRuleRequest(BaseModel):
    entity_id: Optional[str] = None
    group_id: Optional[str] = None
    geo_filter: Dict[str, Any] = Field(default_factory=dict)
    domain_rules: Dict[str, Any] = Field(default_factory=dict)
    recency_window: str = "30d"
    boolean_terms: Dict[str, Any] = Field(default_factory=dict)
    language_filter: Dict[str, Any] = Field(default_factory=dict)
    min_source_tier: int = 3
    natural_language: Optional[str] = None


class RuleSandboxRequest(BaseModel):
    rule: Rule
    sample_limit: int = Field(default=50, ge=1, le=500)


class RuleSandboxResponse(BaseModel):
    total_evaluated: int
    passed_count: int
    failed_count: int
    pass_rate_pct: float
    breakdown_by_failure_reason: Dict[str, int]
    sample_passed_articles: List[Dict[str, Any]]
    sample_failed_articles: List[Dict[str, Any]]


# =====================================================================
# Core Filtering Pipeline Logic
# =====================================================================

async def evaluate_article_for_entity(
    article: Article,
    entity: Entity,
    rule: Optional[Rule] = None,
    min_similarity: float = 0.35,
) -> Tuple[bool, float, RuleEvaluationResult, List[str], Optional[Match]]:
    """
    Two-stage filtering:
    1. Semantic similarity check (E5 / Multilingual embedding cosine similarity).
    2. Deterministic Rule Evaluator check.
    If both pass, produces Match record and publishes `filtering.passed`.
    """
    # 1. Semantic Shortlisting using pivot/translated text if available
    lang_tag = db.get_language_tag(article.id)
    effective_text = lang_tag.translated_text if lang_tag and lang_tag.translated_text else article.extracted_text
    article_text = f"{article.title} {effective_text}"
    article_embedding = embedding_service.get_embedding(article_text)
    db.save_article_embedding(article.id, article_embedding)


    entity_embedding = entity.embedding or embedding_service.get_embedding(
        f"{entity.name} {' '.join(entity.aliases)} {' '.join(entity.seed_terms)} {entity.disambiguation_context}"
    )

    similarity = cosine_similarity(article_embedding, entity_embedding)
    
    # Check matched seed terms & aliases
    text_lower = article_text.lower()
    matched_terms = [t for t in entity.seed_terms if t.lower() in text_lower]
    if entity.name.lower() in text_lower:
        matched_terms.append(entity.name)
    for alias in entity.aliases:
        if alias.lower() in text_lower and alias not in matched_terms:
            matched_terms.append(alias)
            
    if matched_terms:
        similarity = max(similarity, 0.65)

    semantic_passed = similarity >= min_similarity

    # 2. Deterministic Rule Gate
    effective_rule = rule or db.get_rule_by_entity(entity.id) or Rule(entity_id=entity.id)
    rule_result = rule_evaluator.evaluate(article, effective_rule, content_corpus=article_text)


    overall_passed = semantic_passed and rule_result.passed
    match = None

    if overall_passed:
        match = Match(
            article_id=article.id,
            entity_id=entity.id,
            match_type=MatchType.SEMANTIC if semantic_passed else MatchType.KEYWORD,
            confidence_score=round(similarity, 4),
            matched_seed_terms=matched_terms,
        )
        db.save_match(match)

        # Publish filtering.passed event
        event_payload = {
            "event": "filtering.passed",
            "match_id": match.id,
            "article_id": article.id,
            "entity_id": entity.id,
            "entity_name": entity.name,
            "confidence_score": match.confidence_score,
            "source_tier": article.source_tier,
            "title": article.title,
            "matched_seed_terms": matched_terms,
        }
        await bus.publish("filtering.passed", event_payload)
        logger.info("Article %s PASSED filter for entity %s (sim: %.3f)", article.id, entity.name, similarity)
    else:
        logger.debug("Article %s filtered out for entity %s (sem_pass=%s, rule_pass=%s)", article.id, entity.name, semantic_passed, rule_result.passed)

    return overall_passed, similarity, rule_result, matched_terms, match


# =====================================================================
# REST Endpoints
# =====================================================================

@app.get("/health", tags=["System"])
async def health_check():
    return {"status": "healthy", "service": "filtering", "version": "1.0.0"}


@app.post("/filter/evaluate", response_model=FilterEvaluationResponse, tags=["Filtering"])
async def evaluate_filter_endpoint(request: EvaluateFilterRequest):
    """Evaluate an article against a specific entity profile and rule."""
    article = db.get_article(request.article_id)
    if not article:
        raise HTTPException(status_code=404, detail="Article not found.")

    entity = db.get_entity(request.entity_id)
    if not entity:
        raise HTTPException(status_code=404, detail="Entity not found.")

    passed, sim, rule_res, matched_terms, match = await evaluate_article_for_entity(
        article=article,
        entity=entity,
        min_similarity=request.min_similarity,
    )

    return FilterEvaluationResponse(
        passed=passed,
        semantic_passed=sim >= request.min_similarity,
        similarity_score=round(sim, 4),
        rule_passed=rule_res.passed,
        rule_details={
            "failed_checks": rule_res.failed_checks,
            "reasons": rule_res.reasons,
            "details": rule_res.details,
        },
        matched_terms=matched_terms,
        match=match,
    )


@app.post("/rules/compile", response_model=Rule, tags=["Rules"])
async def compile_nl_rule_endpoint(request: CompileNLRuleRequest):
    """
    Compile a natural language rule into structured Rule JSON using Gemini.
    (e.g., 'only Tier 1 Indian sources from last 48 hours excluding sports').
    """
    compiled_json = gemini_client.compile_natural_language_rule(request.natural_language)
    
    rule = Rule(
        entity_id=request.entity_id,
        geo_filter=compiled_json.get("geo_filter", {}),
        domain_rules=compiled_json.get("domain_rules", {}),
        recency_window=compiled_json.get("recency_window", "30d"),
        boolean_terms=compiled_json.get("boolean_terms", {}),
        language_filter=compiled_json.get("language_filter", {}),
        min_source_tier=compiled_json.get("domain_rules", {}).get("min_tier", 3),
        natural_language=request.natural_language,
    )

    return db.save_rule(rule)


@app.post("/rules", response_model=Rule, status_code=status.HTTP_201_CREATED, tags=["Rules"])
async def create_rule_endpoint(request: CreateRuleRequest):
    """Save a structured Rule configuration."""
    rule = Rule(
        entity_id=request.entity_id,
        group_id=request.group_id,
        geo_filter=request.geo_filter,
        domain_rules=request.domain_rules,
        recency_window=request.recency_window,
        boolean_terms=request.boolean_terms,
        language_filter=request.language_filter,
        min_source_tier=request.min_source_tier,
        natural_language=request.natural_language,
    )
    return db.save_rule(rule)


@app.get("/rules", response_model=List[Rule], tags=["Rules"])
async def list_rules_endpoint(entity_id: Optional[str] = Query(default=None)):
    """List rules, optionally filtered by entity_id."""
    if entity_id:
        r = db.get_rule_by_entity(entity_id)
        return [r] if r else []
    return db.list_rules()


@app.get("/rules/{rule_id}", response_model=Rule, tags=["Rules"])
async def get_rule_endpoint(rule_id: str):
    """Get a specific rule by ID."""
    rule = db.get_rule(rule_id)
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found.")
    return rule


@app.delete("/rules/{rule_id}", tags=["Rules"])
async def delete_rule_endpoint(rule_id: str):
    """Delete a custom rule by ID."""
    success = db.delete_rule(rule_id)
    return {"status": "deleted", "rule_id": rule_id, "success": success}


@app.post("/rules/sandbox", response_model=RuleSandboxResponse, tags=["Rules"])
async def rule_sandbox_endpoint(request: RuleSandboxRequest):
    """
    Test any rule against historical/ingested content before activating it.
    Returns match statistics, pass/fail counts, and failure breakdown.
    """
    articles = db.list_articles()[:request.sample_limit]
    if not articles:
        return RuleSandboxResponse(
            total_evaluated=0,
            passed_count=0,
            failed_count=0,
            pass_rate_pct=0.0,
            breakdown_by_failure_reason={},
            sample_passed_articles=[],
            sample_failed_articles=[],
        )

    passed_articles = []
    failed_articles = []
    failure_counts: Dict[str, int] = {}

    for art in articles:
        res = rule_evaluator.evaluate(art, request.rule)
        if res.passed:
            passed_articles.append({"id": art.id, "title": art.title, "source": art.source, "tier": art.source_tier})
        else:
            for check in res.failed_checks:
                failure_counts[check] = failure_counts.get(check, 0) + 1
            failed_articles.append({
                "id": art.id,
                "title": art.title,
                "source": art.source,
                "tier": art.source_tier,
                "failed_checks": res.failed_checks,
                "reasons": res.reasons,
            })

    total = len(articles)
    pass_cnt = len(passed_articles)
    fail_cnt = len(failed_articles)

    return RuleSandboxResponse(
        total_evaluated=total,
        passed_count=pass_cnt,
        failed_count=fail_cnt,
        pass_rate_pct=round((pass_cnt / total) * 100, 2) if total > 0 else 0.0,
        breakdown_by_failure_reason=failure_counts,
        sample_passed_articles=passed_articles[:10],
        sample_failed_articles=failed_articles[:10],
    )
