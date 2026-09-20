% Product Requirements Document — Version 3.0 (Final, Build-Ready)
% VeriScope — Intelligent News Discovery & Media Authentication Platform

# 1. Executive Summary

VeriScope is an AI-agent platform that replaces manual, keyword-based media monitoring with a system that finds relevant news the way a trained analyst would: by understanding context and intent, not matching strings. A user (a PR/comms team, or the general public via WhatsApp) provides a keyword, an entity, or a piece of content, and the system discovers, extracts, reads, translates, verifies, and delivers coverage from across the open web and social media — in any format (text, image, video, audio) and any major language — along with an authenticity verdict for every item.

This is the final, build-ready specification. It consolidates three prior inputs into one coherent plan:

1. The original problem statement (semantic discovery, configurable rules, contextual validation, smart extraction).
2. A reference architecture reviewed during design (an 8-agent system), refined to remove duplicated agent responsibilities.
3. New capabilities requested for competition scope: global keyword-driven discovery (no URL needed), social media ingestion, image/video/audio processing, fact-checking and authenticity scoring, full multilingual coverage (Indian + foreign languages and the channels that publish in them), and a public WhatsApp verification bot.

This document is the single source of truth for **what** to build. The companion Technical Requirements Document (TRD) defines **how** to build it. Where the two ever appear to disagree, this PRD governs feature scope and the TRD governs implementation detail — they should not actually conflict; flag it as a question rather than guessing if they seem to.

# 2. Problem Statement

Manual and keyword-based media tracking fails at scale because news discovery requires context, not string matching.

| # | Pain Point | Example |
|---|---|---|
| 1 | Missed coverage | "Fintech unicorn" used instead of a brand's actual name |
| 2 | False positives | A brand name collides with an unrelated common word (e.g. "Apple" the company vs. the fruit) |
| 3 | No business rules | Analysts manually filter by geography, source authority, and recency |
| 4 | Context blindness | Homonyms and ambiguous names are not resolved automatically |
| 5 | Scale bottleneck | 250+ tracked entities across thousands of domains cannot be watched by hand |
| 6 | Format blindness | Real conversation happens in images, video, audio, and social posts — not just web-article text |
| 7 | Language blindness | Coverage in regional Indian languages and foreign languages is missed entirely by English-only tools |
| 8 | No trust signal | Nothing tells the analyst (or the public) whether a piece of content is true, manipulated, or out of context |
| 9 | Narrow intake | Legacy tools require a specific URL to be supplied manually — they cannot start from just a keyword and find coverage on their own |

# 3. Goals & Success Metrics

| Goal | Metric | Target |
|---|---|---|
| Recall | Reduction in missed relevant coverage vs. keyword tools | ≥ 60% |
| Precision | Reduction in false positives vs. keyword tools | ≥ 85% |
| Analyst time | Filtering time per analyst per day | < 30 min (from ~4 hrs) |
| Source breadth | Share of daily coverage found without a manually supplied URL | ≥ 90% |
| Platform coverage | Social platforms actively monitored at launch | ≥ 5 (Instagram, X, YouTube, Facebook, Telegram) |
| Modality coverage | Image/video/audio posts successfully converted to searchable text | ≥ 85% |
| Language coverage | Indian + foreign languages supported at launch | ≥ 12 Indian, ≥ 10 foreign |
| Trust coverage | Stories delivered with an authenticity score and evidence trail | 100% |
| Trust accuracy | Agreement between platform verdict and manual fact-checker review (sampled) | ≥ 90% |
| Public utility | Average response time for a WhatsApp verification query | < 60 seconds |
| Public adoption | Verification queries the WhatsApp bot can handle per day at launch | ≥ 1,000 |

# 4. Users & Personas

- **PR/Comms Analyst** — monitors 20–40 assigned entities daily; needs a clean, prioritized, multilingual, authenticity-scored feed.
- **Account/Team Lead** — configures and tunes rules per client; reviews override rates and team performance.
- **Fact-Verification Analyst** — reviews items the system flags as "Disputed" or "Needs Review"; confirms or overturns the automated verdict.
- **Platform Admin** — manages entities, users, roles, source/channel tier lists, and system health.
- **Executive Stakeholder** — consumes a read-only weekly digest of sentiment, volume, and top verified stories.
- **Public User (WhatsApp)** — any member of the public who forwards a suspicious message, image, video, or voice note to the VeriScope WhatsApp number and expects a fast, trustworthy verdict back, with no account or login required.

# 5. Scope

**In scope for this build:**
- Keyword/entity-driven global discovery across the open web and connected social platforms.
- Text, image, video, and audio content extraction and processing.
- Multilingual detection, translation, and matching across Indian and foreign languages.
- Semantic + rule-based filtering, LLM-based contextual validation, and fact-checking/authenticity scoring.
- A public WhatsApp bot for one-off content verification by anyone, independent of tracked entities.
- Analyst dashboard, alerting, reporting, and admin console.

**Explicitly out of scope for this build (do not implement unless separately requested):**
- Automated PR response drafting or crisis-comms copy generation.
- Native mobile apps (the dashboard is responsive web only; WhatsApp is the only mobile-native surface).
- Paid ad/sponsored-content monitoring.
- Any content acquisition method that violates a platform's terms of service (see Section 12 — official APIs only, with a documented fallback plan if API access is delayed, never a scraping-only substitute for a platform that prohibits it).

# 6. System Overview — Agent Architecture

The system is built as ten cooperating agents. None duplicate another's job — each has a distinct trigger, input, and output. Two entry points feed the pipeline: **Global Discovery** (proactive, for entities under continuous watch) and the **WhatsApp Bot** (reactive, for one-off public checks).

| # | Agent | Job |
|---|---|---|
| 1 | Global Discovery Agent | Turn a keyword/entity into a worldwide candidate set across web + social platforms |
| 2 | Extraction Agent | Convert any raw source (HTML, RSS, social post, image, video, audio) into clean structured text |
| 3 | Multilingual Processing Service | Detect language, translate to a pivot language, tag source language/region |
| 4 | Entity Profile Agent | Build/maintain each client's alias, subsidiary, and disambiguation context graph |
| 5 | Filtering Agent | Semantic shortlist + deterministic rule gate (geo/tier/recency/terms) in one stage |
| 6 | Contextual Validation Agent | LLM disambiguation and relevance confidence routing |
| 7 | Fact-Checking & Authenticity Agent | Score how true/verifiable a piece of content is; flag manipulated media |
| 8 | Source Intelligence Agent | Discover new domains/channels AND score/tier their credibility in one pass |
| 9 | Brief & Clustering Agent | Group syndicated/duplicate coverage, isolate outlier angles, generate the digest |
| 10 | Public Verification Bot Agent (WhatsApp) | Receive a forwarded message/image/video/audio from the public and return a verdict |

**Pipeline A — Continuous entity monitoring:**
Global Discovery → Extraction (incl. multimodal sub-steps) → Multilingual tagging/translation → Filtering → Contextual Validation → Fact-Checking → Brief & Clustering → Dashboard/Alerts/Reports. Source Intelligence runs alongside Extraction whenever a new domain/channel is seen. Entity Profile runs once at onboarding and refreshes periodically; it is not part of the live per-item pipeline.

**Pipeline B — Public one-off verification:**
WhatsApp message received → Public Verification Bot Agent → Extraction (multimodal sub-steps as needed) → Multilingual tagging/translation → Fact-Checking & Authenticity → reply sent back to the user in their own language, with a plain-language explanation and evidence links. This path deliberately skips entity Filtering and Contextual Validation, since a public check is not tied to a tracked entity — it is a direct "is this real?" question.

# 7. Detailed Agent Specifications

## 7.1 Global Discovery Agent
- Accepts one or more keywords, an entity name, or a topic phrase — no URL required.
- Expands the query automatically using the Entity Profile's aliases and seed terms.
- Searches general web search, dedicated news-search APIs, RSS/news aggregators, and each connected social platform's own search/discovery endpoint, in parallel.
- Applies an initial geography/recency/language scope (default: global, all supported languages, last 30 days) before handing candidates to Extraction.
- De-duplicates candidates against content already ingested.
- Supports both scheduled continuous monitoring for saved entities and one-off ad hoc searches.

## 7.2 Extraction Agent (Multi-Platform, Multimodal)
- Web: RSS → static HTML → headless-browser fallback chain for JavaScript-heavy sites.
- Social adapters: Instagram (caption, hashtags, comments, media URLs), X/Twitter (post text, thread context), YouTube (title, description, transcript/captions), Facebook (public post text, comments), Telegram (public channel messages), Reddit (post + top comments).
- Image sub-module: OCR for embedded text; image captioning for visual-only content with no text.
- Video sub-module: audio-track transcription, key-frame sampling and captioning, on-screen burned-in text extraction.
- Audio sub-module: full speech-to-text transcription, usable for podcasts, voice notes, and radio clips.
- Every input — regardless of original modality — is normalized into the same structured record shape (title, body_text, author/handle, published_at, source, media_type) so downstream agents behave identically for a text article, a transcribed video, or an OCR'd image.
- Content-hash deduplication applies across all platforms and modalities, not just web articles.

## 7.3 Multilingual Processing Service
- Language identification on every extracted item (original text, OCR output, or transcript).
- Machine translation to a pivot language (English) for cross-language semantic matching, while the original-language text is preserved for display and audit.
- Indian language coverage at launch: Hindi, Tamil, Telugu, Kannada, Malayalam, Bengali, Marathi, Gujarati, Punjabi, Urdu, Odia, Assamese.
- Foreign language coverage at launch: Spanish, French, German, Arabic, Mandarin Chinese, Japanese, Korean, Russian, Portuguese, Indonesian.
- Tags which language/region a source or channel primarily publishes in, so "Tamil-language sources" can be used as a filter, not just a translated-text match.
- Runs as a shared service called by Extraction (tagging), Filtering (translated text for matching), and Fact-Checking (cross-language corroboration) — not a single-purpose pipeline stage.

## 7.4 Entity Profile Agent
- LLM-assisted generation of aliases, parent/subsidiary names, key executives, and industry jargon from a company name, description, and URL.
- Disambiguation context and exclusion terms, authored or edited by analysts.
- Edit-precedence lock: any field an analyst manually edits is protected from being silently overwritten on the next automated refresh.

## 7.5 Filtering Agent
- Semantic shortlist: embeds the entity profile and the candidate item, ranks by similarity, keeps everything above a configurable threshold.
- Deterministic rule gate: geography, source/channel tier, recency window, mandatory/excluded terms, language/region — evaluated as boolean conditions.
- Natural-language rule authoring: an analyst can type a plain-English rule (e.g. "only Tier 1 Indian sources from the last 48 hours, excluding sports") and have it compiled into the structured filter automatically.
- Rule sandbox: test any rule against the last 7 days of ingested content before activating it.

## 7.6 Contextual Validation Agent
- LLM-based disambiguation against the entity's profile and context.
- Three-way confidence routing: auto-accept above a high threshold, route to an analyst review queue when borderline, auto-reject below a low threshold.
- Every verdict carries a one-line, human-readable explanation of what drove the decision.

## 7.7 Fact-Checking & Authenticity Agent
- Cross-source corroboration: checks whether a claim also appears in independent Tier-1 sources before treating it as confirmed.
- Claim-level lookups against established fact-check databases and regional fact-checking bodies.
- Manipulated-media checks: reverse-image search for recycled/out-of-context photos, and a tamper/deepfake-detection pass on video.
- Stale-context detection: flags old images/videos being recirculated as if they depict a current event.
- Produces an Authenticity Score, a verdict label (Verified / Unverified / Disputed / Likely False), and an evidence trail listing corroborating or contradicting sources.
- Disputed or Likely-False items are always routed to a human Fact-Verification Analyst before being surfaced in a client-facing report or sent back through the WhatsApp bot as a final answer — never auto-published as a false verdict.

## 7.8 Source Intelligence Agent
- Detects previously unseen domains and social channels/handles publishing relevant coverage.
- Immediately scores and tiers any newly discovered domain/channel (baseline authority, platform/TLD heuristics, publication history) in the same pass — discovery and scoring are one job, not two.
- Analyst override locks protect any manually corrected tier/score from being recalculated automatically.

## 7.9 Brief & Clustering Agent
- Groups near-duplicate/syndicated coverage — across languages and platforms — into a single story cluster.
- Isolates outlier angles (investigative pieces, unique commentary) that do not fit the mainstream cluster.
- Generates the daily/weekly digest with a representative headline, a consolidated summary, contributing sources across languages/platforms, and each cluster's overall authenticity status.
- Every generated sentence in the digest must be traceable to a specific source sentence it summarizes — the agent must not state anything that cannot be attributed to an ingested item (see TRD Section 5.9 for the grounding mechanism).

## 7.10 Public Verification Bot Agent (WhatsApp)
- Receives an inbound WhatsApp message (text, forwarded image, video, or voice note) from any member of the public via the WhatsApp Business API.
- Passes media through Extraction (Section 7.2) and text through Multilingual Processing (Section 7.3) exactly as the monitoring pipeline does.
- Sends the resulting content to the Fact-Checking & Authenticity Agent for a verdict.
- Replies in the same language the user wrote in, in plain, non-technical language, with: the verdict label, a one-paragraph explanation, and links to the corroborating/contradicting evidence.
- Applies per-phone-number rate limiting and basic abuse detection (e.g., identical spam content sent at high volume) to prevent the public channel from being used to flood the pipeline.
- Requests explicit one-time consent before first use, explaining what is stored (the submitted content and the verdict) and for how long, and never asks for or stores any personal information beyond the phone number needed to reply.
- Disputed or Likely-False verdicts are queued for a Fact-Verification Analyst to confirm before the final reply is sent, to avoid the bot itself asserting a false-content verdict without human sign-off; Verified/Unverified items may reply immediately.

# 8. Functional Requirements

## 8.1 Discovery & Ingestion
- Keyword/entity search box as the primary entry point; direct URL submission remains available for one-off manual checks.
- Automatic query expansion using entity aliases/seed terms.
- Configurable discovery scope: geography, language set, recency window, platforms to include.
- Continuous/scheduled discovery for saved entities.

## 8.2 Social Media Ingestion
- Platform coverage: Instagram, X/Twitter, YouTube, Facebook, Telegram, Reddit.
- Per-platform metadata capture: author/handle, follower-count tier, engagement (likes/shares/comments), timestamp, and platform-specific context.
- Public content only, accessed strictly through each platform's official API and terms.
- Comment-thread sampling for sentiment/context, without ingesting private/DM content.

## 8.3 Multimodal Content Processing
- Images: OCR for embedded text, captioning for visual-only content, reverse-image lookup for authenticity.
- Video: audio-track transcription, key-frame captioning, on-screen text extraction, authenticity/tamper checks.
- Audio: full speech-to-text transcription with timestamps.
- Unified structured output regardless of original format.

## 8.4 Multilingual Coverage
- Detection and translation across the languages listed in Section 7.3, expandable over time.
- Source/channel language tagging for language-based filtering.
- Original-language text preserved and shown alongside the translation.

## 8.5 Fact-Checking & Authenticity
- Authenticity score and verdict label shown on every story card.
- Evidence panel showing corroborating/disputing sources and any manipulated-media findings.
- Disputed/Likely-False items route to the Fact-Verification Analyst queue.
- Authenticity filtering available as a rule option in the Filtering Agent.

## 8.6 Public WhatsApp Verification Bot
- Public-facing WhatsApp number that accepts text, image, video, and voice-note submissions.
- Automated reply pipeline as specified in Section 7.10.
- Internal moderation view for the Fact-Verification Analyst to review queued Disputed/Likely-False items before a reply goes out.
- Basic usage analytics (volume, top-forwarded claims, language breakdown) surfaced to Admins.

## 8.7 Entity & Client Management
- Entity profile creation/editing, bulk import, entity merge tool, full audit log.

## 8.8 Configurable Rule Engine
- Geography, source/channel tier, recency, mandatory/excluded terms, language/region filters; natural-language rule authoring; rule sandbox and versioning.

## 8.9 Alerting & Notification
- In-app, email, Slack/Teams, SMS/push channels; configurable cadence per entity/user; crisis/spike auto-escalation; alert deduplication.

## 8.10 Dashboard & Feed
- Unified prioritized feed across text/image/video/audio, filterable by entity, language, platform, sentiment, source tier, authenticity status; story clustering; trend widgets; saved views; full-text and semantic archive search.

## 8.11 Reporting & Export
- Scheduled and on-demand PDF/Excel reports; CSV export; public read API.

## 8.12 User, Role & Access Management
- Roles: Admin, Team Lead, Analyst, Fact-Verification Analyst, Client viewer, Executive. SSO/MFA, per-account data isolation, audit log of logins and data exports.

## 8.13 Admin & Platform Configuration
- Domain/channel tier management, ingestion source management, system health dashboard, usage/billing view, feature flags.

# 9. Non-Functional Requirements

| Category | Requirement |
|---|---|
| Scale | 250+ tracked entities across 1,000+ web domains and social channels, in 20+ languages |
| Latency | Real-time-tier text alerts within 15 minutes; multimodal items within 30 minutes; WhatsApp replies within 60 seconds for Verified/Unverified, longer for Disputed items pending human review |
| Storage | Media assets stored with a retention policy separate from the text archive |
| Compute | GPU-backed inference required for OCR/ASR/video-captioning/deepfake-detection at scale |
| Compliance | Social ingestion strictly via each platform's official API/terms; regional data-handling rules respected per jurisdiction; WhatsApp bot collects the minimum data necessary and states this at first use |
| Auditability | Every fact-check verdict, disambiguation decision, and rule change is logged with its evidence/reasoning trail |
| Availability | 99.5% uptime for dashboard, alerting, and the WhatsApp bot |

# 10. Data Model (Key Entities)

- **Entity** — id, name, type, aliases, seed_terms, exclusion_terms, disambiguation_context, status, owner_team_id
- **Rule** — id, entity_id/group_id, geo_filter, domain_rules, recency_window, boolean_terms, language_filter, priority, version
- **Article** — id, canonical_url, source, source_tier, title, author, published_at, language, media_type, extracted_text, duplicate_group_id
- **MediaAsset** — id, type (image/video/audio), storage_ref, source_article_id, ocr_text, transcript, caption
- **SocialPost** — id, platform, handle, follower_tier, engagement_metrics, post_url, article_id
- **LanguageTag** — article_id, detected_language, region, translated_text, translation_confidence
- **Match** — id, article_id, entity_id, match_type, confidence_score, matched_seed_terms
- **Validation** — id, match_id, disambiguation_confidence, sentiment, validated_status, validated_by
- **FactCheckResult** — id, article_id, authenticity_score, verdict, evidence_sources, manipulated_media_flag, reviewed_by
- **WhatsAppQuery** — id, phone_number_hash, submitted_content_ref, language, verdict, replied_at
- **Alert** — id, entity_id, article_id/story_cluster_id, channel, cadence, delivered_at, escalation_flag
- **User** — id, name, role, account_ids, notification_prefs
- **AuditLogEntry** — id, actor_id, action_type, target_id, before, after, timestamp

# 11. Key Screens

1. Global Search / Discovery screen (keyword input as the primary entry point)
2. Unified Feed — text, image, video, and audio-derived cards, each with a language badge and an authenticity badge
3. Story Detail view (full content, "why matched" panel, source cluster, authenticity evidence)
4. Media Viewer — inline video/audio playback with transcript, image viewer with OCR overlay
5. Entity Management — list + profile editor
6. Rule Builder — configuration + natural-language input + sandbox preview
7. Fact-Verification Queue — for the Fact-Verification Analyst persona
8. WhatsApp Bot Moderation & Analytics view
9. Reporting Center
10. Admin Console
11. Audit Log Viewer
12. Executive Digest view (read-only)

# 12. User Journeys

**A. Onboard a client entity:** Admin/Lead creates an Entity Profile → system auto-generates aliases/context via the Entity Profile Agent → a 24-hour calibration pass runs → Lead reviews and approves the tuned rule set.

**B. Keyword-to-insight monitoring:** Analyst types a keyword or entity name → Global Discovery Agent searches globally across web and social platforms in every supported language → Extraction, Multilingual, Filtering, Contextual Validation, and Fact-Checking run automatically → Analyst sees one unified, scored, authenticity-tagged feed.

**C. Public WhatsApp check:** A member of the public forwards a suspicious image/video/voice-note to the VeriScope WhatsApp number → the Public Verification Bot Agent processes it through Extraction, Multilingual, and Fact-Checking → the user receives a plain-language verdict with evidence within seconds (or after human review if Disputed).

# 13. Risks, Compliance & Open Questions

- Social platform API access: Instagram/Facebook/X impose API approval and rate limits; official-API-only access is a hard requirement (Section 5), so budget real time for onboarding approval rather than assuming day-one access to every platform.
- Multimodal compute cost: ASR, video-captioning, and deepfake-detection are GPU-intensive; benchmark cost/latency before committing to the 30-minute multimodal SLA.
- Fact-check database coverage is far better in English than in most Indian regional languages; expect lower initial confidence there and route more of that volume to human review.
- Machine translation quality for low-resource languages may affect semantic matching accuracy; needs per-language benchmarking.
- WhatsApp bot abuse/scale risk: a viral submission spike could overwhelm review capacity — rate limiting and a review-queue backpressure policy are required, not optional.
- Open question: which social platforms get official API access first, and does that change the Section 8.2 launch list?
- Open question: what is the sustainable review capacity for the Fact-Verification Analyst queue at expected WhatsApp volume?

# 14. Phased Roadmap

| Phase | Scope |
|---|---|
| Phase 0 — Foundation | Extraction (web only), basic rule engine, plain dashboard |
| Phase 1 — Semantic Core | Semantic Discovery, Contextual Validation, confidence routing |
| Phase 2 — Global Discovery | Global Discovery Agent, keyword-driven search replacing URL-only flow |
| Phase 3 — Social & Multimodal | Social media adapters, OCR/ASR/video sub-modules in Extraction |
| Phase 4 — Multilingual | Multilingual Processing Service, Indian + foreign language coverage |
| Phase 5 — Trust Layer | Fact-Checking & Authenticity Agent, Fact-Verification Analyst workflow |
| Phase 6 — Public Utility | WhatsApp Verification Bot, abuse/rate-limit controls, moderation view |
| Phase 7 — Scale & Reporting | Source Intelligence, Brief & Clustering, reporting center, admin console, 250+ entity scale hardening |

# 15. Success Criteria Recap

- ≥ 60% reduction in missed relevant coverage vs. keyword tools.
- ≥ 85% reduction in false positives vs. keyword tools.
- Analyst filtering time cut from ~4 hrs/day to < 30 min/day.
- ≥ 90% of daily coverage discovered without a manually supplied URL.
- ≥ 85% of image/video/audio posts successfully converted to searchable text.
- ≥ 12 Indian and ≥ 10 foreign languages supported at launch.
- 100% of delivered stories carry an authenticity score; ≥ 90% agreement with manual fact-checker review.
- WhatsApp bot responds within 60 seconds for non-disputed content and handles ≥ 1,000 queries/day at launch.

# 16. Document Control

This is the final, consolidated PRD (v3.0). It supersedes all earlier drafts and comparison documents produced during design. The companion Technical Requirements Document (TRD v1.0) and the Antigravity Master Build Prompt are the only other authoritative documents for this build.
