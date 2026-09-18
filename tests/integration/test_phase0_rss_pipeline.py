"""
Integration Tests for VeriScope Phase 0 RSS Extraction Pipeline
Tests full flow: Ingestion -> SHA-256 Deduplication -> DB Storage -> Event Bus Publishing
"""

import pytest
from fastapi.testclient import TestClient

from services.common.bus import bus
from services.common.db import db
from services.extraction.main import app

client = TestClient(app)

FIXTURE_RSS_XML = """<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
<channel>
  <title>VeriScope Live Wire</title>
  <link>https://livewire.veriscope.ai</link>
  <description>Automated live intelligence wire</description>
  <item>
    <title>Global Semiconductor Accord Signed in Geneva</title>
    <link>https://livewire.veriscope.ai/articles/semiconductor-accord-2026</link>
    <description><![CDATA[Delegates from 40 nations signed the Semiconductor Accord establishing transparency standards.]]></description>
    <author>Geneva Bureau</author>
    <pubDate>Thu, 18 Sep 2026 11:00:00 GMT</pubDate>
  </item>
  <item>
    <title>Advanced Photonic Compute Cluster Achieves 100 Petaflops</title>
    <link>https://livewire.veriscope.ai/articles/photonic-cluster-100pf</link>
    <description><![CDATA[A joint academic consortium demonstrated an energy-efficient photonic computing cluster.]]></description>
    <author>Elena Rostova</author>
    <pubDate>Thu, 18 Sep 2026 10:30:00 GMT</pubDate>
  </item>
</channel>
</rss>
"""


@pytest.fixture(autouse=True)
def clean_environment():
    """Clear database and bus queues before each test run."""
    db.articles.clear()
    bus.clear()
    yield
    db.articles.clear()
    bus.clear()


def test_health_check_endpoint():
    resp = client.get("/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "healthy"
    assert data["service"] == "extraction"
    assert data["version"] == "1.0.0"


def test_rss_extraction_pipeline_and_bus_events():
    payload = {
        "feed_xml": FIXTURE_RSS_XML,
        "source_name": "LiveWire",
        "source_tier": 1,
    }

    response = client.post("/extract/rss", json=payload)
    assert response.status_code == 200
    data = response.json()

    assert data["status"] == "success"
    assert data["total_processed"] == 2
    assert data["new_articles_count"] == 2
    assert data["duplicates_count"] == 0
    assert len(data["articles"]) == 2

    # Verify database persistence
    saved_articles = db.list_articles()
    assert len(saved_articles) == 2
    titles = [a.title for a in saved_articles]
    assert "Global Semiconductor Accord Signed in Geneva" in titles
    assert "Advanced Photonic Compute Cluster Achieves 100 Petaflops" in titles

    # Verify source tier assignment
    for a in saved_articles:
        assert a.source_tier == 1
        assert len(a.content_hash) == 64

    # Verify event bus publishing
    events = bus.get_messages("extraction.completed")
    assert len(events) == 2
    assert events[0]["event"] == "extraction.completed"
    assert events[0]["source_tier"] == 1


def test_sha256_deduplication_on_repeated_ingestion():
    payload = {
        "feed_xml": FIXTURE_RSS_XML,
        "source_name": "LiveWire",
        "source_tier": 1,
    }

    # First ingestion
    resp1 = client.post("/extract/rss", json=payload)
    assert resp1.status_code == 200
    assert resp1.json()["new_articles_count"] == 2
    assert len(db.list_articles()) == 2

    # Second ingestion with identical content
    resp2 = client.post("/extract/rss", json=payload)
    assert resp2.status_code == 200
    data2 = resp2.json()
    assert data2["total_processed"] == 2
    assert data2["new_articles_count"] == 0
    assert data2["duplicates_count"] == 2

    # Database count must remain 2
    assert len(db.list_articles()) == 2


def test_url_extraction_endpoint():
    html_content = """
    <html>
      <head>
        <title>New Fusion Reactor Prototype Surpasses Energy Breakeven</title>
        <meta name="author" content="Dr. Sarah Connor" />
        <meta property="og:site_name" content="Clean Tech Journal" />
      </head>
      <body>
        <article>
          <h1>New Fusion Reactor Prototype Surpasses Energy Breakeven</h1>
          <p>The Oxford facility confirmed sustainable net positive energy output over a 45-minute continuous reaction test.</p>
          <p>Industrial scale prototypes are slated for commercial grid pilot testing by 2028.</p>
        </article>
      </body>
    </html>
    """

    payload = {
        "url": "https://cleantechjournal.org/fusion-breakeven-2026",
        "html_content": html_content,
        "source_tier": 1,
    }

    response = client.post("/extract/url", json=payload)
    assert response.status_code == 200
    art = response.json()

    assert art["title"] == "New Fusion Reactor Prototype Surpasses Energy Breakeven"
    assert art["author"] == "Dr. Sarah Connor"
    assert art["source"] == "Clean Tech Journal"
    assert art["source_tier"] == 1
    assert "sustainable net positive energy output" in art["extracted_text"]
    assert len(art["content_hash"]) == 64

    # Check GET /articles endpoint
    get_resp = client.get("/articles?source=Clean Tech Journal")
    assert get_resp.status_code == 200
    articles_list = get_resp.json()
    assert len(articles_list) == 1
    assert articles_list[0]["id"] == art["id"]
