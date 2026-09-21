"""
Discovery Latency & Sequential Bottleneck Profiler (Audit Q10)
Measures exact timing (ms) for every subsystem on a live inquiry.
"""

import asyncio
import json
import os
import sys
import time
import httpx
from dotenv import load_dotenv

load_dotenv()
sys.stdout.reconfigure(encoding='utf-8')

from services.common.llm_router import llm_router
from services.common.db import db
from services.common.models import Article, MediaType
from datetime import datetime, timezone
import uuid
import hashlib

async def profile_investigation():
    query = "Breakthroughs in solid state battery technology 2026"
    print(f"Profiling Inquiry: '{query}'")
    
    # 1. DiscoveryPlanner LLM Timing
    t0 = time.perf_counter()
    plan = llm_router.plan_investigation(query, modality="text")
    t_plan = (time.perf_counter() - t0) * 1000
    print(f"1. DiscoveryPlanner LLM Latency: {t_plan:.1f} ms (Provider: {plan.get('llm_provider')})")

    # 2. Multi-Source Live Search Fanout Timing
    import importlib
    serper_mod = importlib.import_module("services.global-discovery.serper_adapter")
    serper_adapter = serper_mod.serper_adapter
    gdelt_mod = importlib.import_module("services.global-discovery.gdelt_adapter")
    gdelt_adapter = gdelt_mod.gdelt_adapter
    gd_main = importlib.import_module("services.global-discovery.main")
    GoogleNewsLiveDiscoveryAdapter = gd_main.GoogleNewsLiveDiscoveryAdapter
    WikipediaKnowledgeAdapter = gd_main.WikipediaKnowledgeAdapter
    HackerNewsDiscoveryAdapter = gd_main.HackerNewsDiscoveryAdapter
    YouTubeLiveDiscoveryAdapter = gd_main.YouTubeLiveDiscoveryAdapter
    DuckDuckGoWebNewsDiscoveryAdapter = gd_main.DuckDuckGoWebNewsDiscoveryAdapter
    query_google_factcheck_api = gd_main.query_google_factcheck_api

    search_queries = plan.get("search_queries", [query])[:3]
    
    t0 = time.perf_counter()
    tasks = [
        serper_adapter.search_news(search_queries, limit=10),
        serper_adapter.search_web(search_queries, limit=10),
        GoogleNewsLiveDiscoveryAdapter().search(search_queries, limit=10),
        WikipediaKnowledgeAdapter().search(search_queries[:2], limit=4),
        HackerNewsDiscoveryAdapter().search(search_queries[:2], limit=6),
        YouTubeLiveDiscoveryAdapter().search(search_queries[:2], limit=6),
        DuckDuckGoWebNewsDiscoveryAdapter().search(search_queries[:2], limit=8),
        gdelt_adapter.search(search_queries[:2], limit=6),
    ]
    adapter_results = await asyncio.gather(*tasks, return_exceptions=True)
    t_fanout = (time.perf_counter() - t0) * 1000
    
    all_candidates = []
    for r in adapter_results:
        if isinstance(r, list):
            all_candidates.extend(r)
    print(f"2. Multi-Source Search Fanout Latency: {t_fanout:.1f} ms (Retrieved {len(all_candidates)} candidates across 8 adapters)")

    # 3. Playwright Headless Scraping Timing
    from services.extraction.playwright_scraper import playwright_scraper
    scrape_targets = [c for c in all_candidates if len(c.get("snippet", "")) < 120 and "youtube.com" not in c.get("url", "")][:2]
    
    t0 = time.perf_counter()
    scraped_count = 0
    if scrape_targets:
        async def _scrape(t):
            try:
                res = await asyncio.wait_for(playwright_scraper.extract_page(t["url"]), timeout=4.0)
                if res.get("extracted_text"):
                    return True
            except Exception:
                pass
            return False
        res_list = await asyncio.gather(*[_scrape(t) for t in scrape_targets], return_exceptions=True)
        scraped_count = sum(1 for r in res_list if r is True)
    t_scrape = (time.perf_counter() - t0) * 1000
    print(f"3. Playwright Headless Browser Scraping Latency: {t_scrape:.1f} ms (Rendered {scraped_count} pages)")

    # 4. Fact Check API & Verification LLM Timing
    claim = plan.get("claim_hypothesis", query)
    
    t0 = time.perf_counter()
    fc_tasks = [
        query_google_factcheck_api(claim),
        serper_adapter.search_fact_check_registries(claim),
    ]
    fc_res = await asyncio.gather(*fc_tasks, return_exceptions=True)
    all_fc = []
    for f in fc_res:
        if isinstance(f, list):
            all_fc.extend(f)
    t_fc_api = (time.perf_counter() - t0) * 1000

    t0 = time.perf_counter()
    fact_verdict = llm_router.evaluate_claim_consensus(
        claim=claim,
        sources=all_candidates,
        fact_check_matches=all_fc
    )
    t_fc_llm = (time.perf_counter() - t0) * 1000
    print(f"4. Fact-Checking API Latency: {t_fc_api:.1f} ms | Verification LLM Latency: {t_fc_llm:.1f} ms (Verdict: {fact_verdict.get('verdict')})")

    # 5. Master Synthesis LLM Timing
    t0 = time.perf_counter()
    dossier = llm_router.synthesize_intelligence_dossier(
        query=query,
        input_modality="text",
        sources=all_candidates,
        fact_check_matches=all_fc,
        fact_verdict=fact_verdict,
        target_language="en",
        language_name="English",
    )
    t_synth = (time.perf_counter() - t0) * 1000
    print(f"5. Grounded Intelligence Synthesis LLM Latency: {t_synth:.1f} ms (Dossier Title: '{dossier.get('title')[:50]}...')")

    # 6. PostgreSQL Database Persistence Timing
    t0 = time.perf_counter()
    for c in all_candidates[:15]:
        title = c.get("title", "")
        url = c.get("url", "")
        content_hash = hashlib.sha256(f"{title}\n{url}".encode("utf-8")).hexdigest()
        art = Article(
            id=str(uuid.uuid4()),
            canonical_url=url,
            source=c.get("source", "web"),
            source_tier=c.get("source_tier", 2),
            title=title,
            content_hash=content_hash,
            published_at=datetime.now(timezone.utc),
            extracted_text=c.get("snippet") or f"Reporting on {title}.",
            media_type=MediaType.TEXT,
            language="en",
        )
        db.save_article(art)
    t_db = (time.perf_counter() - t0) * 1000
    print(f"6. PostgreSQL 18 Persistence Latency (15 articles): {t_db:.1f} ms")

    total_ms = t_plan + t_fanout + t_scrape + t_fc_api + t_fc_llm + t_synth + t_db
    print("-" * 60)
    print(f"TOTAL MEASURED LATENCY: {total_ms:.1f} ms ({total_ms / 1000:.2f} s)")
    print("LATENCY BREAKDOWN (%):")
    print(f" - Planning LLM:          {t_plan / total_ms * 100:5.1f}% ({t_plan:.0f} ms)")
    print(f" - Search Fanout (8 APIs):{t_fanout / total_ms * 100:5.1f}% ({t_fanout:.0f} ms)")
    print(f" - Playwright Scraping:   {t_scrape / total_ms * 100:5.1f}% ({t_scrape:.0f} ms)")
    print(f" - Fact Check (API+LLM):  {(t_fc_api + t_fc_llm) / total_ms * 100:5.1f}% ({(t_fc_api + t_fc_llm):.0f} ms)")
    print(f" - Synthesis LLM:         {t_synth / total_ms * 100:5.1f}% ({t_synth:.0f} ms)")
    print(f" - PostgreSQL Persistence: {t_db / total_ms * 100:5.1f}% ({t_db:.0f} ms)")

if __name__ == "__main__":
    asyncio.run(profile_investigation())
