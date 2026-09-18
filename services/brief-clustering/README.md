# VeriScope Brief & Clustering Agent

## Overview
The **Brief & Clustering Agent** (`services/brief-clustering/`) delivers automated story clustering, executive digest synthesis, and grounded sentence citation verification (Agent 9 per PRD Section 7.9 and TRD Section 5.9).

## Key Capabilities
- **Embedding-Based Story Clustering:** Groups articles using 768-dimensional cosine similarity graph partitioning above a configurable similarity threshold.
- **Strict Grounding & Citation Verification:** Gemini-synthesized summaries must provide a verifiable `article_id` for every single sentence. Any ungrounded sentence is automatically rejected and logged.
- **Cluster-Level Authenticity Rollup:** Aggregates authenticity score distributions across all stories in each cluster.
- **Batch Automation & Real-Time Events:** Emits `brief.created` events to Redis Streams for downstream reporting and alerting.

## Endpoints
- `GET /health` — Health check and metrics.
- `POST /briefs/generate` — Cluster articles and generate schema-grounded executive briefs.
- `GET /briefs` — List briefs, optionally filtered by tracked entity.
- `GET /briefs/{brief_id}` — Retrieve specific brief with sentence-level citations.
- `POST /briefs/batch-cycle` — Trigger scheduled batch cycle.
