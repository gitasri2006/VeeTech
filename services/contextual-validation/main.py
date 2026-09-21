"""
Discovery Contextual Validation Agent (Phase 1 Semantic Core)
Compliant with PRD Section 7.6, TRD Section 5.6, TRD Section 6, and TRD Section 10

Capabilities:
1. LLM-based disambiguation against entity profile context and exclusion terms.
2. Three-way confidence routing:
   - >= 0.85: Auto-approved
   - 0.50 - 0.85: Analyst review queue
   - < 0.50: Auto-rejected
3. One-line human-readable explanation of the validation rationale.
4. Permanent 5% Human-in-the-loop QA sampling (TRD Section 10).
5. Emits `validation.completed` event to Redis Streams / MessageBus.
"""

from datetime import datetime, timezone
import logging
import random
from typing import Any, Dict, List, Optional, Tuple
from fastapi import FastAPI, HTTPException, Query, status
from pydantic import BaseModel, Field

from services.common.bus import bus
from services.common.db import db
from services.common.llm_router import llm_router
from services.common.models import Validation, ValidationStatus, AuditLogEntry

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("discovery.contextual_validation")

app = FastAPI(
    title="Discovery Contextual Validation Agent",
    description="LLM Disambiguation and Three-Way Confidence Routing Service",
    version="1.0.0",
)


# =====================================================================
# Schemas
# =====================================================================

class ValidateMatchRequest(BaseModel):
    match_id: str
    force_qa_sample: bool = Field(default=False, description="Force routing to review queue for QA testing.")


class ValidationResponse(BaseModel):
    validation: Validation
    is_qa_sampled: bool = False
    routing_action: str  # auto_approved, analyst_review, auto_rejected, qa_sample_review


class HumanOverrideRequest(BaseModel):
    new_status: ValidationStatus
    reviewer_id: str = "analyst-01"
    reason: str = Field(..., description="Analyst reason for overturning or confirming verdict.")


# =====================================================================
# Core Validation Logic
# =====================================================================

async def validate_candidate_match(
    match_id: str,
    force_qa_sample: bool = False,
    qa_sample_rate: float = 0.05,
) -> Tuple[Validation, bool, str]:
    """
    Perform LLM contextual disambiguation and three-way confidence routing.
    
    Returns: (Validation, is_qa_sampled: bool, routing_action: str)
    """
    match = db.matches.get(match_id)
    if not match:
        raise ValueError(f"Match {match_id} not found in database.")

    article = db.get_article(match.article_id)
    entity = db.get_entity(match.entity_id)

    if not article or not entity:
        raise ValueError("Referenced Article or Entity does not exist.")

    # Check for translated text if multilingual
    lang_tag = db.get_language_tag(article.id)
    effective_text = lang_tag.translated_text if lang_tag and lang_tag.translated_text else article.extracted_text

    # Call LLM contextual validation via LLMRouter
    llm_result = llm_router.validate_context(
        entity_name=entity.name,
        disambiguation_context=entity.disambiguation_context,
        exclusion_terms=entity.exclusion_terms,
        text=f"{article.title}\n{effective_text}",
    )

    confidence = float(llm_result.get("confidence", 0.5))
    sentiment = llm_result.get("sentiment", "neutral")
    reason = llm_result.get("reason", "Automated contextual validation.")
    relevant = bool(llm_result.get("relevant", True))

    is_qa_sampled = False
    # Three-way confidence routing
    if not relevant or confidence < 0.50:
        val_status = ValidationStatus.REJECTED
        routing_action = "auto_rejected"
    elif confidence >= 0.85:
        # Check 5% QA sampling (TRD Section 10)
        if force_qa_sample or random.random() < qa_sample_rate:
            val_status = ValidationStatus.NEEDS_REVIEW
            routing_action = "qa_sample_review"
            is_qa_sampled = True
            reason = f"[QA Sample 5%] {reason}"
        else:
            val_status = ValidationStatus.APPROVED
            routing_action = "auto_approved"
    else:
        # Borderline confidence (0.50 <= confidence < 0.85)
        val_status = ValidationStatus.NEEDS_REVIEW
        routing_action = "analyst_review"

    validation = Validation(
        match_id=match.id,
        disambiguation_confidence=round(confidence, 4),
        sentiment=sentiment,
        validated_status=val_status,
        validated_by="system",
        reason=reason,
    )
    db.save_validation(validation)

    # Publish validation.completed event
    event_payload = {
        "event": "validation.completed",
        "validation_id": validation.id,
        "match_id": match.id,
        "article_id": article.id,
        "entity_id": entity.id,
        "entity_name": entity.name,
        "validated_status": validation.validated_status.value,
        "confidence": validation.disambiguation_confidence,
        "routing_action": routing_action,
        "reason": validation.reason,
    }
    await bus.publish("validation.completed", event_payload)

    logger.info("Match %s validated: status=%s, conf=%.2f, action=%s", match.id, val_status.value, confidence, routing_action)
    return validation, is_qa_sampled, routing_action


# =====================================================================
# REST Endpoints
# =====================================================================

@app.get("/health", tags=["System"])
async def health_check():
    return {"status": "healthy", "service": "contextual-validation", "version": "1.0.0"}


@app.post("/validate", response_model=ValidationResponse, tags=["Validation"])
async def validate_endpoint(request: ValidateMatchRequest):
    """Disambiguate a match and apply confidence routing."""
    try:
        validation, is_sampled, action = await validate_candidate_match(
            match_id=request.match_id,
            force_qa_sample=request.force_qa_sample,
        )
        return ValidationResponse(
            validation=validation,
            is_qa_sampled=is_sampled,
            routing_action=action,
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@app.get("/validations", response_model=List[Validation], tags=["Validation"])
async def list_validations_endpoint(
    status_filter: Optional[ValidationStatus] = Query(default=None),
):
    vals = list(db.validations.values())
    if status_filter:
        vals = [v for v in vals if v.validated_status == status_filter]
    return vals


@app.get("/review-queue", response_model=List[Dict[str, Any]], tags=["Moderation"])
async def get_review_queue():
    """Retrieve items awaiting analyst confirmation in the moderation queue."""
    pending = [v for v in db.validations.values() if v.validated_status == ValidationStatus.NEEDS_REVIEW]
    results = []
    for v in pending:
        match = db.matches.get(v.match_id)
        article = db.get_article(match.article_id) if match else None
        entity = db.get_entity(match.entity_id) if match else None
        results.append({
            "validation": v,
            "match": match,
            "article": article,
            "entity": entity,
        })
    return results


@app.post("/review-queue/{validation_id}/override", response_model=Validation, tags=["Moderation"])
async def human_override_endpoint(validation_id: str, request: HumanOverrideRequest):
    """Allow analyst to approve or reject borderline or QA-sampled validations."""
    val = db.validations.get(validation_id)
    if not val:
        raise HTTPException(status_code=404, detail="Validation not found.")

    before_state = val.model_dump()

    val.validated_status = request.new_status
    val.validated_by = request.reviewer_id
    val.reason = f"Human override by {request.reviewer_id}: {request.reason}"
    db.save_validation(val)

    db.log_audit(
        AuditLogEntry(
            actor_id=request.reviewer_id,
            action_type="override_validation",
            target_id=val.id,
            before=before_state,
            after=val.model_dump(),
        )
    )

    return val
