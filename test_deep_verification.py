import os
import sys
import time
import json
import psycopg2
import requests
from dotenv import load_dotenv

sys.stdout.reconfigure(encoding='utf-8')
load_dotenv()

PG_HOST = os.getenv("POSTGRES_HOST", "localhost")
PG_PORT = int(os.getenv("POSTGRES_PORT", 5432))
PG_DB = os.getenv("POSTGRES_DB", "discovery")
PG_USER = os.getenv("POSTGRES_USER", "postgres")
PG_PASS = os.getenv("POSTGRES_PASSWORD", "Gayu@300116")

SERVICES = {
    "extraction": "http://localhost:8000",
    "filtering": "http://localhost:8001",
    "entity_profile": "http://localhost:8002",
    "contextual_validation": "http://localhost:8003",
    "discovery": "http://localhost:8004",
    "multilingual": "http://localhost:8005",
    "factcheck": "http://localhost:8006",
    "sources": "http://localhost:8007",
    "whatsapp": "http://localhost:8008",
    "briefs": "http://localhost:8009",
}

def get_db_conn():
    return psycopg2.connect(
        host=PG_HOST,
        port=PG_PORT,
        dbname=PG_DB,
        user=PG_USER,
        password=PG_PASS
    )

def test_services_health():
    print("=== 1. MICROSERVICES HEALTH & DATABASE CHECK ===")
    results = {}
    for name, base_url in SERVICES.items():
        try:
            t0 = time.time()
            r = requests.get(f"{base_url}/health", timeout=5)
            lat = round((time.time() - t0) * 1000, 2)
            results[name] = {"status": r.status_code, "data": r.json() if r.status_code == 200 else r.text, "latency_ms": lat}
            print(f"[{name}] Port: {base_url.split(':')[-1]} | Status: {r.status_code} ({lat}ms)")
        except Exception as e:
            results[name] = {"status": "ERROR", "error": str(e)}
            print(f"[{name}] Port: {base_url.split(':')[-1]} | FAILED: {e}")
    return results

def test_query_e2e(query, target_lang="en", modality="text"):
    t0 = time.time()
    payload = {
        "query": query,
        "keywords": [query],
        "input_modality": modality,
        "target_language": target_lang,
        "max_candidates_per_source": 10,
        "auto_ingest": True
    }
    try:
        r = requests.post(f"{SERVICES['discovery']}/api/v1/discovery/search", json=payload, timeout=45)
        dur = round((time.time() - t0) * 1000, 2)
        if r.status_code == 200:
            data = r.json()
            sources = data.get("sources", [])
            return {
                "success": True,
                "status": r.status_code,
                "latency_ms": dur,
                "query": query,
                "target_language": target_lang,
                "candidates_count": data.get("candidates_count", len(sources)),
                "sources": sources[:5],
                "first_3_urls": [s.get("url") for s in sources[:3]],
                "first_3_titles": [s.get("title") for s in sources[:3]],
                "expanded_queries": data.get("expanded_queries", []),
                "verdict": data.get("intelligence_result", {}).get("authenticity_verdict"),
                "summary": data.get("intelligence_result", {}).get("executive_summary", "")[:200]
            }
        else:
            return {"success": False, "status": r.status_code, "error": r.text, "latency_ms": dur, "candidates_count": 0}
    except Exception as e:
        dur = round((time.time() - t0) * 1000, 2)
        return {"success": False, "status": 500, "error": str(e), "latency_ms": dur, "candidates_count": 0}

def test_database_duplicates():
    print("\n=== 2. DATABASE DUPLICATE CANONICAL URL CHECK ===")
    conn = get_db_conn()
    cur = conn.cursor()
    cur.execute("""
        SELECT canonical_url, COUNT(*)
        FROM articles
        GROUP BY canonical_url
        HAVING COUNT(*) > 1;
    """)
    duplicates = cur.fetchall()
    
    cur.execute("SELECT COUNT(*) FROM articles;")
    total_articles = cur.fetchone()[0]
    
    cur.execute("""
        SELECT id, title, canonical_url, source, published_at, content_hash
        FROM articles
        ORDER BY published_at DESC
        LIMIT 5;
    """)
    latest_articles = cur.fetchall()
    
    cur.close()
    conn.close()
    
    print(f"Total Persistent Articles in PostgreSQL: {total_articles}")
    print(f"Duplicate Canonical URLs Found: {len(duplicates)}")
    if duplicates:
        for dup in duplicates:
            print(f"  Duplicate: {dup[0]} (Count: {dup[1]})")
    else:
        print("  -> PASSED: 0 duplicate canonical URLs in PostgreSQL.")
        
    return {"total": total_articles, "duplicates_count": len(duplicates), "latest": latest_articles}

def test_triplicate_search(query="Tesla"):
    print(f"\n=== 3. TRIPLICATE SEARCH TEST ('{query}') ===")
    counts_before = test_database_duplicates()["total"]
    
    for i in range(1, 4):
        print(f"Executing search #{i} for '{query}'...")
        res = test_query_e2e(query)
        cnt = res.get("candidates_count", 0)
        stat = res.get("status")
        lat = res.get("latency_ms", 0)
        print(f"  Run #{i}: {cnt} candidates discovered, Status: {stat} in {lat}ms")
        time.sleep(1)
        
    db_status = test_database_duplicates()
    print(f"Articles before triplicate search: {counts_before}")
    print(f"Articles after triplicate search: {db_status['total']}")
    print(f"Duplicates count: {db_status['duplicates_count']}")

def test_all_five_queries():
    print("\n=== 4. TESTING 5 DISTINCT QUERIES FOR RELEVANCE ===")
    queries = [
        "Tesla",
        "NVIDIA",
        "ISRO",
        "OpenAI",
        "CompletelyRandomKeywordXYZ987654"
    ]
    results = {}
    for q in queries:
        res = test_query_e2e(q)
        results[q] = res
        print(f"\nQuery: '{q}'")
        print(f"  Status: {res.get('status')} | Latency: {res.get('latency_ms')}ms")
        print(f"  Candidates Found: {res.get('candidates_count')}")
        print(f"  First 3 Titles:")
        for t in res.get("first_3_titles", []):
            print(f"    - {t}")
        print(f"  First 3 URLs:")
        for u in res.get("first_3_urls", []):
            print(f"    - {u}")
        print(f"  Summary snippet: {res.get('summary')}")
    return results

def test_multilingual():
    print("\n=== 5. TESTING MULTILINGUAL PROCESSING (English, Tamil, Hindi) ===")
    langs = [
        ("Tesla Electric Vehicles", "en", "English"),
        ("விண்வெளி ஆராய்ச்சி மற்றும் இஸ்ரோ திட்டங்கள்", "ta", "Tamil"),
        ("कृत्रिम बुद्धिमत्ता और भारत में तकनीकी विकास", "hi", "Hindi")
    ]
    results = {}
    for text, code, name in langs:
        res = test_query_e2e(text, target_lang=code)
        results[name] = res
        print(f"\nLanguage: {name} ({code}) | Input: '{text}'")
        print(f"  Candidates: {res.get('candidates_count')} | Latency: {res.get('latency_ms')}ms")
        print(f"  Summary: {res.get('summary')}")
    return results

def test_human_review_queue():
    print("\n=== 6. TESTING HUMAN REVIEW QUEUE IN FACT CHECKING ===")
    try:
        r = requests.get(f"{SERVICES['factcheck']}/factcheck/queue", timeout=5)
        print(f"Fact Check Review Queue Status: {r.status_code}")
        if r.status_code == 200:
            queue = r.json()
            print(f"Pending Disputed / Likely False Claims in Queue: {len(queue)}")
            for item in queue[:3]:
                print(f"  - Claim ID: {item.get('id')}, Verdict: {item.get('verdict')}, Score: {item.get('authenticity_score')}")
    except Exception as e:
        print(f"Human review queue check failed: {e}")

if __name__ == "__main__":
    time.sleep(2)
    test_services_health()
    test_database_duplicates()
    test_triplicate_search("Tesla")
    q_results = test_all_five_queries()
    m_results = test_multilingual()
    test_human_review_queue()
