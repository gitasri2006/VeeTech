"""
VeriScope Database and Vector Storage Repository
Compliant with TRD Section 6 (PostgreSQL 16 + pgvector) with in-memory / local storage driver for testing
"""
import math
from typing import Any, Dict, List, Optional, Tuple
from services.common.models import (
    Entity, Rule, Article, MediaAsset, SocialPost, LanguageTag,
    Match, Validation, FactCheckResult, SourceTier, WhatsAppQuery,
    Alert, User, AuditLogEntry, Brief, ValidationStatus, FactCheckVerdict
)


def cosine_similarity(vec_a: List[float], vec_b: List[float]) -> float:
    """Compute cosine similarity between two float vectors."""
    if not vec_a or not vec_b or len(vec_a) != len(vec_b):
        return 0.0
    dot_product = sum(a * b for a, b in zip(vec_a, vec_b))
    norm_a = math.sqrt(sum(a * a for a in vec_a))
    norm_b = math.sqrt(sum(b * b for b in vec_b))
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return dot_product / (norm_a * norm_b)


class DatabaseRepository:
    """In-memory & persistence-ready repository implementing PostgreSQL + pgvector semantics."""

    def __init__(self):
        self.entities: Dict[str, Entity] = {}
        self.rules: Dict[str, Rule] = {}
        self.articles: Dict[str, Article] = {}
        self.media_assets: Dict[str, MediaAsset] = {}
        self.social_posts: Dict[str, SocialPost] = {}
        self.language_tags: Dict[str, LanguageTag] = {}
        self.matches: Dict[str, Match] = {}
        self.validations: Dict[str, Validation] = {}
        self.fact_checks: Dict[str, FactCheckResult] = {}
        self.source_tiers: Dict[str, SourceTier] = {}
        self.whatsapp_queries: Dict[str, WhatsAppQuery] = {}
        self.whatsapp_consents: set = set()
        self.alerts: Dict[str, Alert] = {}
        self.users: Dict[str, User] = {}
        self.audit_logs: List[AuditLogEntry] = []
        self.briefs: Dict[str, Brief] = {}
        self.article_embeddings: Dict[str, List[float]] = {}
        self._init_default_data()

    def _init_default_data(self):
        """Seed initial users and known source tiers."""
        # Default Admin user
        admin = User(
            id="usr-admin-01",
            name="System Admin",
            email="admin@veriscope.ai",
            role="Admin"
        )
        self.users[admin.id] = admin

        # Default Source Tiers
        default_tiers = [
            ("reuters.com", "web", 1, 0.95),
            ("apnews.com", "web", 1, 0.95),
            ("bbc.com", "web", 1, 0.92),
            ("thehindu.com", "web", 1, 0.90),
            ("indianexpress.com", "web", 1, 0.90),
            ("ndtv.com", "web", 2, 0.78),
            ("timesofindia.indiatimes.com", "web", 2, 0.75),
            ("altnews.in", "web", 1, 0.95),
            ("boomlive.in", "web", 1, 0.95),
            ("pib.gov.in", "web", 1, 0.98),
            ("unverified-blog.xyz", "web", 3, 0.30),
            ("daily-clickbait.net", "web", 3, 0.20),
        ]
        for domain, platform, tier, score in default_tiers:
            self.source_tiers[domain] = SourceTier(
                domain_or_handle=domain,
                platform=platform,
                tier=tier,
                credibility_score=score,
                analyst_locked=True
            )

    # Entity methods
    def save_entity(self, entity: Entity) -> Entity:
        self.entities[entity.id] = entity
        return entity

    def get_entity(self, entity_id: str) -> Optional[Entity]:
        return self.entities.get(entity_id)

    def list_entities(self) -> List[Entity]:
        return list(self.entities.values())

    # Rule methods
    def save_rule(self, rule: Rule) -> Rule:
        self.rules[rule.id] = rule
        return rule

    def get_rule_by_entity(self, entity_id: str) -> Optional[Rule]:
        for r in self.rules.values():
            if r.entity_id == entity_id:
                return r
        return None

    # Article methods
    def save_article(self, article: Article) -> Article:
        self.articles[article.id] = article
        return article

    def get_article(self, article_id: str) -> Optional[Article]:
        return self.articles.get(article_id)

    def get_article_by_hash(self, content_hash: str) -> Optional[Article]:
        for art in self.articles.values():
            if art.content_hash == content_hash:
                return art
        return None

    def list_articles(self) -> List[Article]:
        return list(self.articles.values())

    # MediaAsset & SocialPost
    def save_media_asset(self, asset: MediaAsset) -> MediaAsset:
        self.media_assets[asset.id] = asset
        return asset

    def get_media_by_article(self, article_id: str) -> List[MediaAsset]:
        return [m for m in self.media_assets.values() if m.article_id == article_id]

    def save_social_post(self, post: SocialPost) -> SocialPost:
        self.social_posts[post.id] = post
        return post

    def get_social_post_by_article(self, article_id: str) -> Optional[SocialPost]:
        for sp in self.social_posts.values():
            if sp.article_id == article_id:
                return sp
        return None

    # LanguageTag
    def save_language_tag(self, tag: LanguageTag) -> LanguageTag:
        self.language_tags[tag.article_id] = tag
        return tag

    def get_language_tag(self, article_id: str) -> Optional[LanguageTag]:
        return self.language_tags.get(article_id)

    # Vector search simulation (pgvector equivalent)
    def save_article_embedding(self, article_id: str, embedding: List[float]):
        self.article_embeddings[article_id] = embedding

    def search_similar_articles(self, query_embedding: List[float], min_threshold: float = 0.35) -> List[Tuple[Article, float]]:
        results = []
        for art_id, emb in self.article_embeddings.items():
            sim = cosine_similarity(query_embedding, emb)
            if sim >= min_threshold and art_id in self.articles:
                results.append((self.articles[art_id], sim))
        results.sort(key=lambda x: x[1], reverse=True)
        return results

    # Match & Validation
    def save_match(self, match: Match) -> Match:
        self.matches[match.id] = match
        return match

    def list_matches(self, entity_id: Optional[str] = None) -> List[Match]:
        if entity_id:
            return [m for m in self.matches.values() if m.entity_id == entity_id]
        return list(self.matches.values())

    def save_validation(self, validation: Validation) -> Validation:
        self.validations[validation.id] = validation
        return validation

    def get_validation_by_match(self, match_id: str) -> Optional[Validation]:
        for v in self.validations.values():
            if v.match_id == match_id:
                return v
        return None

    # Fact Check
    def save_fact_check(self, fc: FactCheckResult) -> FactCheckResult:
        self.fact_checks[fc.article_id] = fc
        return fc

    def get_fact_check(self, article_id: str) -> Optional[FactCheckResult]:
        return self.fact_checks.get(article_id)

    def list_fact_checks_for_review(self) -> List[FactCheckResult]:
        return [fc for fc in self.fact_checks.values() if fc.needs_human_review]

    # Source Tier
    def save_source_tier(self, st: SourceTier) -> SourceTier:
        self.source_tiers[st.domain_or_handle] = st
        return st

    def get_source_tier(self, domain_or_handle: str) -> Optional[SourceTier]:
        return self.source_tiers.get(domain_or_handle)

    # WhatsApp Query & Consent
    def has_whatsapp_consent(self, phone_hash: str) -> bool:
        return phone_hash in self.whatsapp_consents

    def grant_whatsapp_consent(self, phone_hash: str):
        self.whatsapp_consents.add(phone_hash)

    def save_whatsapp_query(self, query: WhatsAppQuery) -> WhatsAppQuery:
        self.whatsapp_queries[query.id] = query
        return query

    def get_whatsapp_query(self, query_id: str) -> Optional[WhatsAppQuery]:
        return self.whatsapp_queries.get(query_id)

    def list_whatsapp_queries(self) -> List[WhatsAppQuery]:
        return list(self.whatsapp_queries.values())

    def list_pending_whatsapp_reviews(self) -> List[WhatsAppQuery]:
        return [q for q in self.whatsapp_queries.values() if q.needs_human_review and q.status == "queued_review"]

    # Audit Log
    def log_audit(self, entry: AuditLogEntry):
        self.audit_logs.append(entry)

    def list_audit_logs(self) -> List[AuditLogEntry]:
        return sorted(self.audit_logs, key=lambda x: x.timestamp, reverse=True)

    # Alerts & Briefs
    def save_alert(self, alert: Alert) -> Alert:
        self.alerts[alert.id] = alert
        return alert

    def save_brief(self, brief: Brief) -> Brief:
        self.briefs[brief.id] = brief
        return brief

    def get_brief(self, brief_id: str) -> Optional[Brief]:
        return self.briefs.get(brief_id)

    def list_briefs(self, entity_id: Optional[str] = None) -> List[Brief]:
        if entity_id:
            return [b for b in self.briefs.values() if b.entity_id == entity_id]
        return list(self.briefs.values())


# Global repository instance
db = DatabaseRepository()
