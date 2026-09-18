"""
VeriScope Entity Profile Agent (Phase 1 Semantic Core)
Compliant with PRD Section 7.4, TRD Section 5.4, and TRD Section 6

Capabilities:
1. LLM-assisted generation of aliases, seed terms, exclusion terms, and disambiguation context.
2. 768-dimensional multilingual vector embedding generation for semantic search.
3. Edit-precedence lock: Fields in `analyst_edited_fields` are preserved during automated refresh cycles.
4. Full CRUD and refresh REST endpoints.
"""

from datetime import datetime, timezone
import logging
from typing import Any, Dict, List, Optional
from fastapi import FastAPI, HTTPException, Query, status
from pydantic import BaseModel, Field

from services.common.db import db
from services.common.embeddings import embedding_service
from services.common.gemini_client import gemini_client
from services.common.models import Entity, AuditLogEntry

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("veriscope.entity_profile")

app = FastAPI(
    title="VeriScope Entity Profile Agent",
    description="Entity Knowledge Graph, Alias Expansion, and Disambiguation Profile Service",
    version="1.0.0",
)


# =====================================================================
# Request / Response Schemas
# =====================================================================

class CreateEntityRequest(BaseModel):
    name: str = Field(..., description="Canonical entity name (e.g. 'Stripe', 'Infosys', 'Tata Motors').")
    type: str = Field(default="Company", description="Entity category: Company, Person, Organization, Brand, etc.")
    url: Optional[str] = Field(default="", description="Official corporate website or reference URL.")
    description: Optional[str] = Field(default="", description="Brief background context or industry description.")
    owner_team_id: Optional[str] = Field(default="team-default")


class UpdateEntityRequest(BaseModel):
    name: Optional[str] = None
    type: Optional[str] = None
    aliases: Optional[List[str]] = None
    seed_terms: Optional[List[str]] = None
    exclusion_terms: Optional[List[str]] = None
    disambiguation_context: Optional[str] = None
    status: Optional[str] = None
    edited_by_analyst: bool = Field(default=True, description="Marks modified fields with edit-precedence lock.")


# =====================================================================
# Core Logic
# =====================================================================

def build_entity_embedding(entity: Entity) -> List[float]:
    """Generate normalized 768-dim embedding representing the entity profile."""
    text_corpus = f"{entity.name} {' '.join(entity.aliases)} {' '.join(entity.seed_terms)} {entity.disambiguation_context}"
    return embedding_service.get_embedding(text_corpus)


# =====================================================================
# Endpoints
# =====================================================================

@app.get("/health", tags=["System"])
async def health_check():
    return {"status": "healthy", "service": "entity-profile", "version": "1.0.0"}


@app.post("/entities", response_model=Entity, status_code=status.HTTP_201_CREATED, tags=["Entities"])
async def create_entity(request: CreateEntityRequest):
    """
    Onboard a new tracked entity.
    Automatically generates aliases, seed terms, exclusion terms, and disambiguation context via Gemini,
    then generates and indexes the 768-dim profile embedding.
    """
    profile_data = gemini_client.generate_entity_profile(
        name=request.name,
        description=request.description or f"Corporate entity in {request.type}",
        url=request.url or ""
    )

    entity = Entity(
        name=request.name,
        type=request.type,
        aliases=profile_data.get("aliases", [request.name]),
        seed_terms=profile_data.get("seed_terms", []),
        exclusion_terms=profile_data.get("exclusion_terms", []),
        disambiguation_context=profile_data.get("disambiguation_context", ""),
        owner_team_id=request.owner_team_id,
        status="active",
    )

    # Generate and store embedding
    entity.embedding = build_entity_embedding(entity)

    # Save to database repository
    db.save_entity(entity)
    logger.info("Created entity: %s (id: %s, aliases: %d)", entity.name, entity.id, len(entity.aliases))

    # Audit log entry
    db.log_audit(
        AuditLogEntry(
            actor_id="system",
            action_type="create_entity",
            target_id=entity.id,
            after=entity.model_dump(),
        )
    )

    return entity


@app.get("/entities", response_model=List[Entity], tags=["Entities"])
async def list_entities():
    """List all tracked entities."""
    return db.list_entities()


@app.get("/entities/{entity_id}", response_model=Entity, tags=["Entities"])
async def get_entity(entity_id: str):
    """Retrieve specific entity profile."""
    entity = db.get_entity(entity_id)
    if not entity:
        raise HTTPException(status_code=404, detail="Entity not found.")
    return entity


@app.put("/entities/{entity_id}", response_model=Entity, tags=["Entities"])
async def update_entity(entity_id: str, request: UpdateEntityRequest):
    """
    Update entity profile.
    Any field updated with `edited_by_analyst=True` is recorded in `analyst_edited_fields`
    to prevent automated refreshes from overwriting analyst edits (Edit-Precedence Lock).
    """
    entity = db.get_entity(entity_id)
    if not entity:
        raise HTTPException(status_code=404, detail="Entity not found.")

    before_state = entity.model_dump()

    if request.name is not None:
        entity.name = request.name
        if request.edited_by_analyst and "name" not in entity.analyst_edited_fields:
            entity.analyst_edited_fields.append("name")

    if request.type is not None:
        entity.type = request.type
        if request.edited_by_analyst and "type" not in entity.analyst_edited_fields:
            entity.analyst_edited_fields.append("type")

    if request.aliases is not None:
        entity.aliases = request.aliases
        if request.edited_by_analyst and "aliases" not in entity.analyst_edited_fields:
            entity.analyst_edited_fields.append("aliases")

    if request.seed_terms is not None:
        entity.seed_terms = request.seed_terms
        if request.edited_by_analyst and "seed_terms" not in entity.analyst_edited_fields:
            entity.analyst_edited_fields.append("seed_terms")

    if request.exclusion_terms is not None:
        entity.exclusion_terms = request.exclusion_terms
        if request.edited_by_analyst and "exclusion_terms" not in entity.analyst_edited_fields:
            entity.analyst_edited_fields.append("exclusion_terms")

    if request.disambiguation_context is not None:
        entity.disambiguation_context = request.disambiguation_context
        if request.edited_by_analyst and "disambiguation_context" not in entity.analyst_edited_fields:
            entity.analyst_edited_fields.append("disambiguation_context")

    if request.status is not None:
        entity.status = request.status

    # Recompute embedding
    entity.embedding = build_entity_embedding(entity)
    db.save_entity(entity)

    # Audit log
    db.log_audit(
        AuditLogEntry(
            actor_id="analyst" if request.edited_by_analyst else "system",
            action_type="update_entity",
            target_id=entity.id,
            before=before_state,
            after=entity.model_dump(),
        )
    )

    return entity


@app.post("/entities/{entity_id}/refresh", response_model=Entity, tags=["Entities"])
async def refresh_entity_profile(entity_id: str):
    """
    Automated monthly/periodic profile refresh.
    Protected by Edit-Precedence Lock: Any field present in `analyst_edited_fields` is preserved.
    """
    entity = db.get_entity(entity_id)
    if not entity:
        raise HTTPException(status_code=404, detail="Entity not found.")

    before_state = entity.model_dump()

    refreshed_data = gemini_client.generate_entity_profile(
        name=entity.name,
        description=entity.disambiguation_context or f"Corporate entity in {entity.type}",
        url=""
    )

    # Apply only to non-locked fields
    if "aliases" not in entity.analyst_edited_fields and refreshed_data.get("aliases"):
        entity.aliases = refreshed_data["aliases"]

    if "seed_terms" not in entity.analyst_edited_fields and refreshed_data.get("seed_terms"):
        entity.seed_terms = refreshed_data["seed_terms"]

    if "exclusion_terms" not in entity.analyst_edited_fields and refreshed_data.get("exclusion_terms"):
        entity.exclusion_terms = refreshed_data["exclusion_terms"]

    if "disambiguation_context" not in entity.analyst_edited_fields and refreshed_data.get("disambiguation_context"):
        entity.disambiguation_context = refreshed_data["disambiguation_context"]

    entity.embedding = build_entity_embedding(entity)
    db.save_entity(entity)

    db.log_audit(
        AuditLogEntry(
            actor_id="system_cron",
            action_type="refresh_entity",
            target_id=entity.id,
            before=before_state,
            after=entity.model_dump(),
        )
    )

    return entity
