"""
Discovery Runtime Architecture Audit & Empirical Verification Suite
Runs live diagnostic execution against the running runtime system.
"""

import asyncio
import json
import os
import re
import sys
import time
from typing import Any, Dict, List
import httpx
import psycopg2
from dotenv import load_dotenv

load_dotenv()
sys.stdout.reconfigure(encoding='utf-8')

GATEWAY_URL = "http://localhost:8004"

print("=" * 80)
print("       DISCOVERY RUNTIME ARCHITECTURE AUDIT & VERIFICATION       ")
print("=" * 80)

async def test_q1_chain():
    print("\n--- [AUDIT Q1] EXACT EXECUTION CHAIN FOR A FRESH QUERY ---")
    query = "Did OpenAI officially release a proprietary hardware desktop operating system in 2026?"
    start_t = time.perf_counter()
    async with httpx.AsyncClient(timeout=120.0) as client:
        resp = await client.post(f"{GATEWAY_URL}/api/discovery/search", json={
            "query": query,
            "input_modality": "text",
            "target_language": "en"
        })
    dur = time.perf_counter() - start_t
    print(f"HTTP Response: {resp.status_code} in {dur:.2f}s")
    if resp.status_code == 200:
        data = resp.json()
        print(f"Job ID: {data.get('job_id')}")
        print(f"1. Query: '{data.get('query')}'")
        trace = data.get("execution_trace", {})
        steps = trace.get("steps", [])
        for i, step in enumerate(steps, 1):
            print(f"\nStep {i}: Agent: [{step.get('agent')}] | Tool: [{step.get('tool')}]")
            print(f"   - Input: {json.dumps(step.get('input'))[:140]}...")
            print(f"   - Result: {step.get('result')[:140]}...")
            print(f"   - Decision/Reasoning: {step.get('decision')[:160]}...")
        
        intel = data.get("intelligence_result", {})
        print(f"\nFinal Answer Title: {intel.get('title')}")
        print(f"Verdict: {intel.get('authenticity_verdict')} (Score: {intel.get('authenticity_score')})")
        print(f"Evidence Sources Count: {len(data.get('sources', []))}")
        print(f"Executive Summary: {intel.get('executive_summary')[:200]}...")
        return data
    else:
        print("Failed to run Q1:", resp.text)
        return None

async def test_q3_adaptive():
    print("\n--- [AUDIT Q3] PROOF OF ADAPTIVE ACTION BASED ON SEARCH RESULTS ---")
    # Test a very obscure query that produces < 4 initial results to verify adaptive second-chance expansion
    obscure_query = "xyzk99128374 non-existent hypothetical tech project"
    async with httpx.AsyncClient(timeout=120.0) as client:
        resp = await client.post(f"{GATEWAY_URL}/api/discovery/search", json={
            "query": obscure_query,
            "input_modality": "text",
            "target_language": "en"
        })
    if resp.status_code == 200:
        data = resp.json()
        trace = data.get("execution_trace", {})
        steps = trace.get("steps", [])
        expansion_step = next((s for s in steps if s.get("agent") == "DiscoveryAgent" and s.get("tool") == "AdaptiveExpansion"), None)
        print(f"Query: '{obscure_query}'")
        print(f"Adaptive Expansion Triggered?: {expansion_step is not None}")
        if expansion_step:
            print(f"Expansion Input: {expansion_step.get('input')}")
            print(f"Expansion Result: {expansion_step.get('result')}")
            print(f"Expansion Decision: {expansion_step.get('decision')}")
        else:
            print("No expansion step triggered in trace; sources count was:", len(data.get("sources", [])))
    else:
        print("Failed adaptive test:", resp.text)

async def test_q4_unseen_10():
    print("\n--- [AUDIT Q4] 10 UNSEEN BENCHMARK QUERIES ---")
    queries = [
        {"id": 1, "type": "Ambiguous", "q": "Apple Titan project cancellation automotive", "lang": "en"},
        {"id": 2, "type": "Tamil Regional", "q": "தமிழ்நாட்டில் புதிய செமிகண்டக்டர் ஆலை திட்டம் பற்றிய அதிகாரப்பூர்வ அறிவிப்பு", "lang": "ta"},
        {"id": 3, "type": "Hindi Defense", "q": "भारतीय नौसेना के नए स्वदेशी विमानवाहक पोत का समुद्री परीक्षण", "lang": "hi"},
        {"id": 4, "type": "French AI Policy", "q": "Régulation européenne sur l'intelligence artificielle générative et conformité", "lang": "fr"},
        {"id": 5, "type": "Misinformation Debunk", "q": "Claim that drinking raw potato juice cures stomach ulcers", "lang": "en"},
        {"id": 6, "type": "Niche Biotech", "q": "CRISPR Cas12a diagnostic platforms for point-of-care infectious disease detection", "lang": "en"},
        {"id": 7, "type": "Commodities & Energy", "q": "European natural gas underground storage levels heading into winter 2026", "lang": "en"},
        {"id": 8, "type": "Breaking Tech Hardware", "q": "Nvidia Rubin GPU architecture release date and HBM4 memory specifications", "lang": "en"},
        {"id": 9, "type": "Regional EV Policy", "q": "Karnataka state electric vehicle battery recycling policy", "lang": "en"},
        {"id": 10, "type": "Obscure Viral Rumor", "q": "Did the Eiffel Tower close due to termite infestation in iron trusses?", "lang": "en"},
    ]

    results = []
    async with httpx.AsyncClient(timeout=120.0) as client:
        for item in queries:
            t0 = time.perf_counter()
            try:
                r = await client.post(f"{GATEWAY_URL}/api/discovery/search", json={
                    "query": item["q"],
                    "input_modality": "text",
                    "target_language": item["lang"]
                })
                lat = time.perf_counter() - t0
                if r.status_code == 200:
                    d = r.json()
                    intel = d.get("intelligence_result", {})
                    res_entry = {
                        "id": item["id"],
                        "type": item["type"],
                        "query": item["q"][:40] + "...",
                        "status": "PASS",
                        "latency_s": round(lat, 2),
                        "sources": len(d.get("sources", [])),
                        "verdict": intel.get("authenticity_verdict"),
                        "score": intel.get("authenticity_score"),
                        "headline": intel.get("title")[:60]
                    }
                else:
                    res_entry = {
                        "id": item["id"],
                        "type": item["type"],
                        "query": item["q"][:40] + "...",
                        "status": f"FAIL ({r.status_code})",
                        "latency_s": round(lat, 2),
                        "sources": 0,
                        "verdict": "N/A",
                        "score": 0.0,
                        "headline": "Error"
                    }
            except Exception as exc:
                res_entry = {
                    "id": item["id"],
                    "type": item["type"],
                    "query": item["q"][:40] + "...",
                    "status": f"ERROR: {str(exc)[:30]}",
                    "latency_s": round(time.perf_counter() - t0, 2),
                    "sources": 0,
                    "verdict": "N/A",
                    "score": 0.0,
                    "headline": "Exception"
                }
            results.append(res_entry)
            print(f"[{item['id']}/10] {item['type']} -> {res_entry['status']} ({res_entry['latency_s']}s) | Sources: {res_entry['sources']} | Verdict: {res_entry['verdict']} ({res_entry['score']})", flush=True)

    print("\nSummary of 10 Unseen Benchmark Queries:", flush=True)
    print(json.dumps(results, indent=2), flush=True)
    return results

def test_q8_embeddings():
    print("\n--- [AUDIT Q8] SEMANTIC RETRIEVAL & FILTERING AUDIT ---")
    from services.common.embeddings import get_embedding
    from services.common.db import cosine_similarity

    v1 = get_embedding("artificial intelligence chip hardware accelerator")
    v2 = get_embedding("AI neural processing unit silicon semiconductor")
    v3 = get_embedding("delicious chocolate cake recipe baking oven")

    sim_synonym = cosine_similarity(v1, v2)
    sim_unrelated = cosine_similarity(v1, v3)

    print(f"Vector Dimension: {len(v1)}")
    print(f"Cosine similarity (AI chips vs Neural Silicon - Synonyms): {sim_synonym:.4f}")
    print(f"Cosine similarity (AI chips vs Chocolate Cake - Unrelated): {sim_unrelated:.4f}")

    # Check if transformers model was used or hash vectorizer
    from services.common.embeddings import embedding_service
    embedding_service._lazy_init()
    has_tf = embedding_service._model is not None
    print(f"Active Vectorizer: {'SentenceTransformer (Neural)' if has_tf else 'Deterministic Hash N-Gram Vectorizer (Keyword/Bag-of-Words)'}")

def test_q9_code_audit():
    print("\n--- [AUDIT Q9] CODEBASE SCAN FOR MOCKS, HARDCODED BRANCHES & SEEDS ---")
    suspicious_patterns = [
        (r'if\s+[\'"].*?[\'"]\s+in\s+query', "query-specific if/else branch"),
        (r'if\s+query\s*==', "exact query comparison"),
        (r'mock_response', "mock response object"),
        (r'fake_data', "fake data reference"),
        (r'seed_articles', "seeded articles fallback"),
        (r'0\.85|0\.72|0\.94', "hardcoded score values"),
    ]

    findings = []
    for root, dirs, files in os.walk('.'):
        if any(d in root for d in ['node_modules', '.git', 'venv', '__pycache__', '.system_generated', 'dist']):
            continue
        for f in files:
            if f.endswith(('.py', '.sql')):
                path = os.path.join(root, f)
                try:
                    with open(path, 'r', encoding='utf-8', errors='ignore') as fp:
                        lines = fp.readlines()
                        for idx, line in enumerate(lines, 1):
                            for pat, desc in suspicious_patterns:
                                if re.search(pat, line):
                                    # filter out test files if desired or include everything
                                    findings.append({
                                        "file": path,
                                        "line": idx,
                                        "pattern": desc,
                                        "content": line.strip()
                                    })
                except Exception:
                    pass

    print(f"Total Suspicious / Fixed Pattern Matches Found: {len(findings)}")
    for f in findings[:15]:
        print(f"  {f['file']}:{f['line']} -> [{f['pattern']}] {f['content'][:90]}")
    return findings

async def main():
    await test_q1_chain()
    await test_q3_adaptive()
    test_q8_embeddings()
    test_q9_code_audit()
    await test_q4_unseen_10()

if __name__ == "__main__":
    asyncio.run(main())
