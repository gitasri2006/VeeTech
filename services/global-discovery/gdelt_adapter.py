"""
Discovery GDELT Project Global Ingestion Adapter
Compliant with Requirement 3, 7, 9 (Live Global Geopolitical, Media & Industry News Ingestion)
Queries GDELT 2.0 Global Knowledge Graph & Document API for real-time worldwide news coverage.
"""

import asyncio
from datetime import datetime, timezone
import json
import logging
import os
from typing import Any, Dict, List, Optional
import urllib.parse
import urllib.request

logger = logging.getLogger("discovery.gdelt")


class GDELTDiscoveryAdapter:
    """Queries GDELT 2.0 Document API for real-time global news monitoring."""
    name: str = "gdelt_live"

    def __init__(self):
        self.doc_api_url = os.getenv("GDELT_DOC_API_URL", "https://api.gdeltproject.org/api/v2/doc/doc")
        self.enabled = os.getenv("GDELT_ENABLED", "true").lower() == "true"
        self.timespan = os.getenv("GDELT_TIMESPAN", "24h")
        self.max_records = int(os.getenv("GDELT_MAX_RECORDS", "20"))

    async def search(self, queries: List[str], limit: int = 10, target_language: str = "en") -> List[Dict[str, Any]]:
        if not self.enabled:
            return []

        results = []
        loop = asyncio.get_event_loop()

        for q in queries:
            if not q or len(q.strip()) < 2:
                continue
            try:
                def _do_gdelt_req(search_term: str):
                    clean_term = re.sub(r'[^\w\s]', ' ', search_term).strip()
                    params = {
                        "query": f'"{clean_term}"' if " " in clean_term else clean_term,
                        "mode": "ArtList",
                        "maxrecords": str(min(limit, self.max_records)),
                        "format": "JSON",
                        "timespan": "7d",
                        "sort": "DateDesc",
                    }
                    url = f"https://api.gdeltproject.org/api/v2/doc/doc?{urllib.parse.urlencode(params)}"
                    req = urllib.request.Request(
                        url,
                        headers={"User-Agent": "Discovery/2.0"}
                    )
                    with urllib.request.urlopen(req, timeout=5) as resp:
                        return json.loads(resp.read().decode("utf-8"))

                data = await loop.run_in_executor(None, lambda: _do_gdelt_req(q))
                for item in data.get("articles", []):
                    title = item.get("title")
                    url = item.get("url")
                    source = item.get("domain", "GDELT Global News")
                    seendate = item.get("seendate")
                    language = item.get("language", "English")

                    if title and url:
                        results.append({
                            "url": url,
                            "title": title,
                            "source": source.title(),
                            "domain": item.get("domain", "gdeltproject.org"),
                            "platform": "web",
                            "discovered_at": datetime.now(timezone.utc).isoformat(),
                            "adapter": "gdelt_live",
                            "source_tier": 2,
                            "tier_label": "Tier 2: Global Monitored News",
                            "credibility_score": 0.80,
                            "tier_description": "Indexed by the GDELT Worldwide News Intelligence Project.",
                            "snippet": f"Global report: {title} (Language: {language}, Source: {source}).",
                            "published_at_raw": seendate,
                        })
            except Exception as exc:
                logger.debug("GDELT query notice for '%s': %s", q, exc)

        return results[:limit]


import re
gdelt_adapter = GDELTDiscoveryAdapter()
