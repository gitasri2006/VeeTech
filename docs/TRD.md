% Technical Requirements Document — Version 1.0 (Build-Ready)
% Discovery — Intelligent News Discovery & Media Authentication Platform

# 1. Purpose & Scope

This document is the engineering counterpart to the Product Requirements Document (PRD v3.0). It fixes every technology, schema, and API decision needed to build the system without ambiguity. An implementing agent (human or AI) should treat every decision in this document as final. If a decision here appears to conflict with the PRD, or a required decision is missing, stop and raise it as an explicit question rather than guessing or silently choosing an alternative.

# 2. Guiding Technical Principles

1. **No ambiguous decisions.** Every component below names a specific technology, not a category. Substitutions are not permitted without flagging the change.
2. **Agent isolation.** Each of the 10 agents from the PRD is a separately deployable service with its own defined input/output contract. No agent reaches into another agent's database tables directly — all cross-agent communication goes through the message bus or a defined API call.
3. **Multilingual-first, not English-first-with-translation-bolted-on.** Every text field in the data model carries a language tag; the pivot-language translation is a derived field, never the only stored representation.
4. **Cost-aware LLM usage.** Cheap deterministic or embedding-based filters (Filtering Agent) always run before an LLM call (Contextual Validation, Fact-Checking). Never send every raw candidate straight to an LLM.
5. **Grounded generation only.** Any agent that generates natural-language output (Brief & Clustering, the WhatsApp reply text) must construct that output with explicit citations back to source sentences it was given — never freeform generation from parametric memory alone.
6. **Official APIs only for social platforms.** No agent may scrape a platform whose terms of service prohibit it. If official API access to a platform is not yet approved, that platform is simply not live yet — there is no scraping fallback for platforms that disallow it.

# 3. Technology Stack

| Layer | Technology | Why |
|---|---|---|
| Frontend | React 18 + TypeScript, TailwindCSS, shadcn/ui, Recharts | Fast to build, matches Antigravity's default web-app scaffolding patterns |
| Backend services | Python 3.12, FastAPI, one service per agent | Async-friendly, strong ML/NLP ecosystem, simple to containerize per agent |
| Agent framework | Google Agent Development Kit (ADK) | Native integration with Antigravity and the Gemini model family; gives each of the 10 agents a standard tool-calling/reasoning loop instead of bespoke logic per agent |
| Orchestration / message bus | Redis Streams (competition scale) — document the upgrade path to Kafka for production scale | Simple to run locally and in a small cluster; low operational overhead |
| Primary database | PostgreSQL 16 with the pgvector extension | Relational integrity for Entities/Rules/Users/Audit logs, plus native vector similarity search in the same database — avoids running a separate vector DB for this scale |
| Full-text/archive search | Elasticsearch (or OpenSearch) | Fast full-text and faceted search over the historical article archive |
| Object storage | Google Cloud Storage (or S3-compatible equivalent) | Stores media assets (images, video, audio) referenced by MediaAsset rows |
| Cache | Redis | Session cache, rate-limit counters (WhatsApp bot), dedupe hash lookups |
| LLM (reasoning, disambiguation, fact-check reasoning, NL rule parsing, brief generation) | Google Gemini 2.5/3 API | Native multimodal input (text+image+video in one call), aligns with the ADK/Antigravity ecosystem |
| Multilingual embeddings | Multilingual-E5-large or Google's multilingual text-embedding model | Cross-lingual semantic similarity for the Filtering Agent |
| Translation | Google Cloud Translation API (broad language coverage) with IndicTrans2 self-hosted as a higher-quality fallback for Indian languages | Balances coverage breadth with translation quality for low-resource Indian languages |
| Speech-to-text (ASR) | Google Cloud Speech-to-Text (broad coverage) with OpenAI Whisper large-v3 self-hosted as a fallback/offline option | Covers both major and long-tail languages |
| OCR | Google Cloud Vision OCR (fallback: Tesseract, self-hosted) | High accuracy across scripts including Indic scripts |
| Video processing | FFmpeg for frame/audio extraction; Gemini multimodal for frame captioning and video understanding | Gemini accepts video directly, minimizing custom vision-model glue code |
| Reverse image/video search | Google Vision Web Detection API | Established, high-coverage reverse-image lookup for authenticity checks |
| Fact-check data sources | Google Fact Check Tools API, plus scheduled ingestion of PIB Fact Check / Alt News / BOOM Live public feeds | Combines a broad international database with India-specific regional coverage |
| Social platform APIs | Instagram Graph API (Business), X API v2, YouTube Data API v3, Facebook Graph API, Telegram Bot API (public channels), Reddit API (PRAW) | Official, ToS-compliant access per platform |
| Public messaging channel | WhatsApp Business Cloud API (Meta) | Required for the Public Verification Bot Agent |
| Web/news search | GDELT Project (free, global), NewsAPI.org, Google Custom Search JSON API | Combines a free global firehose (GDELT) with targeted news search |
| Auth | Firebase Authentication (or Auth0), JWT sessions, SSO via Google Workspace | Fast to integrate, supports MFA out of the box |
| Infra / containers | Docker, Kubernetes (GKE) | Matches the Google-centric stack and Antigravity's own GCP/Firebase integration via MCP |
| IaC | Terraform | Reproducible environment provisioning |
| CI/CD | GitHub Actions | Standard, well-documented, integrates with Antigravity repos |
| Monitoring / observability | Prometheus + Grafana, Sentry for error tracking | Standard open-source observability stack |

# 4. System Architecture

Each stage below is a separate FastAPI service built on the Google ADK, communicating via Redis Streams topics named after the agent that publishes to them (e.g. `extraction.completed`, `filtering.passed`, `factcheck.verdict`). There are two entry points feeding one shared middle section of the pipeline:

**Entry point 1 — Continuous monitoring:** a keyword/entity enters at **Global Discovery**, which produces candidate URLs/posts.

**Entry point 2 — Public one-off check:** an inbound WhatsApp message enters at the **Public Verification Bot Agent**, which hands any media/text straight to Extraction.

**Shared pipeline from Extraction onward:**

1. **Extraction Agent** (multimodal + social adapters) — turns whatever arrived (web page, social post, image, video, audio) into a normalized structured item.
2. **Multilingual Processing Service** — detects language, translates, tags region.
3. **Filtering Agent** — semantic shortlist + rule gate, consulting the **Entity Profile Agent**'s stored data for the relevant entity (monitoring path only — skipped for a public WhatsApp check, which has no entity).
4. **Contextual Validation Agent** — confirms relevance and disambiguates (monitoring path only).
5. **Fact-Checking & Authenticity Agent** — produces the verdict and evidence trail (both paths).

**From the Fact-Checking Agent, the two paths diverge again:**
- Monitoring path → **Brief & Clustering Agent** (batch) → Dashboard / Alerts / Reports.
- WhatsApp path → formatted reply sent back to the public user.

The **Source Intelligence Agent** runs alongside Extraction whenever a new domain or channel is seen, independent of which entry point triggered ingestion.

# 5. Agent-by-Agent Technical Specification

## 5.1 Global Discovery Agent
- **Trigger:** scheduled cron per saved entity, or an ad hoc API call from the dashboard's search box.
- **Input:** keyword(s)/entity_id.
- **Output:** a list of candidate `{url_or_post_id, platform, discovered_at}` published to `discovery.candidates`.
- **Core logic:** query expansion using Entity Profile aliases → parallel fan-out to GDELT/NewsAPI/Google Custom Search and each connected social platform's search endpoint → dedupe against the `seen_urls` Redis set.

## 5.2 Extraction Agent
- **Trigger:** consumes `discovery.candidates` and inbound WhatsApp media references.
- **Output:** a normalized `Article` row (or `MediaAsset` + `Article` pair for non-text input) published to `extraction.completed`.
- **Core logic:** route by input type — RSS/HTML/headless-browser chain for web; platform-specific SDK/API call for social; FFmpeg + Gemini/Whisper/Vision OCR pipeline for image/video/audio. Content-hash (SHA-256 of normalized text) computed for dedup.

## 5.3 Multilingual Processing Service
- **Trigger:** consumes `extraction.completed`.
- **Output:** `LanguageTag` row published to `multilingual.tagged`.
- **Core logic:** fastText or Google language-ID on the extracted text → route to Google Translate or IndicTrans2 (if source language is an Indian language) → store both original and translated text.

## 5.4 Entity Profile Agent
- **Trigger:** manual "create entity" action, or a scheduled monthly refresh job.
- **Output:** an `Entity` row with populated aliases/seed_terms/disambiguation_context.
- **Core logic:** single Gemini call with a structured-output schema (name, description, URL as input) constrained to return the alias/context fields; any field with `analyst_edited = true` is excluded from being overwritten on refresh.

## 5.5 Filtering Agent
- **Trigger:** consumes `multilingual.tagged`.
- **Output:** `Match` rows for items that pass, published to `filtering.passed`.
- **Core logic:** pgvector cosine-similarity search of the translated text against the entity's stored embedding (threshold configurable per entity, default 0.35) → apply the entity's active `Rule` as a SQL WHERE-style boolean filter over geography/tier/recency/terms → natural-language rule input is compiled to this same structured filter via a single Gemini call at rule-save time (not per article).

## 5.6 Contextual Validation Agent
- **Trigger:** consumes `filtering.passed`.
- **Output:** `Validation` row published to `validation.completed`.
- **Core logic:** Gemini call with the entity's disambiguation_context + exclusion_terms + the candidate text, constrained to return `{relevant: bool, confidence: float, reason: string}`. Confidence ≥ 0.85 → auto-accept; 0.50–0.85 → analyst review queue; < 0.50 → auto-reject.

## 5.7 Fact-Checking & Authenticity Agent
- **Trigger:** consumes `validation.completed` (monitoring path) or a direct call from the Public Verification Bot Agent (WhatsApp path).
- **Output:** `FactCheckResult` row published to `factcheck.verdict`.
- **Core logic:** (a) query Google Fact Check Tools API and the ingested regional fact-check feeds for matching claims; (b) if media is an image/video, run reverse-image search and a tamper-detection model; (c) synthesize (a)+(b) plus cross-source corroboration count into a Gemini call constrained to return `{authenticity_score: float, verdict: enum[Verified,Unverified,Disputed,Likely False], evidence: [...]}`. Disputed/Likely False always sets `needs_human_review = true`.

## 5.8 Source Intelligence Agent
- **Trigger:** consumes `extraction.completed`, checks whether `source_domain`/`channel_handle` already exists in the `SourceTier` table.
- **Output:** an upserted `SourceTier` row.
- **Core logic:** heuristic score (TLD, HTTPS, domain age via WHOIS, platform verified-badge status) blended with a Gemini call for a qualitative credibility read → tier assigned (1/2/3) → any row with `analyst_locked = true` is skipped.

## 5.9 Brief & Clustering Agent
- **Trigger:** scheduled batch job (end of monitoring cycle).
- **Output:** a `Brief` record with clustered stories and a generated summary.
- **Core logic:** embedding-based clustering (cosine similarity above a duplicate threshold) of same-cycle `Article` rows → for each cluster, a Gemini call constrained to produce a summary where every sentence is tagged with the `article_id` it was drawn from (a grounding/citation requirement enforced by the output schema, not just a prompt instruction) → sentences that cannot be tied to a source `article_id` are rejected and the agent re-generates that sentence.

## 5.10 Public Verification Bot Agent (WhatsApp)
- **Trigger:** inbound WhatsApp Business API webhook.
- **Output:** a `WhatsAppQuery` row and an outbound WhatsApp reply.
- **Core logic:** rate-limit check (Redis counter per hashed phone number) → route media to Extraction, text to Multilingual Processing → call Fact-Checking Agent directly → if verdict is Verified/Unverified, format and send the reply immediately in the detected language; if Disputed/Likely False, queue for the Fact-Verification Analyst and send an interim "we're checking this carefully" message, then send the final reply once reviewed.

# 6. Data Model / Schema

```sql
-- Core relational tables (PostgreSQL + pgvector)
Entity(id, name, type, aliases JSONB, seed_terms JSONB, exclusion_terms JSONB,
       disambiguation_context TEXT, embedding VECTOR(768), status, owner_team_id, created_at)

Rule(id, entity_id FK, geo_filter JSONB, domain_rules JSONB, recency_window INTERVAL,
     boolean_terms JSONB, language_filter JSONB, priority INT, version INT, created_at)

Article(id, canonical_url, source, source_tier INT, title, author, published_at,
        language, media_type ENUM('text','image','video','audio'),
        extracted_text TEXT, content_hash CHAR(64), duplicate_group_id, created_at)

MediaAsset(id, article_id FK, type ENUM('image','video','audio'), storage_ref,
           ocr_text TEXT, transcript TEXT, caption TEXT)

SocialPost(id, article_id FK, platform, handle, follower_tier, engagement_metrics JSONB, post_url)

LanguageTag(article_id FK, detected_language, region, translated_text TEXT, translation_confidence FLOAT)

Match(id, article_id FK, entity_id FK, match_type ENUM('semantic','keyword'),
      confidence_score FLOAT, matched_seed_terms JSONB)

Validation(id, match_id FK, disambiguation_confidence FLOAT, sentiment,
           validated_status ENUM('approved','rejected','needs_review'),
           validated_by, reason TEXT)

FactCheckResult(id, article_id FK, authenticity_score FLOAT,
                verdict ENUM('Verified','Unverified','Disputed','Likely False'),
                evidence_sources JSONB, manipulated_media_flag BOOL,
                needs_human_review BOOL, reviewed_by)

SourceTier(domain_or_handle PK, platform, tier INT, credibility_score FLOAT, analyst_locked BOOL)

WhatsAppQuery(id, phone_number_hash, submitted_content_ref, language,
              verdict FK, replied_at, needs_human_review BOOL)

Alert(id, entity_id FK, article_id_or_cluster_id, channel, cadence, delivered_at, escalation_flag)

User(id, name, role ENUM('Admin','Lead','Analyst','FactVerifier','Client','Executive'),
     account_ids JSONB, notification_prefs JSONB)

AuditLogEntry(id, actor_id, action_type, target_id, before JSONB, after JSONB, timestamp)
```

# 7. API Contracts (Representative Endpoints)

```
POST /api/v1/discovery/search
  body: { "keywords": ["string"], "entity_id": "uuid", "scope": {...} }
  → 202 { "job_id": "uuid" }

GET /api/v1/feed?entity_id=&language=&platform=&authenticity=&page=
  → 200 { "items": [ { article, validation, factcheck, media } ], "next_page": ... }

POST /api/v1/rules
  body: { "entity_id": "uuid", "natural_language": "string" } | { structured rule JSON }
  → 200 { "compiled_rule": {...}, "preview_matches": [...] }

POST /api/v1/entities
  body: { "name": "string", "type": "string", "url": "string" }
  → 201 { entity object with auto-generated aliases/context }

POST /webhooks/whatsapp
  body: WhatsApp Business API inbound payload
  → 200 (ack; processing happens async, reply sent via outbound WhatsApp API call)

GET /api/v1/factcheck/{article_id}
  → 200 { authenticity_score, verdict, evidence_sources, manipulated_media_flag }
```

All authenticated endpoints require a Bearer JWT issued by the Auth service; the WhatsApp webhook is authenticated via Meta's signature header instead.

# 8. Security, Privacy & Compliance

- All traffic over TLS; data at rest encrypted (native PostgreSQL/GCS encryption).
- RBAC enforced at the API layer per the `User.role` enum; row-level security in PostgreSQL for per-account entity isolation.
- WhatsApp phone numbers are stored only as a salted hash (`phone_number_hash`); the raw number is never persisted.
- Social media ingestion restricted to each platform's official API and public-content scope only — no private/DM content, no login-gated scraping.
- Every fact-check verdict, rule change, and disambiguation decision is written to `AuditLogEntry` with the full before/after state.

# 9. Infrastructure & Deployment

- **Environments:** `dev` (single-node docker-compose for local Antigravity development), `staging`, `production` (GKE cluster, one deployment per agent service, horizontal pod autoscaling keyed to Redis Streams consumer lag).
- **CI/CD:** GitHub Actions — lint/test on every PR, build+push container images on merge to `main`, Terraform-managed deploy to `staging` automatically and to `production` on manual approval.
- **Secrets:** managed via Google Secret Manager, injected as environment variables at deploy time — never committed to the repository.

# 10. Testing & Evaluation Strategy

- **Unit tests** per agent service (pytest) covering the core transformation logic (excluding the live LLM/API calls, which are mocked).
- **Golden-set evaluation** for the LLM-driven agents: a curated set of ~100 labeled examples per agent (Contextual Validation, Fact-Checking) re-run on every model/prompt change, tracking precision/recall against the PRD's target metrics (Section 3 of the PRD).
- **Integration tests** for the full Pipeline A and Pipeline B flows using recorded fixture inputs instead of live external API calls.
- **Human-in-the-loop sampling:** a random 5% of auto-accepted Contextual Validation and Fact-Checking verdicts are routed to the review queue anyway, purely to measure real-world agreement against the ≥90% target — this sampling is a permanent QA mechanism, not a one-time test.

# 11. Repository Structure

```
/docs
  PRD.md
  TRD.md
/services
  global-discovery/
  extraction/
  multilingual/
  entity-profile/
  filtering/
  contextual-validation/
  fact-checking/
  source-intelligence/
  brief-clustering/
  whatsapp-bot/
/frontend
  dashboard/           (React app)
/infra
  terraform/
  k8s/
/tests
  unit/
  integration/
  golden-sets/
```

Each folder under `/services` is an independently deployable FastAPI + ADK service with its own `Dockerfile`, `requirements.txt`, and `README.md` describing its Section 5 contract.

# 12. Build Phases (Technical Milestones)

These map directly to the PRD's Phase 0–7 roadmap (PRD Section 14). Each phase's Definition of Done is: the services listed are deployed to `staging`, their unit and integration tests pass, and a golden-set evaluation (where applicable) meets or exceeds the interim target noted.

| Phase | Services built | Definition of Done |
|---|---|---|
| 0 | extraction (web only), a minimal rule engine, a read-only dashboard | Can ingest a manually supplied RSS feed and display articles |
| 1 | filtering, contextual-validation | Golden-set precision/recall measured and logged as the baseline |
| 2 | global-discovery | A keyword search returns candidate URLs without any manual URL entry |
| 3 | extraction extended with social adapters + OCR/ASR/video sub-modules | A submitted image/video/audio item produces a normalized Article row |
| 4 | multilingual service | A non-English item is correctly detected, translated, and matched |
| 5 | fact-checking, source-intelligence | Every item in the feed carries a verdict and an evidence trail |
| 6 | whatsapp-bot | A test WhatsApp number can submit content and receive a verdict reply |
| 7 | brief-clustering, reporting, admin console | Full Pipeline A and Pipeline B run end-to-end against the golden sets at the PRD's target metrics |
