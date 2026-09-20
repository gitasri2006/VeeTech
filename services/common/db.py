"""
VeriScope Database and Vector Storage Repository
Compliant with TRD Section 6 (PostgreSQL 16 + pgvector) with live PostgreSQL persistence & in-memory cache
"""
import json
import logging
import math
import os
from typing import Any, Dict, List, Optional, Tuple
from datetime import datetime, timezone
import urllib.parse

from services.common.models import (
    Entity, Rule, Article, MediaAsset, SocialPost, LanguageTag,
    Match, Validation, FactCheckResult, SourceTier, WhatsAppQuery,
    Alert, User, AuditLogEntry, Brief, ValidationStatus, FactCheckVerdict, MediaType
)

logger = logging.getLogger("veriscope.db")


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
    """Live PostgreSQL repository with local in-memory fallback/cache."""

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
        
        self.user_history: Dict[str, List[Dict[str, Any]]] = {}
        self.pg_conn = None
        self._init_postgres()
        self._init_default_data()

    def _get_pg_connection(self):
        try:
            import psycopg2
            host = os.getenv("POSTGRES_HOST", "localhost")
            port = int(os.getenv("POSTGRES_PORT", "5432"))
            dbname = os.getenv("POSTGRES_DB", "discovery")
            user = os.getenv("POSTGRES_USER", "postgres")
            password = os.getenv("POSTGRES_PASSWORD", "Gayu@300116")
            conn = psycopg2.connect(
                host=host,
                port=port,
                dbname=dbname,
                user=user,
                password=password,
                connect_timeout=3
            )
            return conn
        except Exception as e:
            logger.warning("PostgreSQL connection error: %s", e)
            return None

    def _init_postgres(self):
        """Verify PostgreSQL connectivity on startup."""
        conn = self._get_pg_connection()
        if conn:
            try:
                cur = conn.cursor()
                cur.execute("SELECT COUNT(*) FROM articles;")
                count = cur.fetchone()[0]
                logger.info("Connected to live PostgreSQL 'discovery' database. Existing articles count: %d", count)
                # Create user search history table if it doesn't exist
                cur.execute("""
                    CREATE TABLE IF NOT EXISTS user_search_history (
                        id VARCHAR(64) PRIMARY KEY,
                        user_email VARCHAR(255) NOT NULL,
                        title VARCHAR(500) NOT NULL,
                        timestamp VARCHAR(64),
                        messages JSONB DEFAULT '[]'::jsonb,
                        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
                    );
                """)
                conn.commit()
                cur.close()
                conn.close()
            except Exception as e:
                logger.warning("PostgreSQL verification notice: %s", e)

    def _init_default_data(self):
        """Seed initial required users and known source tiers."""
        initial_users = [
            ("usr-admin", "System Administrator", "admin@gmail.com", "Admin"),
            ("usr-analyst", "Lead Fact Analyst", "analyst@gmail.com", "Analyst"),
            ("usr-exec", "Executive Leader", "executive@gmail.com", "Executive"),
            ("usr-client", "Enterprise Client", "client@gmail.com", "Client"),
        ]
        for u_id, name, email, role in initial_users:
            u = User(id=u_id, name=name, email=email, role=role)
            self.users[email] = u
            self.users[u_id] = u

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
        conn = self._get_pg_connection()
        if conn:
            try:
                cur = conn.cursor()
                cur.execute("""
                    INSERT INTO entities (id, name, type, aliases, seed_terms, exclusion_terms, disambiguation_context, status, owner_team_id)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (id) DO UPDATE SET
                        name = EXCLUDED.name,
                        aliases = EXCLUDED.aliases,
                        seed_terms = EXCLUDED.seed_terms,
                        exclusion_terms = EXCLUDED.exclusion_terms,
                        disambiguation_context = EXCLUDED.disambiguation_context;
                """, (
                    entity.id,
                    entity.name,
                    entity.type,
                    json.dumps(entity.aliases),
                    json.dumps(entity.seed_terms),
                    json.dumps(entity.exclusion_terms),
                    entity.disambiguation_context,
                    entity.status,
                    entity.owner_team_id
                ))
                conn.commit()
                cur.close()
                conn.close()
            except Exception as e:
                logger.debug("PostgreSQL save_entity notice: %s", e)
        return entity

    def get_entity(self, entity_id: str) -> Optional[Entity]:
        if entity_id in self.entities:
            return self.entities[entity_id]
        conn = self._get_pg_connection()
        if conn:
            try:
                cur = conn.cursor()
                cur.execute("SELECT id, name, type, aliases, seed_terms, exclusion_terms, disambiguation_context, status, owner_team_id FROM entities WHERE id = %s;", (entity_id,))
                row = cur.fetchone()
                cur.close()
                conn.close()
                if row:
                    ent = Entity(
                        id=row[0],
                        name=row[1],
                        type=row[2],
                        aliases=row[3] if isinstance(row[3], list) else json.loads(row[3] or "[]"),
                        seed_terms=row[4] if isinstance(row[4], list) else json.loads(row[4] or "[]"),
                        exclusion_terms=row[5] if isinstance(row[5], list) else json.loads(row[5] or "[]"),
                        disambiguation_context=row[6] or "",
                        status=row[7] or "active",
                        owner_team_id=row[8] or "team-default"
                    )
                    self.entities[ent.id] = ent
                    return ent
            except Exception as e:
                logger.debug("PostgreSQL get_entity notice: %s", e)
        return None

    def list_entities(self) -> List[Entity]:
        conn = self._get_pg_connection()
        if conn:
            try:
                cur = conn.cursor()
                cur.execute("SELECT id, name, type, aliases, seed_terms, exclusion_terms, disambiguation_context, status, owner_team_id FROM entities ORDER BY name;")
                rows = cur.fetchall()
                cur.close()
                conn.close()
                results = []
                for row in rows:
                    ent = Entity(
                        id=row[0],
                        name=row[1],
                        type=row[2],
                        aliases=row[3] if isinstance(row[3], list) else json.loads(row[3] or "[]"),
                        seed_terms=row[4] if isinstance(row[4], list) else json.loads(row[4] or "[]"),
                        exclusion_terms=row[5] if isinstance(row[5], list) else json.loads(row[5] or "[]"),
                        disambiguation_context=row[6] or "",
                        status=row[7] or "active",
                        owner_team_id=row[8] or "team-default"
                    )
                    self.entities[ent.id] = ent
                    results.append(ent)
                if results:
                    return results
            except Exception as e:
                logger.debug("PostgreSQL list_entities notice: %s", e)
        return list(self.entities.values())

    # Rule methods
    def save_rule(self, rule: Rule) -> Rule:
        self.rules[rule.id] = rule
        conn = self._get_pg_connection()
        if conn:
            try:
                cur = conn.cursor()
                cur.execute("""
                    INSERT INTO rules (id, entity_id, group_id, geo_filter, domain_rules, recency_window, boolean_terms, language_filter, min_source_tier, priority, version, natural_language)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (id) DO UPDATE SET
                        geo_filter = EXCLUDED.geo_filter,
                        domain_rules = EXCLUDED.domain_rules,
                        boolean_terms = EXCLUDED.boolean_terms,
                        natural_language = EXCLUDED.natural_language;
                """, (
                    rule.id,
                    rule.entity_id,
                    rule.group_id,
                    json.dumps(rule.geo_filter),
                    json.dumps(rule.domain_rules),
                    rule.recency_window,
                    json.dumps(rule.boolean_terms),
                    json.dumps(rule.language_filter),
                    rule.min_source_tier,
                    rule.priority,
                    rule.version,
                    rule.natural_language
                ))
                conn.commit()
                cur.close()
                conn.close()
            except Exception as e:
                logger.debug("PostgreSQL save_rule notice: %s", e)
        return rule

    def get_rule_by_entity(self, entity_id: str) -> Optional[Rule]:
        for r in self.rules.values():
            if r.entity_id == entity_id:
                return r
        conn = self._get_pg_connection()
        if conn:
            try:
                cur = conn.cursor()
                cur.execute("SELECT id, entity_id, group_id, geo_filter, domain_rules, recency_window, boolean_terms, language_filter, min_source_tier, priority, version, natural_language FROM rules WHERE entity_id = %s;", (entity_id,))
                row = cur.fetchone()
                cur.close()
                conn.close()
                if row:
                    rule = Rule(
                        id=row[0],
                        entity_id=row[1],
                        group_id=row[2],
                        geo_filter=row[3] if isinstance(row[3], dict) else json.loads(row[3] or "{}"),
                        domain_rules=row[4] if isinstance(row[4], dict) else json.loads(row[4] or "{}"),
                        recency_window=row[5] or "30d",
                        boolean_terms=row[6] if isinstance(row[6], dict) else json.loads(row[6] or "{}"),
                        language_filter=row[7] if isinstance(row[7], dict) else json.loads(row[7] or "{}"),
                        min_source_tier=row[8] or 3,
                        priority=row[9] or 1,
                        version=row[10] or 1,
                        natural_language=row[11]
                    )
                    self.rules[rule.id] = rule
                    return rule
            except Exception as e:
                logger.debug("PostgreSQL get_rule_by_entity notice: %s", e)
        return None

    def list_rules(self) -> List[Rule]:
        return list(self.rules.values())

    # Article methods
    def save_article(self, article: Article) -> Article:
        # Check if canonical_url exists in memory
        existing_id = None
        for a_id, a in self.articles.items():
            if a.canonical_url == article.canonical_url:
                existing_id = a_id
                break
        if existing_id:
            article.id = existing_id
        self.articles[article.id] = article

        conn = self._get_pg_connection()
        if conn:
            try:
                cur = conn.cursor()
                m_type = article.media_type.value if hasattr(article.media_type, "value") else str(article.media_type)
                cur.execute("""
                    INSERT INTO articles (id, canonical_url, source, source_tier, title, author, published_at, language, media_type, extracted_text, content_hash)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (canonical_url) DO UPDATE SET
                        title = EXCLUDED.title,
                        extracted_text = EXCLUDED.extracted_text,
                        source_tier = EXCLUDED.source_tier,
                        published_at = EXCLUDED.published_at
                    RETURNING id;
                """, (
                    article.id,
                    article.canonical_url,
                    article.source,
                    article.source_tier,
                    article.title,
                    article.author or "",
                    article.published_at or datetime.now(timezone.utc),
                    article.language or "en",
                    m_type,
                    article.extracted_text or "",
                    article.content_hash or ""
                ))
                res = cur.fetchone()
                if res and res[0]:
                    article.id = res[0]
                    self.articles[article.id] = article
                conn.commit()
                cur.close()
                conn.close()
            except Exception as e:
                logger.debug("PostgreSQL save_article notice: %s", e)
        return article

    def get_article_by_url(self, url: str) -> Optional[Article]:
        for art in self.articles.values():
            if art.canonical_url == url:
                return art
        conn = self._get_pg_connection()
        if conn:
            try:
                cur = conn.cursor()
                cur.execute("SELECT id, canonical_url, source, source_tier, title, author, published_at, language, media_type, extracted_text, content_hash FROM articles WHERE canonical_url = %s;", (url,))
                row = cur.fetchone()
                cur.close()
                conn.close()
                if row:
                    art = Article(
                        id=row[0],
                        canonical_url=row[1],
                        source=row[2],
                        source_tier=row[3],
                        title=row[4],
                        author=row[5],
                        published_at=row[6],
                        language=row[7],
                        media_type=MediaType(row[8]) if row[8] in [m.value for m in MediaType] else MediaType.TEXT,
                        extracted_text=row[9],
                        content_hash=row[10]
                    )
                    self.articles[art.id] = art
                    return art
            except Exception as e:
                logger.debug("PostgreSQL get_article_by_url notice: %s", e)
        return None

    def get_article(self, article_id: str) -> Optional[Article]:
        if article_id in self.articles:
            return self.articles[article_id]
        conn = self._get_pg_connection()
        if conn:
            try:
                cur = conn.cursor()
                cur.execute("SELECT id, canonical_url, source, source_tier, title, author, published_at, language, media_type, extracted_text, content_hash FROM articles WHERE id = %s;", (article_id,))
                row = cur.fetchone()
                cur.close()
                conn.close()
                if row:
                    art = Article(
                        id=row[0],
                        canonical_url=row[1],
                        source=row[2],
                        source_tier=row[3],
                        title=row[4],
                        author=row[5],
                        published_at=row[6],
                        language=row[7],
                        media_type=MediaType(row[8]) if row[8] in [m.value for m in MediaType] else MediaType.TEXT,
                        extracted_text=row[9],
                        content_hash=row[10]
                    )
                    self.articles[art.id] = art
                    return art
            except Exception as e:
                logger.debug("PostgreSQL get_article notice: %s", e)
        return None

    def get_article_by_hash(self, content_hash: str) -> Optional[Article]:
        for art in self.articles.values():
            if art.content_hash == content_hash:
                return art
        conn = self._get_pg_connection()
        if conn:
            try:
                cur = conn.cursor()
                cur.execute("SELECT id, canonical_url, source, source_tier, title, author, published_at, language, media_type, extracted_text, content_hash FROM articles WHERE content_hash = %s;", (content_hash,))
                row = cur.fetchone()
                cur.close()
                conn.close()
                if row:
                    art = Article(
                        id=row[0],
                        canonical_url=row[1],
                        source=row[2],
                        source_tier=row[3],
                        title=row[4],
                        author=row[5],
                        published_at=row[6],
                        language=row[7],
                        media_type=MediaType(row[8]) if row[8] in [m.value for m in MediaType] else MediaType.TEXT,
                        extracted_text=row[9],
                        content_hash=row[10]
                    )
                    self.articles[art.id] = art
                    return art
            except Exception as e:
                logger.debug("PostgreSQL get_article_by_hash notice: %s", e)
        return None

    def list_articles(self) -> List[Article]:
        conn = self._get_pg_connection()
        if conn:
            try:
                cur = conn.cursor()
                cur.execute("SELECT id, canonical_url, source, source_tier, title, author, published_at, language, media_type, extracted_text, content_hash FROM articles ORDER BY published_at DESC LIMIT 200;")
                rows = cur.fetchall()
                cur.close()
                conn.close()
                results = []
                for row in rows:
                    art = Article(
                        id=row[0],
                        canonical_url=row[1],
                        source=row[2],
                        source_tier=row[3],
                        title=row[4],
                        author=row[5],
                        published_at=row[6],
                        language=row[7],
                        media_type=MediaType(row[8]) if row[8] in [m.value for m in MediaType] else MediaType.TEXT,
                        extracted_text=row[9],
                        content_hash=row[10]
                    )
                    self.articles[art.id] = art
                    results.append(art)
                if results:
                    return results
            except Exception as e:
                logger.debug("PostgreSQL list_articles notice: %s", e)
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

    # User Search History Methods (Isolated per account)
    def get_user_history(self, user_email: str) -> List[Dict[str, Any]]:
        conn = self._get_pg_connection()
        if conn:
            try:
                cur = conn.cursor()
                cur.execute("""
                    SELECT id, title, timestamp, messages FROM user_search_history
                    WHERE user_email = %s
                    ORDER BY created_at DESC;
                """, (user_email,))
                rows = cur.fetchall()
                cur.close()
                conn.close()
                if rows:
                    return [{"id": r[0], "title": r[1], "timestamp": r[2], "messages": r[3] or []} for r in rows]
            except Exception as e:
                logger.warning("Error reading user_search_history from PostgreSQL: %s", e)
        return self.user_history.get(user_email, [])

    def save_user_history_item(self, user_email: str, item: Dict[str, Any]) -> None:
        sess_id = item.get("id", str(uuid.uuid4()))
        title = item.get("title", "New Inquiry")
        timestamp = item.get("timestamp", "Today")
        messages = item.get("messages", [])

        # In-memory update
        if user_email not in self.user_history:
            self.user_history[user_email] = []
        filtered = [x for x in self.user_history[user_email] if x.get("id") != sess_id]
        self.user_history[user_email] = [{"id": sess_id, "title": title, "timestamp": timestamp, "messages": messages}] + filtered

        # PostgreSQL update
        conn = self._get_pg_connection()
        if conn:
            try:
                cur = conn.cursor()
                cur.execute("""
                    INSERT INTO user_search_history (id, user_email, title, timestamp, messages, created_at)
                    VALUES (%s, %s, %s, %s, %s, CURRENT_TIMESTAMP)
                    ON CONFLICT (id) DO UPDATE SET
                        title = EXCLUDED.title,
                        timestamp = EXCLUDED.timestamp,
                        messages = EXCLUDED.messages,
                        created_at = CURRENT_TIMESTAMP;
                """, (sess_id, user_email, title, timestamp, json.dumps(messages)))
                conn.commit()
                cur.close()
                conn.close()
            except Exception as e:
                logger.warning("Error saving user_search_history to PostgreSQL: %s", e)

    def delete_user_history_item(self, user_email: str, session_id: str) -> None:
        if user_email in self.user_history:
            self.user_history[user_email] = [x for x in self.user_history[user_email] if x.get("id") != session_id]
        conn = self._get_pg_connection()
        if conn:
            try:
                cur = conn.cursor()
                cur.execute("DELETE FROM user_search_history WHERE user_email = %s AND id = %s;", (user_email, session_id))
                conn.commit()
                cur.close()
                conn.close()
            except Exception as e:
                logger.warning("Error deleting user_search_history from PostgreSQL: %s", e)

    def clear_user_history(self, user_email: str) -> None:
        self.user_history[user_email] = []
        conn = self._get_pg_connection()
        if conn:
            try:
                cur = conn.cursor()
                cur.execute("DELETE FROM user_search_history WHERE user_email = %s;", (user_email,))
                conn.commit()
                cur.close()
                conn.close()
            except Exception as e:
                logger.warning("Error clearing user_search_history from PostgreSQL: %s", e)


# Global repository instance
db = DatabaseRepository()

