# VeriScope Entity Profile Agent

Part of **VeriScope** (Intelligent News Discovery & Media Authentication Platform).
Compliant with **PRD Section 7.4** and **TRD Section 5.4**.

## Capabilities

- **LLM Context Graph Generation**: Uses Gemini to synthesize aliases, subsidiaries, key executives, and disambiguation context.
- **Multilingual Embeddings**: Produces 768-dimensional normalized embeddings for cross-lingual semantic matching.
- **Edit-Precedence Lock**: Prevents automated refresh cycles from overwriting analyst-edited fields (`analyst_edited_fields`).
- **Audit Logging**: Logs all profile updates and before/after diffs to `AuditLogEntry`.

## API Endpoints

- `POST /entities`: Create a new tracked entity.
- `GET /entities`: List all entities.
- `GET /entities/{entity_id}`: Fetch entity details.
- `PUT /entities/{entity_id}`: Update entity with analyst edit lock.
- `POST /entities/{entity_id}/refresh`: Trigger automated profile refresh.
- `GET /health`: Health probe.
