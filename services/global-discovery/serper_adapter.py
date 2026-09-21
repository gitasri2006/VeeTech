"""
Discovery Serper.dev Google Search & News Discovery Adapter
Compliant with Requirement 1, 3, 4, 6 (Real-Time Live Web, News & Accredited Debunker Querying)
Integrates Google Serper API (/news and /search) with source tier credibility scoring.
"""

import asyncio
from datetime import datetime, timezone
import json
import logging
import os
from typing import Any, Dict, List, Optional
import urllib.parse
import urllib.request

logger = logging.getLogger("discovery.serper")


def classify_source_tier(domain_or_source: str, platform: str = "web") -> Dict[str, Any]:
    """
    Classifies sources into TRD-compliant Tier 1, Tier 2, or Tier 3 with credibility scoring.
    """
    dom = (domain_or_source or "").lower().strip()
    
    t1_keywords = [
        "wikipedia", "reuters", "apnews", "associated press", "bbc", "bloomberg", 
        "thehindu", "hindutamil", "nytimes", "wsj", "financial times", "cnbc", "pib.gov.in",
        "gov.in", ".gov", ".edu", ".ac.in", "nature.com", "science.org", "who.int",
        "altnews", "boomlive", "snopes", "factcheck.org", "politifact", "poynter"
    ]
    
    t2_keywords = [
        "techcrunch", "theverge", "wired", "arstechnica", "venturebeat",
        "technologyreview", "ndtv", "indianexpress", "hindustantimes", 
        "economictimes", "timesofindia", "aljazeera", "forbes", "fortune",
        "cnet", "theprint", "scroll.in", "vikatan", "dinamalar", "puthiyathalaimurai", 
        "news18", "aajtak", "dainikbhaskar", "theguardian", "lemonde", "spiegel"
    ]

    if any(k in dom for k in t1_keywords) or platform == "factcheck":
        return {
            "tier": 1,
            "tier_label": "Tier 1: High Authority News Wire / Academic / Fact Check",
            "credibility_score": 0.95,
            "tier_description": "Verified high-authority news agency, encyclopedic repository, or accredited fact-checking body."
        }
    elif any(k in dom for k in t2_keywords):
        return {
            "tier": 2,
            "tier_label": "Tier 2: Mainstream Press & Editorial Journalism",
            "credibility_score": 0.80,
            "tier_description": "Established commercial news publication with professional editorial standards and credited journalism."
        }
    else:
        return {
            "tier": 3,
            "tier_label": "Tier 3: Tech Community / Social Broadcast",
            "credibility_score": 0.65,
            "tier_description": "User-generated, social broadcast, or community discussion platform requiring contextual verification."
        }


def _extract_domain(url: str) -> str:
    try:
        parsed = urllib.parse.urlparse(url)
        netloc = parsed.netloc.lower()
        if netloc.startswith("www."):
            netloc = netloc[4:]
        return netloc.split(":")[0] if netloc else "web"
    except Exception:
        return "web"


class SerperDiscoveryAdapter:
    """Live Google News & Web Search Adapter powered by Serper.dev REST API."""
    name: str = "serper_live"

    def __init__(self):
        self.api_key = os.getenv("SERPER_API_KEY")

    def _get_api_key(self) -> Optional[str]:
        return os.getenv("SERPER_API_KEY") or self.api_key

    async def search_news(self, queries: List[str], limit: int = 15, target_language: str = "en") -> List[Dict[str, Any]]:
        """Query Google News via Serper API."""
        api_key = self._get_api_key()
        if not api_key or api_key == "your_serper_api_key_here":
            return []

        results = []
        loop = asyncio.get_event_loop()

        for q in queries:
            if not q or len(q.strip()) < 2:
                continue
            try:
                def _do_news_req(query_str: str):
                    url = "https://google.serper.dev/news"
                    payload = json.dumps({"q": query_str, "num": 10, "gl": "in" if target_language in ["hi", "ta", "te", "kn", "ml"] else "us"}).encode("utf-8")
                    req = urllib.request.Request(
                        url,
                        data=payload,
                        headers={
                            "X-API-KEY": api_key,
                            "Content-Type": "application/json",
                            "User-Agent": "Discovery/2.0"
                        }
                    )
                    with urllib.request.urlopen(req, timeout=6) as resp:
                        return json.loads(resp.read().decode("utf-8"))

                data = await loop.run_in_executor(None, lambda: _do_news_req(q))
                for item in data.get("news", []):
                    title = item.get("title")
                    link = item.get("link")
                    snippet = item.get("snippet", "")
                    source = item.get("source", "")
                    date_str = item.get("date", "")
                    domain = _extract_domain(link)
                    display_source = source or domain or "Google News"
                    tier_info = classify_source_tier(display_source, "web")

                    if title and link:
                        results.append({
                            "url": link,
                            "title": title,
                            "source": display_source,
                            "domain": domain,
                            "platform": "web",
                            "discovered_at": datetime.now(timezone.utc).isoformat(),
                            "adapter": "serper_news",
                            "source_tier": tier_info["tier"],
                            "tier_label": tier_info["tier_label"],
                            "credibility_score": tier_info["credibility_score"],
                            "tier_description": tier_info["tier_description"],
                            "snippet": snippet or f"Live Google News reporting on {title}.",
                            "published_at_raw": date_str,
                            "image_url": item.get("imageUrl"),
                        })
            except Exception as exc:
                logger.debug("Serper News search notice for '%s': %s", q, exc)

        return results[:limit]

    async def search_web(self, queries: List[str], limit: int = 15, target_language: str = "en") -> List[Dict[str, Any]]:
        """Query Organic Google Web Search via Serper API."""
        api_key = self._get_api_key()
        if not api_key or api_key == "your_serper_api_key_here":
            return []

        results = []
        loop = asyncio.get_event_loop()

        for q in queries:
            if not q or len(q.strip()) < 2:
                continue
            try:
                def _do_web_req(query_str: str):
                    url = "https://google.serper.dev/search"
                    payload = json.dumps({"q": query_str, "num": 10}).encode("utf-8")
                    req = urllib.request.Request(
                        url,
                        data=payload,
                        headers={
                            "X-API-KEY": api_key,
                            "Content-Type": "application/json",
                            "User-Agent": "Discovery/2.0"
                        }
                    )
                    with urllib.request.urlopen(req, timeout=6) as resp:
                        return json.loads(resp.read().decode("utf-8"))

                data = await loop.run_in_executor(None, lambda: _do_web_req(q))
                
                # Check Knowledge Graph
                kg = data.get("knowledgeGraph")
                if kg and kg.get("title") and kg.get("description"):
                    results.append({
                        "url": kg.get("website") or kg.get("descriptionUrl") or f"https://www.google.com/search?q={urllib.parse.quote(q)}",
                        "title": f"Verified Entity: {kg.get('title')} ({kg.get('type', 'Official Profile')})",
                        "source": kg.get("descriptionSource", "Knowledge Graph"),
                        "domain": "google.com",
                        "platform": "web",
                        "discovered_at": datetime.now(timezone.utc).isoformat(),
                        "adapter": "serper_knowledge_graph",
                        "source_tier": 1,
                        "tier_label": "Tier 1: Verified Knowledge Graph",
                        "credibility_score": 0.98,
                        "tier_description": "Authoritative entity knowledge card.",
                        "snippet": kg.get("description"),
                        "published_at_raw": datetime.now(timezone.utc).strftime("%a, %d %b %Y %H:%M:%S GMT"),
                    })

                # Organic Results
                for item in data.get("organic", []):
                    title = item.get("title")
                    link = item.get("link")
                    snippet = item.get("snippet", "")
                    domain = _extract_domain(link)
                    tier_info = classify_source_tier(domain, "web")

                    if title and link:
                        results.append({
                            "url": link,
                            "title": title,
                            "source": domain.title(),
                            "domain": domain,
                            "platform": "web",
                            "discovered_at": datetime.now(timezone.utc).isoformat(),
                            "adapter": "serper_web",
                            "source_tier": tier_info["tier"],
                            "tier_label": tier_info["tier_label"],
                            "credibility_score": tier_info["credibility_score"],
                            "tier_description": tier_info["tier_description"],
                            "snippet": snippet,
                            "published_at_raw": datetime.now(timezone.utc).strftime("%a, %d %b %Y %H:%M:%S GMT"),
                        })
            except Exception as exc:
                logger.debug("Serper Web search notice for '%s': %s", q, exc)

        return results[:limit]

    async def search_fact_check_registries(self, claim_or_topic: str) -> List[Dict[str, Any]]:
        """
        Search accredited fact-checking repositories (Snopes, Alt News, BOOM Live, FactCheck.org, Politifact, PIB)
        for explicit debunking or verification coverage of the claim.
        """
        api_key = self._get_api_key()
        if not api_key or api_key == "your_serper_api_key_here":
            return []

        search_q = f"(site:snopes.com OR site:altnews.in OR site:boomlive.in OR site:factcheck.org OR site:politifact.com OR site:pib.gov.in) {claim_or_topic}"
        loop = asyncio.get_event_loop()
        try:
            def _do_fc_req():
                url = "https://google.serper.dev/search"
                payload = json.dumps({"q": search_q, "num": 8}).encode("utf-8")
                req = urllib.request.Request(
                    url,
                    data=payload,
                    headers={
                        "X-API-KEY": api_key,
                        "Content-Type": "application/json",
                        "User-Agent": "Discovery/2.0"
                    }
                )
                with urllib.request.urlopen(req, timeout=6) as resp:
                    return json.loads(resp.read().decode("utf-8"))

            data = await loop.run_in_executor(None, _do_fc_req)
            fc_records = []
            for item in data.get("organic", []):
                title = item.get("title", "")
                link = item.get("link", "")
                snippet = item.get("snippet", "")
                domain = _extract_domain(link)

                # Classify rating
                rating = "Fact Checked"
                snip_lower = (title + " " + snippet).lower()
                if any(w in snip_lower for w in ["false", "fake", "hoax", "misleading", "fabricated", "untrue"]):
                    rating = "False / Fabricated"
                elif any(w in snip_lower for w in ["true", "correct", "verified", "confirmed"]):
                    rating = "True / Confirmed"
                elif any(w in snip_lower for w in ["disputed", "misleading context", "half true", "unproven"]):
                    rating = "Disputed / Misleading Context"

                fc_records.append({
                    "claim": claim_or_topic,
                    "claimant": "Public / Social Media Claim",
                    "fact_checker": domain.title(),
                    "rating": rating,
                    "url": link,
                    "title": title,
                    "snippet": snippet,
                    "review_date": datetime.now(timezone.utc).isoformat(),
                })
            return fc_records
        except Exception as exc:
            logger.debug("Serper Fact Check query notice: %s", exc)
            return []


# Global Serper Adapter
serper_adapter = SerperDiscoveryAdapter()
