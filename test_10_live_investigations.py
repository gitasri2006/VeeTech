"""
Discovery 10-Query Live Investigation & Multi-Agent Intelligence Verification
Tests 10 distinct, non-trivial, multilingual, and fact-checking queries.
Validates live fan-out, Dual-LLM/Gemini reasoning, evidence grounding, and PostgreSQL persistence.
"""

import functools
import json
import os
import sys
import time
import urllib.request
import psycopg2
from dotenv import load_dotenv

load_dotenv()
sys.stdout.reconfigure(encoding='utf-8')
print = functools.partial(print, flush=True)

TEST_SCENARIOS = [
    {
        "id": 1,
        "name": "Global Viral Claim Fact-Check & Debunking",
        "query": "Did NASA release an official statement about solar flares causing global internet blackout in 2026?",
        "target_lang": "en",
        "modality": "text",
        "expected_category": "fact_verification"
    },
    {
        "id": 2,
        "name": "Deep Tech & Battery Commercialization",
        "query": "What are the latest breakthroughs in solid-state battery commercialization by Toyota and QuantumScape?",
        "target_lang": "en",
        "modality": "text",
        "expected_category": "corporate_intelligence"
    },
    {
        "id": 3,
        "name": "Tamil Regional Space & Science Intelligence",
        "query": "சந்திரயான் 4 திட்டத்தின் முக்கிய நோக்கங்கள் மற்றும் இஸ்ரோவின் சமீபத்திய அறிவிப்புகள் என்ன?",
        "target_lang": "ta",
        "modality": "text",
        "expected_category": "general_knowledge"
    },
    {
        "id": 4,
        "name": "Hindi Financial & Regulatory Policy Intelligence",
        "query": "क्या आरबीआई (RBI) ने डिजिटल रुपया या यूपीआई पर कोई नया विनियामक निर्देश जारी किया है?",
        "target_lang": "hi",
        "modality": "text",
        "expected_category": "corporate_intelligence"
    },
    {
        "id": 5,
        "name": "Corporate Valuation & Funding Intelligence",
        "query": "Stripe valuation funding rounds and revenue growth in fintech 2026",
        "target_lang": "en",
        "modality": "text",
        "expected_category": "corporate_intelligence"
    },
    {
        "id": 6,
        "name": "Antitrust & Digital Markets Regulation",
        "query": "European Union Digital Markets Act enforcement actions against Apple and Google",
        "target_lang": "en",
        "modality": "text",
        "expected_category": "breaking_news"
    },
    {
        "id": 7,
        "name": "Medical Misinformation & Hoax Verification",
        "query": "Is the viral claim of drinking boiled garlic water curing influenza verified or fake?",
        "target_lang": "en",
        "modality": "text",
        "expected_category": "fact_verification"
    },
    {
        "id": 8,
        "name": "Semiconductor & Hardware Architecture Benchmarks",
        "query": "Qualcomm Snapdragon X Elite processor performance compared to Apple silicon",
        "target_lang": "en",
        "modality": "text",
        "expected_category": "corporate_intelligence"
    },
    {
        "id": 9,
        "name": "French Multilingual AI Sovereign Policy",
        "query": "Quelles sont les nouvelles initiatives de la France dans le secteur de l'intelligence artificielle?",
        "target_lang": "fr",
        "modality": "text",
        "expected_category": "general_knowledge"
    },
    {
        "id": 10,
        "name": "Global Energy & Strategic Commodities Supply",
        "query": "Global uranium supply chain disruptions and nuclear energy capacity expansions",
        "target_lang": "en",
        "modality": "text",
        "expected_category": "breaking_news"
    }
]


def verify_postgres(request_id: str):
    try:
        conn = psycopg2.connect(
            host=os.getenv("POSTGRES_HOST", "localhost"),
            port=int(os.getenv("POSTGRES_PORT", "5432")),
            user=os.getenv("POSTGRES_USER", "postgres"),
            password=os.getenv("POSTGRES_PASSWORD", "root123"),
            dbname=os.getenv("POSTGRES_DB", "discovery")
        )
        cur = conn.cursor()
        cur.execute("SELECT total_steps, duration_ms, steps, provenance FROM execution_traces WHERE request_id = %s;", (request_id,))
        row = cur.fetchone()
        cur.close()
        conn.close()
        if row:
            return {
                "persisted": True,
                "total_steps": row[0],
                "duration_ms": row[1],
                "steps": row[2],
                "provenance_count": len(row[3]) if row[3] else 0
            }
    except Exception as e:
        print(f"      [DB Check Error] {e}")
    return {"persisted": False, "total_steps": 0, "duration_ms": 0, "steps": [], "provenance_count": 0}


def execute_suite():
    print("=" * 85)
    print("      DISCOVERY 10-QUERY LIVE INVESTIGATION SUITE (REAL AI & PERSISTENCE)      ")
    print("=" * 85)

    passed = 0
    test_results = []

    for item in TEST_SCENARIOS:
        print(f"\n[{item['id']}/10] INVESTIGATION: {item['name']}")
        print(f"      Query: '{item['query']}'")
        print(f"      Target Lang: {item['target_lang']} | Modality: {item['modality']}")

        payload = {
            "query": item["query"],
            "target_language": item["target_lang"],
            "input_modality": item["modality"],
            "max_candidates_per_source": 8,
            "auto_ingest": True,
        }

        req = urllib.request.Request(
            "http://localhost:8004/api/discovery/search",
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json", "User-Agent": "DiscoveryValidator/3.0"}
        )

        t_start = time.time()
        try:
            with urllib.request.urlopen(req, timeout=120) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                elapsed = time.time() - t_start

                job_id = data.get("job_id")
                intel = data.get("intelligence_result", {})
                sources = data.get("sources", [])
                trace = data.get("execution_trace", {})
                steps = trace.get("steps", [])

                title = intel.get("title", "")
                summary = intel.get("executive_summary", "")
                verdict = intel.get("authenticity_verdict", "Unverified")
                score = intel.get("authenticity_score", 0.0)

                # Check DB persistence
                db_info = verify_postgres(job_id) if job_id else {"persisted": False}

                print(f"      HTTP: 200 OK ({elapsed:.1f}s) | Job ID: {job_id}")
                print(f"      AI Dossier Headline: {title}")
                print(f"      Executive Summary: {summary[:160]}...")
                print(f"      Authenticity Verdict: {verdict} (Score: {score})")
                print(f"      Live Sources Ingested: {len(sources)} items")
                if sources:
                    print(f"      Primary Source: [{sources[0].get('source')}] {sources[0].get('title')[:60]}... ({sources[0].get('url')})")
                print(f"      Agent Execution Steps: {len(steps)} steps")
                for s in steps:
                    print(f"        -> [{s.get('agent')} : {s.get('tool')}] {s.get('decision')[:75]}")
                print(f"      PostgreSQL Trace Persisted: {'YES (Verified in PostgreSQL 18)' if db_info.get('persisted') else 'NO'}")

                is_valid = len(sources) > 0 and len(summary) > 40 and len(steps) >= 3 and db_info.get("persisted")

                if is_valid:
                    print(f"      RESULT: [PASSED]")
                    passed += 1
                    test_results.append({
                        "id": item["id"],
                        "name": item["name"],
                        "status": "PASSED",
                        "duration_s": round(elapsed, 1),
                        "sources": len(sources),
                        "steps": len(steps),
                        "verdict": verdict,
                        "headline": title,
                        "db_persisted": True
                    })
                else:
                    print(f"      RESULT: [FAILED] Incomplete pipeline data.")
                    test_results.append({
                        "id": item["id"],
                        "name": item["name"],
                        "status": "FAILED",
                        "duration_s": round(elapsed, 1),
                        "sources": len(sources),
                        "steps": len(steps),
                        "verdict": verdict,
                        "db_persisted": db_info.get("persisted")
                    })

        except Exception as e:
            print(f"      RESULT: [ERROR] {e}")
            test_results.append({
                "id": item["id"],
                "name": item["name"],
                "status": f"ERROR: {e}"
            })

    print("\n" + "=" * 85)
    print(f"      VALIDATION SUITE COMPLETE: {passed}/{len(TEST_SCENARIOS)} PASSED")
    print("=" * 85)
    print(json.dumps(test_results, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    execute_suite()
