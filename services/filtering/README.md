# VeriScope Filtering Agent

Part of **VeriScope** (Intelligent News Discovery & Media Authentication Platform).
Compliant with **PRD Section 7.5** and **TRD Section 5.5**.

## Capabilities

- **Semantic Shortlisting**: pgvector cosine similarity between article and entity profile embeddings (threshold configurable, default >= 0.35).
- **Deterministic Rule Gate**: Evaluates recency, source tier, domain rules, boolean include/exclude keywords, and language whitelists.
- **Natural Language Rule Compiler**: Translates analyst plain English rules into structured JSON filters via Gemini.
- **Rule Sandbox**: Backtests rules on historical articles with pass/fail telemetry.
- **Event Bus Integration**: Emits `filtering.passed` events.

## API Endpoints

- `POST /filter/evaluate`: Run semantic and rule check on article/entity pair.
- `POST /rules/compile`: Compile natural language rule.
- `POST /rules`: Create structured rule.
- `GET /rules`: List rules.
- `POST /rules/sandbox`: Test rule against article corpus.
- `GET /health`: Health probe.
