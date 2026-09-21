# Discovery Global Discovery Agent

Part of **Discovery** (Intelligent News Discovery & Media Authentication Platform).
Compliant with **PRD Section 7.1** and **TRD Section 5.1**.

## Capabilities

- **Keyword & Topic Driven Discovery**: Discovers global web news and social content from raw keywords or entity IDs without requiring a URL.
- **Automated Query Expansion**: Uses Entity Profile aliases and seed terms to generate comprehensive search queries.
- **Parallel Fan-Out**: Multi-threaded discovery querying GDELT, NewsAPI, Google Search, and social search endpoints in parallel.
- **Seen URL Deduplication**: Cross-platform caching to prevent re-ingestion of already processed items.
- **Event Bus Integration**: Publishes candidate batches to `discovery.candidates`.

## API Endpoints

- `POST /api/v1/discovery/search`: Run an ad-hoc global discovery search.
- `GET /discovery/jobs/{job_id}`: Poll discovery job results.
- `GET /health`: Health check.
