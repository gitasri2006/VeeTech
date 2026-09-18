"""
Unit Tests for VeriScope Phase 0 Extraction & Filtering Rule Evaluator
Compliant with PRD Section 14 (Phase 0) & TRD Section 10
"""

from datetime import datetime, timedelta, timezone
import pytest

from services.common.models import Article, Rule, MediaType
from services.extraction.main import (
    compute_content_hash,
    extract_domain,
    extract_static_html,
    parse_rss_with_xml_fallback,
    should_use_browser_fallback,
)
from services.filtering.rule_evaluator import (
    RuleEvaluator,
    parse_recency_window_hours,
)


SAMPLE_RSS_XML = """<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0">
<channel>
  <title>TechWire News Feed</title>
  <link>https://techwire.example.com</link>
  <description>Latest enterprise AI and semiconductor announcements</description>
  <item>
    <title>Quantum Silicon Unveils Next-Gen 3nm Neural Processing Unit</title>
    <link>https://techwire.example.com/articles/quantum-silicon-npu</link>
    <description><![CDATA[<p>Quantum Silicon announced their newest 3nm architecture designed specifically for local inference in autonomous robotics.</p>]]></description>
    <author>Jane Doe</author>
    <pubDate>Thu, 18 Sep 2026 08:30:00 GMT</pubDate>
  </item>
  <item>
    <title>Global Clean Energy Consortium Receives $500M Grant</title>
    <link>https://techwire.example.com/articles/clean-energy-grant</link>
    <description>Governments across Europe and North America have pledged $500M to scale up grid storage.</description>
    <pubDate>Wed, 17 Sep 2026 14:15:00 GMT</pubDate>
  </item>
</channel>
</rss>
"""

SAMPLE_ATOM_XML = """<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>VeriScope Dispatch</title>
  <link href="https://dispatch.veriscope.ai"/>
  <updated>2026-09-18T10:00:00Z</updated>
  <entry>
    <title>Autonomous Drones Complete 10,000 Delivery Test Flights</title>
    <link href="https://dispatch.veriscope.ai/posts/drone-test-flights"/>
    <id>urn:uuid:12345-atom-drone-test</id>
    <updated>2026-09-18T09:00:00Z</updated>
    <summary>Flight test operations across three continents validated long-range fail-safes.</summary>
  </entry>
</feed>
"""

SAMPLE_HTML_PAGE = """<!DOCTYPE html>
<html>
<head>
  <title>VeriScope Breakthrough in Multilingual Disambiguation</title>
  <meta property="og:title" content="VeriScope Breakthrough in Multilingual Disambiguation" />
  <meta property="og:site_name" content="AI Research Daily" />
  <meta name="author" content="Dr. Alan Turing" />
  <meta property="article:published_time" content="2026-09-18T07:00:00Z" />
</head>
<body>
  <nav><a href="/">Home</a><a href="/about">About</a></nav>
  <header><h1>Header Navigation</h1></header>
  <article>
    <h1>VeriScope Breakthrough in Multilingual Disambiguation</h1>
    <p class="byline">By Dr. Alan Turing</p>
    <p>Researchers have introduced an intelligent cross-lingual matching framework that operates across twelve Indic languages and ten international languages.</p>
    <p>The framework avoids costly full LLM translation passes by utilizing deterministic rule gates combined with 768-dimensional multilingual embeddings.</p>
  </article>
  <footer><p>Copyright 2026 AI Research Daily. All rights reserved.</p></footer>
</body>
</html>
"""


def test_compute_content_hash_deterministic():
    text1 = "Quantum Silicon announced their newest 3nm architecture."
    title1 = "Quantum Silicon Unveils Next-Gen NPU"

    text2 = "  Quantum   Silicon announced   their newest 3nm architecture.  \n"
    title2 = " Quantum Silicon Unveils Next-Gen NPU "

    hash1 = compute_content_hash(text1, title1)
    hash2 = compute_content_hash(text2, title2)

    assert len(hash1) == 64
    assert hash1 == hash2


def test_extract_domain():
    assert extract_domain("https://www.reuters.com/business/tech") == "reuters.com"
    assert extract_domain("http://boomlive.in/fact-check") == "boomlive.in"
    assert extract_domain("https://subdomain.timesofindia.indiatimes.com:8080/news") == "subdomain.timesofindia.indiatimes.com"
    assert extract_domain("") == "unknown"


def test_parse_rss_feed():
    items = parse_rss_with_xml_fallback(SAMPLE_RSS_XML, default_source="TechWire")
    assert len(items) == 2
    
    first = items[0]
    assert first["title"] == "Quantum Silicon Unveils Next-Gen 3nm Neural Processing Unit"
    assert first["canonical_url"] == "https://techwire.example.com/articles/quantum-silicon-npu"
    assert "Quantum Silicon announced" in first["extracted_text"]
    assert first["author"] == "Jane Doe"


def test_parse_atom_feed():
    items = parse_rss_with_xml_fallback(SAMPLE_ATOM_XML, default_source="VeriScope Dispatch")
    assert len(items) == 1
    item = items[0]
    assert item["title"] == "Autonomous Drones Complete 10,000 Delivery Test Flights"
    assert item["canonical_url"] == "https://dispatch.veriscope.ai/posts/drone-test-flights"
    assert "Flight test operations" in item["extracted_text"]


def test_extract_static_html():
    result = extract_static_html(SAMPLE_HTML_PAGE, url="https://airesearchdaily.com/breakthrough")
    assert result["title"] == "VeriScope Breakthrough in Multilingual Disambiguation"
    assert result["author"] == "Dr. Alan Turing"
    assert result["source"] == "AI Research Daily"
    assert "cross-lingual matching framework" in result["extracted_text"]
    assert "Copyright 2026" not in result["extracted_text"]
    assert "Header Navigation" not in result["extracted_text"]


def test_browser_fallback_detection():
    spa_html = """<html><body><div id="root"></div><script src="/bundle.js"></script></body></html>"""
    assert should_use_browser_fallback(spa_html, text_content="") is True

    normal_html = "<html><body><p>This is standard server-rendered content with substantial text.</p></body></html>"
    assert should_use_browser_fallback(normal_html, text_content="This is standard server-rendered content with substantial text.") is False


def test_parse_recency_window_hours():
    assert parse_recency_window_hours("24h") == 24.0
    assert parse_recency_window_hours("48h") == 48.0
    assert parse_recency_window_hours("7d") == 168.0
    assert parse_recency_window_hours("1w") == 168.0
    assert parse_recency_window_hours("30d") == 720.0
    assert parse_recency_window_hours("") == 720.0


def test_rule_evaluator_all_pass():
    ref_time = datetime(2026, 9, 18, 12, 0, tzinfo=timezone.utc)
    article = Article(
        canonical_url="https://reuters.com/tech-news",
        source="reuters.com",
        source_tier=1,
        title="Acme Corp Launches Next-Gen AI Platform in India",
        published_at=ref_time - timedelta(hours=6),
        language="en",
        extracted_text="Acme Corp today announced the launch of its enterprise AI suite with high performance benchmarks.",
    )

    rule = Rule(
        recency_window="24h",
        min_source_tier=2,
        boolean_terms={"must_include": ["Acme Corp", "AI"], "must_not_include": ["sports", "cricket"]},
        language_filter={"allowed_languages": ["en", "hi"]},
        domain_rules={"allowed_domains": ["reuters.com"], "blocked_domains": ["scam.xyz"]},
    )

    result = RuleEvaluator.evaluate(article, rule, reference_time=ref_time)
    assert result.passed is True
    assert len(result.failed_checks) == 0


def test_rule_evaluator_recency_failure():
    ref_time = datetime(2026, 9, 18, 12, 0, tzinfo=timezone.utc)
    article = Article(
        canonical_url="https://reuters.com/old-news",
        source="reuters.com",
        source_tier=1,
        title="Old Semiconductor News",
        published_at=ref_time - timedelta(days=5),
        extracted_text="Semiconductor manufacturing report from last week.",
    )
    rule = Rule(recency_window="48h")

    result = RuleEvaluator.evaluate(article, rule, reference_time=ref_time)
    assert result.passed is False
    assert "recency" in result.failed_checks


def test_rule_evaluator_tier_and_blocked_domain_failure():
    ref_time = datetime(2026, 9, 18, 12, 0, tzinfo=timezone.utc)
    article = Article(
        canonical_url="https://clickbait.xyz/rumor",
        source="clickbait.xyz",
        source_tier=3,
        title="Unverified Rumor",
        published_at=ref_time - timedelta(hours=1),
        extracted_text="Anonymous leaks reveal unverified gossip.",
    )
    rule = Rule(
        min_source_tier=1,
        domain_rules={"blocked_domains": ["clickbait.xyz"]},
    )

    result = RuleEvaluator.evaluate(article, rule, reference_time=ref_time)
    assert result.passed is False
    assert "domain_tier" in result.failed_checks


def test_rule_evaluator_boolean_terms_must_include_and_exclude():
    ref_time = datetime(2026, 9, 18, 12, 0, tzinfo=timezone.utc)
    
    art1 = Article(
        canonical_url="https://news.com/1",
        source="news.com",
        title="General Technology Overview",
        published_at=ref_time,
        extracted_text="A broad review of computer software tools.",
    )
    rule1 = Rule(boolean_terms={"must_include": ["Robotics", "Autonomous"]})
    res1 = RuleEvaluator.evaluate(art1, rule1, reference_time=ref_time)
    assert res1.passed is False
    assert "boolean_terms" in res1.failed_checks

    art2 = Article(
        canonical_url="https://news.com/2",
        source="news.com",
        title="Robotics in Premier League Football Sports",
        published_at=ref_time,
        extracted_text="Autonomous robotics are now assisting referees in sports tournaments.",
    )
    rule2 = Rule(boolean_terms={"must_include": ["Robotics"], "must_not_include": ["sports", "football"]})
    res2 = RuleEvaluator.evaluate(art2, rule2, reference_time=ref_time)
    assert res2.passed is False
    assert "boolean_terms" in res2.failed_checks
