# VeriScope Extraction Service

Part of **VeriScope** (Intelligent News Discovery & Media Authentication Platform).
Compliant with **PRD Section 7.2** and **TRD Section 5.2**.

## Capabilities

- **Multi-Format Ingestion**: Ingests RSS/Atom XML feeds and static HTML pages.
- **Robust XML Fallback**: Primary `feedparser` with fallback to `ElementTree` / `BeautifulSoup` XML parsers.
- **Smart HTML Cleaning**: Strips scripts, ads, and navigation; extracts title, author, pubdate, source domain, and clean text.
- **SPA / Browser Fallback Hook**: Detects client-side JavaScript rendering and routes to headless browser hooks.
- **SHA-256 Deduplication**: Generates deterministic content hashes to prevent duplicate ingestion.
- **Event Bus Integration**: Publishes `extraction.completed` events to Redis Streams.

## API Endpoints

- `POST /extract/rss`: Ingest an RSS/Atom feed URL or XML body.
- `POST /extract/url`: Extract an article from a URL or raw HTML body.
- `GET /articles`: Query stored articles with pagination and tier filters.
- `GET /health`: Liveness and readiness probe.
