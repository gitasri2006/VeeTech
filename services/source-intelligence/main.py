"""
Discovery Source Intelligence Agent (Phase 5 Trust Layer)
Compliant with PRD Section 7.8, TRD Section 5.8, and TRD Section 6

Capabilities:
1. Unified Domain Discovery and Credibility Tiering in a single pass.
2. Heuristic credibility scoring: TLD authority (.edu, .gov, .org vs .xyz/.info), HTTPS, platform verified badges.
3. Qualitative credibility evaluation via Gemini.
4. Tier Assignment (Tier 1 = High, Tier 2 = Medium, Tier 3 = Low/Unverified).
5. Edit-Lock Protection: Analyst locked tiers (`analyst_locked = True`) are preserved.
6. DB persistence in `SourceTier` table.
"""

from datetime import datetime, timezone
import logging
from typing import Any, Dict, List, Optional
from fastapi import FastAPI, HTTPException, Query, status
from pydantic import BaseModel, Field

from services.common.db import db
from services.common.models import SourceTier, AuditLogEntry

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("discovery.source_intelligence")

app = FastAPI(
    title="Discovery Source Intelligence Agent",
    description="Domain/Channel Discovery, Authority Scoring, and Tier Management Service",
    version="1.0.0",
)


# =====================================================================
# Request / Response Schemas
# =====================================================================

class EvaluateSourceRequest(BaseModel):
    domain_or_handle: str = Field(..., description="Web domain or social handle (e.g. 'reuters.com', '@bbcnews').")
    platform: str = Field(default="web", description="web, x, youtube, instagram, telegram, reddit")
    is_verified_badge: bool = Field(default=False, description="Whether the channel carries an official platform verified badge.")


class UpdateSourceTierRequest(BaseModel):
    tier: int = Field(..., ge=1, le=3, description="1=High Authority, 2=Medium, 3=Low/Unverified")
    credibility_score: float = Field(..., ge=0.0, le=1.0)
    analyst_locked: bool = Field(default=True, description="Locks tier from automated recalculation.")
    reasoning: Optional[str] = Field(default=None, description="Analyst rationale.")


# =====================================================================
# Core Credibility Scoring & Tier Assignment Logic
# =====================================================================

def evaluate_source_credibility(
    domain_or_handle: str,
    platform: str = "web",
    is_verified_badge: bool = False,
) -> SourceTier:
    """
    Evaluates credibility score and assigns Tier (1, 2, 3) in a single unified pass.
    """
    clean_target = domain_or_handle.lower().strip()

    # Check if existing record is analyst locked
    existing = db.get_source_tier(clean_target)
    if existing and existing.analyst_locked:
        logger.info("Source %s is analyst locked (Tier %d). Skipping automatic update.", clean_target, existing.tier)
        return existing

    score = 0.50
    reasons = []

    # 1. TLD Authority & Known Patterns
    if clean_target.endswith(".gov") or clean_target.endswith(".gov.in"):
        score = 0.98
        reasons.append("Official government domain (.gov)")
    elif clean_target.endswith(".edu") or clean_target.endswith(".ac.in"):
        score = 0.92
        reasons.append("Accredited academic institution (.edu)")
    elif any(k in clean_target for k in ["reuters", "apnews", "bbc", "thehindu", "bloomberg", "wsj", "altnews", "boomlive"]):
        score = 0.95
        reasons.append("Globally recognized Tier-1 news wire / fact check body")
    elif any(k in clean_target for k in ["ndtv", "indianexpress", "timesofindia", "techcrunch", "theverge"]):
        score = 0.80
        reasons.append("Established mainstream publication")
    elif any(k in clean_target for k in [".xyz", ".top", ".info", "clickbait", "rumor", "viral-news"]):
        score = 0.20
        reasons.append("High-risk TLD or unverified blog indicator")
    else:
        # Dynamic Source Evaluation via LLMRouter for previously unseen domains
        try:
            from services.common.llm_router import llm_router
            eval_prompt = f"""You are the Source Intelligence & Credibility Assessment Agent.
Evaluate the journalistic credibility, publication authority, and reputation of the following domain: "{clean_target}"

Return valid JSON only:
{{
  "credibility_score": 0.0 to 1.0,
  "tier": 1 (Top Global/National Wire) or 2 (Established Industry/Regional News) or 3 (Blog/Aggregator/Unverified),
  "rationale": "One concise sentence on editorial standards and reputation."
}}
"""
            raw_eval, _ = llm_router.generate_text(eval_prompt)
            if raw_eval:
                match = re.search(r"\{.*\}", raw_eval, re.DOTALL)
                if match:
                    eval_data = json.loads(match.group(0))
                    score = float(eval_data.get("credibility_score", 0.60))
                    reasons.append(eval_data.get("rationale", "AI domain intelligence evaluation."))
        except Exception as eval_err:
            logger.debug("LLM source evaluation notice for %s: %s", clean_target, eval_err)
            score = 0.60
            reasons.append("Standard web domain heuristic baseline.")

    # 2. Platform Verification Boost
    if is_verified_badge:
        score = min(score + 0.15, 0.95)
        reasons.append("Carries official platform verification badge")

    # 3. Tier Assignment
    if score >= 0.88:
        tier = 1
    elif score >= 0.65:
        tier = 2
    else:
        tier = 3

    source_tier = SourceTier(
        domain_or_handle=clean_target,
        platform=platform,
        tier=tier,
        credibility_score=round(score, 4),
        analyst_locked=False,
        reasoning="; ".join(reasons) if reasons else "Automated heuristic evaluation.",
    )

    db.save_source_tier(source_tier)
    logger.info("Evaluated source %s: Tier %d (score: %.2f)", clean_target, tier, score)
    return source_tier


# =====================================================================
# REST Endpoints
# =====================================================================

@app.get("/health", tags=["System"])
async def health_check():
    return {"status": "healthy", "service": "source-intelligence", "version": "1.0.0"}


@app.post("/sources/evaluate", response_model=SourceTier, tags=["Source Intelligence"])
async def evaluate_source_endpoint(request: EvaluateSourceRequest):
    """Discover and score credibility tier for a domain or handle in one pass."""
    return evaluate_source_credibility(
        domain_or_handle=request.domain_or_handle,
        platform=request.platform,
        is_verified_badge=request.is_verified_badge,
    )


@app.get("/sources", response_model=List[SourceTier], tags=["Source Intelligence"])
async def list_sources(
    tier: Optional[int] = Query(default=None, ge=1, le=3),
    platform: Optional[str] = Query(default=None),
):
    sources = list(db.source_tiers.values())
    if tier is not None:
        sources = [s for s in sources if s.tier == tier]
    if platform:
        sources = [s for s in sources if s.platform.lower() == platform.lower()]
    return sources


@app.put("/sources/{domain_or_handle}", response_model=SourceTier, tags=["Source Intelligence"])
async def update_source_tier(domain_or_handle: str, request: UpdateSourceTierRequest):
    """Analyst override endpoint to lock or update a source tier."""
    clean_target = domain_or_handle.lower().strip()
    existing = db.get_source_tier(clean_target)
    before_state = existing.model_dump() if existing else None

    st = SourceTier(
        domain_or_handle=clean_target,
        platform=existing.platform if existing else "web",
        tier=request.tier,
        credibility_score=request.credibility_score,
        analyst_locked=request.analyst_locked,
        reasoning=request.reasoning or "Analyst manual tier assignment.",
    )
    db.save_source_tier(st)

    db.log_audit(
        AuditLogEntry(
            actor_id="analyst",
            action_type="update_source_tier",
            target_id=clean_target,
            before=before_state,
            after=st.model_dump(),
        )
    )

    return st
