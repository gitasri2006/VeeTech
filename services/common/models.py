"""
Discovery Common Models and Data Structures
Compliant with TRD Section 6 (Data Model / Schema) and PRD Section 10
"""
from datetime import datetime, timezone
from enum import Enum
from typing import Any, Dict, List, Optional, Union
from pydantic import BaseModel, Field
import uuid


def utc_now() -> datetime:
    return datetime.now(timezone.utc)



class MediaType(str, Enum):
    TEXT = "text"
    IMAGE = "image"
    VIDEO = "video"
    AUDIO = "audio"


class MatchType(str, Enum):
    SEMANTIC = "semantic"
    KEYWORD = "keyword"


class ValidationStatus(str, Enum):
    APPROVED = "approved"
    REJECTED = "rejected"
    NEEDS_REVIEW = "needs_review"


class FactCheckVerdict(str, Enum):
    VERIFIED = "Verified"
    UNVERIFIED = "Unverified"
    DISPUTED = "Disputed"
    LIKELY_FALSE = "Likely False"


class UserRole(str, Enum):
    ADMIN = "Admin"
    LEAD = "Lead"
    ANALYST = "Analyst"
    FACT_VERIFIER = "FactVerifier"
    CLIENT = "Client"
    EXECUTIVE = "Executive"


class Entity(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    type: str = "Company"
    aliases: List[str] = Field(default_factory=list)
    seed_terms: List[str] = Field(default_factory=list)
    exclusion_terms: List[str] = Field(default_factory=list)
    disambiguation_context: str = ""
    embedding: Optional[List[float]] = None
    status: str = "active"
    owner_team_id: Optional[str] = "team-default"
    analyst_edited_fields: List[str] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=utc_now)


class Rule(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    entity_id: Optional[str] = None
    group_id: Optional[str] = None
    geo_filter: Dict[str, Any] = Field(default_factory=dict)
    domain_rules: Dict[str, Any] = Field(default_factory=dict)
    recency_window: str = "30d"  # ISO or interval string
    boolean_terms: Dict[str, Any] = Field(default_factory=dict)
    language_filter: Dict[str, Any] = Field(default_factory=dict)
    min_source_tier: int = 3
    priority: int = 1
    version: int = 1
    natural_language: Optional[str] = None
    created_at: datetime = Field(default_factory=utc_now)


class Article(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    canonical_url: str
    source: str
    source_tier: int = 2
    title: str
    author: Optional[str] = None
    published_at: datetime = Field(default_factory=utc_now)
    language: str = "en"
    media_type: MediaType = MediaType.TEXT
    extracted_text: str = ""
    content_hash: str = ""
    duplicate_group_id: Optional[str] = None
    created_at: datetime = Field(default_factory=utc_now)


class MediaAsset(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    article_id: str
    type: MediaType
    storage_ref: str
    ocr_text: Optional[str] = None
    transcript: Optional[str] = None
    caption: Optional[str] = None
    keyframes: List[str] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=utc_now)


class SocialPost(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    article_id: str
    platform: str  # Instagram, X, YouTube, Facebook, Telegram, Reddit
    handle: str
    follower_tier: str = "standard"
    engagement_metrics: Dict[str, Any] = Field(default_factory=dict)
    post_url: str
    created_at: datetime = Field(default_factory=utc_now)


class LanguageTag(BaseModel):
    article_id: str
    detected_language: str
    region: Optional[str] = None
    translated_text: str
    translation_confidence: float = 1.0
    created_at: datetime = Field(default_factory=utc_now)


class Match(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    article_id: str
    entity_id: str
    match_type: MatchType = MatchType.SEMANTIC
    confidence_score: float = 0.0
    matched_seed_terms: List[str] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=utc_now)


class Validation(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    match_id: str
    disambiguation_confidence: float = 0.0
    sentiment: str = "neutral"
    validated_status: ValidationStatus = ValidationStatus.NEEDS_REVIEW
    validated_by: Optional[str] = "system"
    reason: str = ""
    created_at: datetime = Field(default_factory=utc_now)


class FactCheckResult(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    article_id: str
    authenticity_score: float = 0.5
    verdict: FactCheckVerdict = FactCheckVerdict.UNVERIFIED
    evidence_sources: List[Dict[str, Any]] = Field(default_factory=list)
    manipulated_media_flag: bool = False
    stale_context_flag: bool = False
    needs_human_review: bool = False
    reviewed_by: Optional[str] = None
    human_override_reason: Optional[str] = None
    created_at: datetime = Field(default_factory=utc_now)


class SourceTier(BaseModel):
    domain_or_handle: str
    platform: str = "web"
    tier: int = 2  # 1 (High authority), 2 (Medium), 3 (Low/Unverified)
    credibility_score: float = 0.5
    analyst_locked: bool = False
    reasoning: Optional[str] = None
    updated_at: datetime = Field(default_factory=utc_now)


class WhatsAppQuery(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    phone_number_hash: str
    submitted_content_ref: str
    content_type: MediaType = MediaType.TEXT
    raw_payload: Optional[str] = None
    language: str = "en"
    article_id: Optional[str] = None
    verdict: Optional[FactCheckVerdict] = None
    replied_at: Optional[datetime] = None
    needs_human_review: bool = False
    status: str = "pending"  # pending, queued_review, replied
    reply_text: Optional[str] = None
    created_at: datetime = Field(default_factory=utc_now)


class Alert(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    entity_id: str
    article_id_or_cluster_id: str
    channel: str = "in-app"  # in-app, email, slack, teams, sms
    cadence: str = "realtime"  # realtime, daily, weekly
    delivered_at: Optional[datetime] = None
    escalation_flag: bool = False
    message: str = ""
    created_at: datetime = Field(default_factory=utc_now)


class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    email: str
    role: UserRole = UserRole.ANALYST
    account_ids: List[str] = Field(default_factory=list)
    notification_prefs: Dict[str, Any] = Field(default_factory=dict)
    created_at: datetime = Field(default_factory=datetime.utcnow)


class AuditLogEntry(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    actor_id: str
    action_type: str
    target_id: str
    before: Optional[Dict[str, Any]] = None
    after: Optional[Dict[str, Any]] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class Brief(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    entity_id: Optional[str] = None
    cluster_ids: List[str] = Field(default_factory=list)
    summary_sentences: List[Dict[str, Any]] = Field(default_factory=list)  # [{"text": "...", "article_id": "..."}]
    unattributable_count: int = 0
    authenticity_summary: Dict[str, int] = Field(default_factory=dict)
    created_at: datetime = Field(default_factory=datetime.utcnow)
