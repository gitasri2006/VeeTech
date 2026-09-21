-- =====================================================================
-- Discovery / Discovery PostgreSQL 16 + pgvector Database Schema
-- Compliant with TRD Section 6 (Data Model / Schema)
-- =====================================================================

-- 1. Create Enums if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'media_type_enum') THEN
        CREATE TYPE media_type_enum AS ENUM ('text', 'image', 'video', 'audio');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'match_type_enum') THEN
        CREATE TYPE match_type_enum AS ENUM ('semantic', 'keyword');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'validation_status_enum') THEN
        CREATE TYPE validation_status_enum AS ENUM ('approved', 'rejected', 'needs_review');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'fact_check_verdict_enum') THEN
        CREATE TYPE fact_check_verdict_enum AS ENUM ('Verified', 'Unverified', 'Disputed', 'Likely False');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role_enum') THEN
        CREATE TYPE user_role_enum AS ENUM ('Admin', 'Lead', 'Analyst', 'FactVerifier', 'Client', 'Executive');
    END IF;
END $$;

-- 2. Entities Table
CREATE TABLE IF NOT EXISTS entities (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(64) DEFAULT 'Company',
    aliases JSONB DEFAULT '[]'::jsonb,
    seed_terms JSONB DEFAULT '[]'::jsonb,
    exclusion_terms JSONB DEFAULT '[]'::jsonb,
    disambiguation_context TEXT DEFAULT '',
    embedding FLOAT8[],
    status VARCHAR(32) DEFAULT 'active',
    owner_team_id VARCHAR(64) DEFAULT 'team-default',
    analyst_edited_fields JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 3. Rules Table
CREATE TABLE IF NOT EXISTS rules (
    id VARCHAR(64) PRIMARY KEY,
    entity_id VARCHAR(64) REFERENCES entities(id) ON DELETE SET NULL,
    group_id VARCHAR(64),
    geo_filter JSONB DEFAULT '{}'::jsonb,
    domain_rules JSONB DEFAULT '{}'::jsonb,
    recency_window VARCHAR(32) DEFAULT '30d',
    boolean_terms JSONB DEFAULT '{}'::jsonb,
    language_filter JSONB DEFAULT '{}'::jsonb,
    min_source_tier INT DEFAULT 3,
    priority INT DEFAULT 1,
    version INT DEFAULT 1,
    natural_language TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 4. Articles Table
CREATE TABLE IF NOT EXISTS articles (
    id VARCHAR(64) PRIMARY KEY,
    canonical_url TEXT NOT NULL,
    source VARCHAR(255) NOT NULL,
    source_tier INT DEFAULT 2,
    title TEXT NOT NULL,
    author VARCHAR(255),
    published_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    language VARCHAR(16) DEFAULT 'en',
    media_type media_type_enum DEFAULT 'text',
    extracted_text TEXT DEFAULT '',
    content_hash VARCHAR(64),
    duplicate_group_id VARCHAR(64),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 5. Media Assets Table
CREATE TABLE IF NOT EXISTS media_assets (
    id VARCHAR(64) PRIMARY KEY,
    article_id VARCHAR(64) REFERENCES articles(id) ON DELETE CASCADE,
    type media_type_enum NOT NULL,
    storage_ref TEXT,
    ocr_text TEXT,
    transcript TEXT,
    caption TEXT,
    keyframes JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 6. Social Posts Table
CREATE TABLE IF NOT EXISTS social_posts (
    id VARCHAR(64) PRIMARY KEY,
    article_id VARCHAR(64) REFERENCES articles(id) ON DELETE CASCADE,
    platform VARCHAR(64) NOT NULL,
    handle VARCHAR(255) NOT NULL,
    follower_tier INT DEFAULT 2,
    engagement_metrics JSONB DEFAULT '{}'::jsonb,
    post_url TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 7. Language Tags Table
CREATE TABLE IF NOT EXISTS language_tags (
    id VARCHAR(64) PRIMARY KEY,
    article_id VARCHAR(64) REFERENCES articles(id) ON DELETE CASCADE,
    detected_language VARCHAR(32) NOT NULL,
    region VARCHAR(64) DEFAULT 'Global',
    translated_text TEXT,
    translation_confidence FLOAT8 DEFAULT 1.0,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 8. Matches Table
CREATE TABLE IF NOT EXISTS matches (
    id VARCHAR(64) PRIMARY KEY,
    article_id VARCHAR(64) REFERENCES articles(id) ON DELETE CASCADE,
    entity_id VARCHAR(64) REFERENCES entities(id) ON DELETE CASCADE,
    match_type match_type_enum DEFAULT 'semantic',
    confidence_score FLOAT8 DEFAULT 0.0,
    matched_seed_terms JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 9. Validations Table
CREATE TABLE IF NOT EXISTS validations (
    id VARCHAR(64) PRIMARY KEY,
    match_id VARCHAR(64) REFERENCES matches(id) ON DELETE CASCADE,
    disambiguation_confidence FLOAT8 DEFAULT 0.0,
    sentiment VARCHAR(32) DEFAULT 'neutral',
    validated_status validation_status_enum DEFAULT 'approved',
    validated_by VARCHAR(64) DEFAULT 'system_adk',
    reason TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 10. Fact Check Results Table
CREATE TABLE IF NOT EXISTS fact_checks (
    id VARCHAR(64) PRIMARY KEY,
    article_id VARCHAR(64) REFERENCES articles(id) ON DELETE CASCADE,
    authenticity_score FLOAT8 DEFAULT 0.0,
    verdict fact_check_verdict_enum DEFAULT 'Unverified',
    evidence_sources JSONB DEFAULT '[]'::jsonb,
    manipulated_media_flag BOOLEAN DEFAULT FALSE,
    needs_human_review BOOLEAN DEFAULT FALSE,
    reviewed_by VARCHAR(64),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 11. Source Tiers Table
CREATE TABLE IF NOT EXISTS source_tiers (
    domain_or_handle VARCHAR(255) PRIMARY KEY,
    platform VARCHAR(64) DEFAULT 'web',
    tier INT DEFAULT 2,
    credibility_score FLOAT8 DEFAULT 0.5,
    analyst_locked BOOLEAN DEFAULT FALSE,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 12. WhatsApp Queries Table
CREATE TABLE IF NOT EXISTS whatsapp_queries (
    id VARCHAR(64) PRIMARY KEY,
    phone_number_hash VARCHAR(64) NOT NULL,
    submitted_content_ref TEXT NOT NULL,
    language VARCHAR(16) DEFAULT 'en',
    verdict VARCHAR(64),
    response_text TEXT,
    replied_at TIMESTAMPTZ,
    needs_human_review BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 13. Alerts Table
CREATE TABLE IF NOT EXISTS alerts (
    id VARCHAR(64) PRIMARY KEY,
    entity_id VARCHAR(64) REFERENCES entities(id) ON DELETE CASCADE,
    article_id_or_cluster_id VARCHAR(64),
    channel VARCHAR(32) DEFAULT 'dashboard',
    cadence VARCHAR(32) DEFAULT 'immediate',
    delivered_at TIMESTAMPTZ,
    escalation_flag BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 14. Users Table
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE,
    role user_role_enum DEFAULT 'Analyst',
    account_ids JSONB DEFAULT '["default"]'::jsonb,
    notification_prefs JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 15. Audit Logs Table
CREATE TABLE IF NOT EXISTS audit_logs (
    id VARCHAR(64) PRIMARY KEY,
    actor_id VARCHAR(64) NOT NULL,
    action_type VARCHAR(64) NOT NULL,
    target_id VARCHAR(64) NOT NULL,
    before JSONB DEFAULT '{}'::jsonb,
    after JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 16. Briefs Table
CREATE TABLE IF NOT EXISTS briefs (
    id VARCHAR(64) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    executive_summary TEXT,
    cluster_ids JSONB DEFAULT '[]'::jsonb,
    article_ids JSONB DEFAULT '[]'::jsonb,
    grounded_citations JSONB DEFAULT '[]'::jsonb,
    status VARCHAR(32) DEFAULT 'draft',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 17. Seed initial admin and sample source tier data
INSERT INTO users (id, name, email, role)
VALUES ('usr-admin-01', 'System Admin', 'admin@discovery.ai', 'Admin')
ON CONFLICT (id) DO NOTHING;

INSERT INTO source_tiers (domain_or_handle, platform, tier, credibility_score, analyst_locked)
VALUES 
    ('reuters.com', 'web', 1, 0.98, TRUE),
    ('bbc.com', 'web', 1, 0.96, TRUE),
    ('apnews.com', 'web', 1, 0.99, TRUE),
    ('bloomberg.com', 'web', 1, 0.95, TRUE),
    ('techcrunch.com', 'web', 2, 0.85, FALSE),
    ('hacker-news', 'web', 2, 0.80, FALSE)
ON CONFLICT (domain_or_handle) DO NOTHING;
