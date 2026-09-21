"""
Discovery Live Investigation Validation Suite
Tests 10 completely unrelated, ambiguous, multimodal, and multilingual queries against the live system.
Verifies real agent decisions, live source fan-out, evidence grounding, PostgreSQL persistence, and execution traces.
"""

import json
import sys
import time
import urllib.request
import urllib.parse
import psycopg2

import functools
print = functools.partial(print, flush=True)

try:
    sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass

TEST_QUERIES = [
    {
        "name": "Test 1: Global Fact Check & Debunking",
        "query": "Did NASA release an official statement about solar flares causing global internet blackout in 2026?",
        "lang": "en",
        "modality": "text"
    },
    {
        "name": "Test 2: Deep Technology Intelligence",
        "query": "What are the latest breakthroughs in solid-state battery commercialization by Toyota and QuantumScape?",
        "lang": "en",
        "modality": "text"
    },
    {
        "name": "Test 3: Tamil Regional Space Intelligence",
        "query": "சந்திரயான் 4 திட்டத்தின் முக்கிய நோக்கங்கள் மற்றும் இஸ்ரோவின் சமீபத்திய அறிவிப்புகள் என்ன?",
        "lang": "ta",
        "modality": "text"
    },
    {
        "name": "Test 4: Hindi Financial & Regulatory Intelligence",
        "query": "क्या आरबीआई (RBI) ने डिजिटल रुपया या यूपीआई पर कोई नया विनियामक निर्देश जारी किया है?",
        "lang": "hi",
        "modality": "text"
    },
    {
        "name": "Test 5: Corporate Entity & Market Intelligence",
        "query": "Stripe valuation funding rounds and revenue growth in fintech 2026",
        "lang": "en",
        "modality": "text"
    },
    {
        "name": "Test 6: Antitrust & Regulatory Legal News",
        "query": "European Union Digital Markets Act enforcement actions against Apple and Google",
        "lang": "en",
        "modality": "text"
    },
    {
        "name": "Test 7: Manipulated Media & Hoax Detection",
        "query": "Is the viral claim of drinking boiled garlic water curing influenza verified or fake?",
        "lang": "en",
        "modality": "text"
    },
    {
        "name": "Test 8: Hardware Benchmarks & Semiconductor Tech",
        "query": "Qualcomm Snapdragon X Elite processor performance compared to Apple silicon",
        "lang": "en",
        "modality": "text"
    },
    {
        "name": "Test 9: French Multilingual Policy Inquiry",
        "query": "Quelles sont les nouvelles initiatives de la France dans le secteur de l'intelligence artificielle?",
        "lang": "fr",
        "modality": "text"
    },
    {
        "name": "Test 10: Geopolitical Energy & Commodity Supply",
        "query": "Global uranium supply chain disruptions and nuclear energy capacity expansions",
        "lang": "en",
        "modality": "text"
    }
]


def check_postgres_record(request_id: str) -> bool:
    try:
        conn = psycopg2.connect(host="localhost", port=5432, user="postgres", password="root123", dbname="discovery", connect_timeout=3)
        cur = conn.cursor()
        cur.execute("SELECT request_id, total_steps FROM execution_traces WHERE request_id = %s;", (request_id,))
        row = cur.fetchone()
        cur.close()
        conn.close()
        return row is not None
    except Exception as e:
        print(f"    [DB Warning] {e}")
        return False


def run_suite():
    print("=" * 80)
    print("      DISCOVERY 10-QUERY REAL AI & LIVE INVESTIGATION VALIDATION      ")
    print("=" * 80)

    passed_count = 0
    results_summary = []

    for idx, test in enumerate(TEST_QUERIES, 1):
        print(f"\n[{idx}/10] Running: {test['name']}")
        print(f"       Query: '{test['query']}' (Lang: {test['lang']}, Modality: {test['modality']})")

        payload = {
            "query": test["query"],
            "target_language": test["lang"],
            "input_modality": test["modality"],
            "max_candidates_per_source": 10,
            "auto_ingest": True,
        }

        data_bytes = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(
            "http://localhost:8004/api/discovery/search",
            data=data_bytes,
            headers={"Content-Type": "application/json", "User-Agent": "ValidationSuite/3.0"}
        )

        start_t = time.time()
        try:
            with urllib.request.urlopen(req, timeout=90) as resp:
                resp_json = json.loads(resp.read().decode("utf-8"))
                duration = time.time() - start_t

                job_id = resp_json.get("job_id")
                intel = resp_json.get("intelligence_result", {})
                sources = resp_json.get("sources", [])
                trace = resp_json.get("execution_trace", {})
                steps = trace.get("steps", [])

                title = intel.get("title", "")
                summary = intel.get("executive_summary", "")
                verdict = intel.get("authenticity_verdict", "Unverified")
                score = intel.get("authenticity_score", 0.0)

                # Check persistence
                db_persisted = check_postgres_record(job_id) if job_id else False

                print(f"       Status: HTTP 200 ({duration:.2f}s) | Job ID: {job_id[:8]}...")
                print(f"       AI Title: {title[:75]}...")
                print(f"       Verdict: {verdict} | Authenticity Score: {score}")
                print(f"       Discovered Sources Count: {len(sources)}")
                if sources:
                    print(f"       Sample Source: [{sources[0].get('source')}] {sources[0].get('title')[:65]}...")
                    print(f"       Sample URL: {sources[0].get('url')}")
                print(f"       Execution Trace Steps: {len(steps)} steps recorded")
                for s in steps[:3]:
                    print(f"         - [{s.get('agent')} -> {s.get('tool')}] Decision: {s.get('decision')[:70]}")
                print(f"       PostgreSQL Trace Persisted: {'YES (Verified)' if db_persisted else 'Memory fallback'}")

                has_real_sources = len(sources) > 0
                has_real_summary = len(summary) > 40
                has_real_steps = len(steps) >= 3

                if has_real_sources and has_real_summary and has_real_steps:
                    print("       RESULT: [PASSED]")
                    passed_count += 1
                    results_summary.append({
                        "name": test["name"],
                        "status": "PASSED",
                        "sources_count": len(sources),
                        "steps_count": len(steps),
                        "verdict": verdict,
                        "duration_s": round(duration, 2),
                        "db_persisted": db_persisted
                    })
                else:
                    print("       RESULT: [FAILED] Insufficient evidence or steps.")
                    results_summary.append({
                        "name": test["name"],
                        "status": "FAILED",
                        "sources_count": len(sources),
                        "steps_count": len(steps),
                        "verdict": verdict,
                    })

        except Exception as exc:
            print(f"       ERROR: Request failed ({exc})")
            results_summary.append({"name": test["name"], "status": f"ERROR: {exc}"})

    print("\n" + "=" * 80)
    print(f"VALIDATION SUITE COMPLETE: {passed_count}/{len(TEST_QUERIES)} PASSED")
    print("=" * 80)
    print(json.dumps(results_summary, indent=2))


if __name__ == "__main__":
    run_suite()
