"""
Unit Tests for VeriScope Phase 2 Global Discovery Agent
Tests: Query expansion, Multi-adapter fan-out, URL deduplication, and Candidate publishing
"""

from datetime import datetime, timezone
import pytest

from services.common.db import db
from services.common.models import Entity
from services.registry import get_global_discovery_service

discovery_mod = get_global_discovery_service()


@pytest.fixture(autouse=True)
def clean_discovery_state():
    discovery_mod.seen_urls_cache.clear()
    discovery_mod.discovery_jobs.clear()
    db.entities.clear()
    yield
    discovery_mod.seen_urls_cache.clear()
    discovery_mod.discovery_jobs.clear()
    db.entities.clear()


def test_query_expansion_with_entity():
    entity = Entity(
        name="Infosys",
        aliases=["Infosys Ltd", "INFY"],
        seed_terms=["cloud transformation", "Topaz AI", "IT services"],
    )
    db.save_entity(entity)

    expanded = discovery_mod.expand_queries(keywords=["quarterly results"], entity=entity)
    assert "quarterly results" in expanded
    assert "Infosys" in expanded
    assert "INFY" in expanded
    assert any("Topaz AI" in q for q in expanded)


def test_query_expansion_bare_keywords_only():
    expanded = discovery_mod.expand_queries(keywords=["fintech unicorn", "payment gateway"], entity=None)
    assert "fintech unicorn" in expanded
    assert "payment gateway" in expanded
    assert len(expanded) == 2


@pytest.mark.asyncio
async def test_execute_discovery_fan_out_and_deduplication():
    # 1. First execution
    res1 = await discovery_mod.execute_discovery(keywords=["quantum computing"], limit=5)
    assert res1["status"] == "completed"
    assert res1["candidates_count"] > 0
    initial_count = res1["candidates_count"]
    assert len(res1["candidates"]) == initial_count

    # Check platforms found
    platforms = {c["platform"] for c in res1["candidates"]}
    assert "web" in platforms or "youtube" in platforms or "x" in platforms

    # 2. Second execution with identical keywords (deduplication should yield 0 new candidates)
    res2 = await discovery_mod.execute_discovery(keywords=["quantum computing"], limit=5)
    assert res2["candidates_count"] == 0
    assert len(res2["candidates"]) == 0
