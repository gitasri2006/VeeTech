# Discovery Contextual Validation Agent

Part of **Discovery** (Intelligent News Discovery & Media Authentication Platform).
Compliant with **PRD Section 7.6**, **TRD Section 5.6**, and **TRD Section 10**.

## Capabilities

- **LLM Disambiguation**: Uses Gemini with disambiguation context and negative exclusion terms to filter homonyms, coincidental mentions, and out-of-domain text.
- **Three-Way Confidence Routing**:
  - `confidence >= 0.85`: Auto-approved
  - `0.50 <= confidence < 0.85`: Routed to Analyst Review Queue
  - `confidence < 0.50`: Auto-rejected
- **Human-in-the-Loop QA Sampling**: Permanent 5% random sampling of auto-approved stories routed to the review queue for continuous precision tracking.
- **Human Analyst Overrides**: Complete audit trail of analyst decisions with before/after state diffs.

## API Endpoints

- `POST /validate`: Disambiguate and route candidate match.
- `GET /validations`: Query validation records.
- `GET /review-queue`: Fetch pending moderation items.
- `POST /review-queue/{validation_id}/override`: Apply human analyst override.
- `GET /health`: Health probe.
