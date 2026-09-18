# VeriScope Public Verification Bot Agent (WhatsApp)

## Overview
The **Public Verification Bot Agent** (`services/whatsapp-bot/`) provides a public-facing WhatsApp interface for one-off content verification (Pipeline B) adhering to PRD Section 7.10, Section 8.6, and TRD Section 5.10.

## Key Capabilities
- **Meta Cloud API Webhook Integration:** Receives inbound WhatsApp text, image, video, and audio/voice note messages with HMAC-SHA256 signature verification.
- **Privacy First (Zero Raw Phone Persistence):** Phone numbers are salted and SHA-256 hashed before storage.
- **Explicit One-Time Privacy Consent:** First-time users are prompted with an explicit retention and verification disclaimer before processing content.
- **Rate Limiting & Abuse Protection:** Sliding window throttle (10 req/min per phone hash) prevents spam attacks.
- **Multimodal & Multilingual Verification (Pipeline B):** Media is transcribed/OCRed, text is detected and translated, and claims are checked against fact-checking databases.
- **Human-in-the-Loop Analyst Queue:** `DISPUTED` and `LIKELY_FALSE` verdicts are queued for human analyst approval before final answers are returned to users.
- **Moderation & Analytics:** Complete analyst queue endpoints and usage analytics.

## Endpoints
- `GET /health` — Health check and active query metrics.
- `GET /webhooks/whatsapp` — Meta webhook verification handshake.
- `POST /webhooks/whatsapp` — Inbound WhatsApp message receiver.
- `POST /whatsapp/simulate` — Simulator for testing multimodal verification.
- `GET /whatsapp/queue` — List pending WhatsApp queries for Fact-Verification Analyst review.
- `POST /whatsapp/moderation/{query_id}/approve` — Analyst sign-off and outbound reply dispatcher.
- `GET /whatsapp/analytics` — Volume, verdict distribution, and language analytics.
