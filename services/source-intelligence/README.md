# VeriScope Source Intelligence Agent

Part of **VeriScope** (Intelligent News Discovery & Media Authentication Platform).
Compliant with **PRD Section 7.8** and **TRD Section 5.8**.

## Capabilities

- **Single-Pass Discovery & Tiering**: Detects new domains and social channels and scores their credibility in the same operation.
- **Heuristic Scoring**: Analyzes TLD authority, HTTPS configuration, domain history, and platform verification badges.
- **Tier Classification**: Classifies sources into Tier 1 (High Authority), Tier 2 (Mainstream), or Tier 3 (Low/Unverified).
- **Edit-Lock Protection**: Preserves manual analyst overrides (`analyst_locked = True`) across subsequent automated pipeline runs.

## API Endpoints

- `POST /sources/evaluate`: Evaluate authority and tier of a domain or handle.
- `GET /sources`: Query source tiers with tier and platform filters.
- `PUT /sources/{domain_or_handle}`: Update or lock a source tier.
- `GET /health`: Health probe.
