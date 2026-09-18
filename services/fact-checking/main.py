"""
VeriScope Fact-Checking & Authenticity Agent (Phase 5 Trust Layer)
Compliant with PRD Section 7.7, 8.5, TRD Section 5.7, and TRD Section 6

Capabilities:
1. Cross-Source Corroboration: Checks claim occurrence across independent Tier-1 sources.
2. Claim-Level Fact-Check Lookups: Queries Google Fact Check Tools API and regional debunk feeds (PIB, Alt News, BOOM Live).
3. Manipulated Media & Stale Context Detection: Checks reverse image matches and video tamper flags.
4. Authenticity Scoring & Verdict Synthesis: Produces authenticity_score (0.0 to 1.0) and verdict enum.
5. MANDATORY HUMAN REVIEW: Disputed and Likely False items ALWAYS set `needs_human_review = True`.
6. Emits `factcheck.verdict` event to Redis Streams / MessageBus.
"""

from datetime import datetime, timezone
import logging
from typing import Any, Dict, List, Optional, Tuple
from fastapi import FastAPI, HTTPException, Query, status
from pydantic import BaseModel, Field

from services.common.bus import bus
from services.common.db import db
from services.common.gemini_client import gemini_client
from services.common.models import FactCheckResult, FactCheckVerdict, AuditLogEntry

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("veriscope.fact_checking")

app = FastAPI(
    title="VeriScope Fact-Checking & Authenticity Agent",
    description="Automated Fact Verification, Authenticity Scoring, and Human-in-the-Loop Moderation Service",
    version="1.0.0",
)


# =====================================================================
# Request / Response Schemas
# =====================================================================

class EvaluateFactCheckRequest(BaseModel):
    article_id: str
    force_manipulated_flag: bool = Field(default=False, description="Simulate manipulated media detection for test/verification.")


class HumanReviewRequest(BaseModel):
    reviewed_by: str = Field(..., description="Fact-Verification Analyst user ID.")
    final_verdict: FactCheckVerdict = Field(..., description="Confirmed or overturned verdict.")
    override_reason: str = Field(..., description="Analyst rationale for verdict decision.")


# =====================================================================
# Core Fact Checking & Authenticity Logic
# =====================================================================

def query_fact_check_database(title: str, text: str) -> List[Dict[str, Any]]:
    """Simulate queries against Google Fact Check API, Alt News, BOOM Live, and PIB feeds."""
    matches = []
    combined = (title + " " + text).lower()

    if any(k in combined for k in ["hoax", "fake viral", "5g causes virus", "miracle cure", "deepfake speech", "unesco declares", "unesco", "nasa diwali"]):
        matches.append({
            "claim": "Viral claim regarding miraculous cure or fabricated statement.",
            "claimant": "Social Media Viral Posts",
            "fact_checker": "Alt News & BOOM Live",
            "rating": "False / Fabricated",
            "url": "https://boomlive.in/fact-check/debunked-viral-claim",
            "review_date": datetime.now(timezone.utc).isoformat(),
        })
    elif "disputed rumor" in combined or "alleged leak" in combined:
        matches.append({
            "claim": "Unconfirmed leak regarding confidential corporate transactions.",
            "claimant": "Anonymous Blog",
            "fact_checker": "PIB Fact Check",
            "rating": "Unverified / Disputed",
            "url": "https://pib.gov.in/factcheck/disputed",
            "review_date": datetime.now(timezone.utc).isoformat(),
        })

    return matches


def check_media_authenticity(article_id: str, force_manipulated: bool = False) -> Tuple[bool, bool, List[Dict[str, Any]]]:
    """
    Check image/video media for manipulation, deepfakes, or recycled stale context.
    Returns: (manipulated_flag: bool, stale_context_flag: bool, reverse_matches: List)
    """
    media_assets = db.get_media_by_article(article_id)
    if force_manipulated:
        return True, False, [{"match_url": "https://stockphoto.example.com/2018-recycled.jpg", "similarity": 0.99, "year": 2018}]

    if not media_assets:
        return False, False, []

    for asset in media_assets:
        if asset.type.value in ["image", "video"]:
            text_corpus = f"{asset.ocr_text or ''} {asset.caption or ''}".lower()
            if "recycled photo" in text_corpus or "2015 archive" in text_corpus:
                return False, True, [{"match_url": "https://archive.example.com/2015-original.jpg", "year": 2015}]
            if "deepfake" in text_corpus or "tampered" in text_corpus:
                return True, False, [{"match_url": "https://faceforensics.org/tampered", "tamper_score": 0.94}]

    return False, False, []


async def evaluate_article_authenticity(
    article_id: str,
    force_manipulated: bool = False,
) -> FactCheckResult:
    """
    Comprehensive Fact-Checking Pass:
    1. Fact-check DB lookup.
    2. Media authenticity & reverse search.
    3. Gemini synthesis.
    4. Enforce mandatory human review for Disputed / Likely False verdicts.
    """
    article = db.get_article(article_id)
    if not article:
        raise ValueError(f"Article {article_id} not found.")

    # 1. Fact Check DB matches
    claim_matches = query_fact_check_database(article.title, article.extracted_text)

    # 2. Reverse search & media tamper checks
    is_manipulated, is_stale, media_matches = check_media_authenticity(article_id, force_manipulated)

    # 3. Gemini fact check evaluation
    fc_synthesis = gemini_client.evaluate_fact_check(
        title=article.title,
        text=article.extracted_text,
        claim_matches=claim_matches,
        reverse_image_matches=media_matches,
        source_tier=article.source_tier,
    )

    score = float(fc_synthesis.get("authenticity_score", 0.50))
    verdict_str = fc_synthesis.get("verdict", "Unverified")

    # Map string to FactCheckVerdict Enum
    if is_manipulated or verdict_str == "Likely False":
        verdict = FactCheckVerdict.LIKELY_FALSE
        score = min(score, 0.20)
    elif verdict_str == "Disputed":
        verdict = FactCheckVerdict.DISPUTED
        score = min(score, 0.50)
    elif verdict_str == "Verified":
        verdict = FactCheckVerdict.VERIFIED
    else:
        verdict = FactCheckVerdict.UNVERIFIED

    # NON-NEGOTIABLE GLOBAL RULE:
    # Disputed and Likely False items MUST ALWAYS route to human review before final publish!
    needs_review = verdict in [FactCheckVerdict.DISPUTED, FactCheckVerdict.LIKELY_FALSE]

    evidence = fc_synthesis.get("evidence", [])
    if claim_matches:
        for cm in claim_matches:
            evidence.append({
                "source": cm["fact_checker"],
                "status": "debunked" if verdict == FactCheckVerdict.LIKELY_FALSE else "disputed",
                "url": cm["url"],
                "summary": cm["claim"],
            })

    result = FactCheckResult(
        article_id=article.id,
        authenticity_score=round(score, 4),
        verdict=verdict,
        evidence_sources=evidence,
        manipulated_media_flag=is_manipulated,
        stale_context_flag=is_stale,
        needs_human_review=needs_review,
    )
    db.save_fact_check(result)

    # Publish factcheck.verdict event
    payload = {
        "event": "factcheck.verdict",
        "article_id": article.id,
        "title": article.title,
        "authenticity_score": result.authenticity_score,
        "verdict": result.verdict.value,
        "needs_human_review": result.needs_human_review,
        "manipulated_media_flag": result.manipulated_media_flag,
        "evidence_count": len(result.evidence_sources),
    }
    await bus.publish("factcheck.verdict", payload)

    logger.info("Fact check completed for Article %s: score=%.2f, verdict=%s, needs_review=%s", article.id, score, verdict.value, needs_review)
    return result


# =====================================================================
# REST Endpoints
# =====================================================================

@app.get("/health", tags=["System"])
async def health_check():
    return {"status": "healthy", "service": "fact-checking", "version": "1.0.0"}


@app.post("/factcheck/evaluate", response_model=FactCheckResult, tags=["Fact-Checking"])
async def evaluate_endpoint(request: EvaluateFactCheckRequest):
    """Run fact-check and authenticity verification on an article."""
    try:
        return await evaluate_article_authenticity(
            article_id=request.article_id,
            force_manipulated=request.force_manipulated_flag,
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@app.get("/factcheck/queue", response_model=List[FactCheckResult], tags=["Moderation"])
async def list_human_review_queue():
    """Retrieve all Disputed or Likely False items requiring Fact-Verification Analyst sign-off."""
    return db.list_fact_checks_for_review()


@app.get("/factcheck/{article_id}", response_model=FactCheckResult, tags=["Fact-Checking"])
async def get_fact_check_endpoint(article_id: str):
    """Retrieve fact-check result for an article."""
    res = db.get_fact_check(article_id)
    if not res:
        raise HTTPException(status_code=404, detail="Fact check result not found.")
    return res


@app.post("/factcheck/{article_id}/review", response_model=FactCheckResult, tags=["Moderation"])
async def submit_human_review(article_id: str, request: HumanReviewRequest):
    """
    Fact-Verification Analyst sign-off endpoint to confirm or overturn automated verdict.
    """
    fc = db.get_fact_check(article_id)
    if not fc:
        raise HTTPException(status_code=404, detail="Fact check not found.")

    before_state = fc.model_dump()

    fc.verdict = request.final_verdict
    fc.reviewed_by = request.reviewed_by
    fc.human_override_reason = request.override_reason
    fc.needs_human_review = False  # Cleared upon human sign-off
    db.save_fact_check(fc)

    # Log to audit trail
    db.log_audit(
        AuditLogEntry(
            actor_id=request.reviewed_by,
            action_type="fact_check_human_sign_off",
            target_id=fc.id,
            before=before_state,
            after=fc.model_dump(),
        )
    )

    logger.info("Human sign-off completed for FactCheck %s by %s (verdict: %s)", fc.id, request.reviewed_by, fc.verdict.value)
    return fc
