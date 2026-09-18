# VeriScope Fact-Checking & Authenticity Agent

Part of **VeriScope** (Intelligent News Discovery & Media Authentication Platform).
Compliant with **PRD Section 7.7, 8.5** and **TRD Section 5.7**.

## Capabilities

- **Cross-Source Corroboration**: Checks claim repetition across Tier-1 wire services (Reuters, AP, BBC, PTI).
- **Regional & Global Claim DB Lookups**: Searches Google Fact Check Tools API, Alt News, BOOM Live, and PIB Fact Check feeds.
- **Manipulated Media & Deepfake Detection**: Evaluates reverse-image matches and forensic tamper flags.
- **Authenticity Scoring & Verdict Synthesis**: Calculates 0.0-1.0 authenticity score and assigns `Verified`, `Unverified`, `Disputed`, or `Likely False`.
- **Mandatory Human Review Gate**: Disputed and Likely False items are routed to the Fact-Verification Analyst moderation queue before final dissemination.

## API Endpoints

- `POST /factcheck/evaluate`: Run fact check on an article.
- `GET /factcheck/{article_id}`: Retrieve verdict and evidence trail.
- `GET /factcheck/queue`: Fetch items requiring human analyst sign-off.
- `POST /factcheck/{article_id}/review`: Submit human review decision.
- `GET /health`: Health probe.
