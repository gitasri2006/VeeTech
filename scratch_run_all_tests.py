import json
import os
import sys
import time
import urllib.request

BASE_URL = "http://localhost:8000"

def execute_request(endpoint: str, payload: dict, timeout: int = 120) -> dict:
    url = f"{BASE_URL}{endpoint}"
    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return json.loads(resp.read().decode("utf-8"))

def log(msg: str):
    print(msg, flush=True)

def run():
    log("=================================================================")
    log("     DISCOVERY 10-TEST BENCHMARK & SYSTEM VALIDATION SUITE       ")
    log("=================================================================")
    
    results = {}
    
    # TEST 1: Ambiguous Query (Jaguar Financials vs Animal)
    log("\n--- TEST 1: Ambiguous Query (Jaguar Financials vs Animal) ---")
    try:
        t0 = time.time()
        p = {"query": "Jaguar Land Rover quarterly revenue and sales earnings results", "input_modality": "text", "target_language": "en", "strict_relevance": True, "auto_ingest": False}
        res = execute_request("/api/discovery/api/v1/discovery/search", p)
        ir = res.get("intelligence_result", {})
        log(f"Time: {time.time()-t0:.2f}s | Candidates: {res.get('candidates_count')} | Verdict: {ir.get('authenticity_verdict')} (Score: {ir.get('authenticity_score')})")
        log(f"Title: {ir.get('title')}")
        results["Test 1: Ambiguous Query"] = "PASSED"
    except Exception as e:
        log(f"FAILED Test 1: {e}")
        results["Test 1: Ambiguous Query"] = f"FAILED: {e}"

    # TEST 2: Niche Technical Query (ColBERT Late Interaction RAG)
    log("\n--- TEST 2: Niche Technical Query (ColBERT Late Interaction RAG) ---")
    try:
        t0 = time.time()
        p = {"query": "ColBERT late interaction retrieval augmented generation benchmarks", "input_modality": "text", "target_language": "en", "strict_relevance": True, "auto_ingest": False}
        res = execute_request("/api/discovery/api/v1/discovery/search", p)
        ir = res.get("intelligence_result", {})
        log(f"Time: {time.time()-t0:.2f}s | Candidates: {res.get('candidates_count')} | Verdict: {ir.get('authenticity_verdict')} (Score: {ir.get('authenticity_score')})")
        log(f"Title: {ir.get('title')}")
        results["Test 2: Niche Technical"] = "PASSED"
    except Exception as e:
        log(f"FAILED Test 2: {e}")
        results["Test 2: Niche Technical"] = f"FAILED: {e}"

    # TEST 3: Multilingual Query (Tamil Language)
    log("\n--- TEST 3: Multilingual Query (Tamil Language) ---")
    try:
        t0 = time.time()
        p = {"query": "தமிழ்நாடு சட்டமன்ற தேர்தல் அரசியல் நிலவரம்", "input_modality": "text", "target_language": "ta", "strict_relevance": True, "auto_ingest": False}
        res = execute_request("/api/discovery/api/v1/discovery/search", p)
        ir = res.get("intelligence_result", {})
        log(f"Time: {time.time()-t0:.2f}s | Candidates: {res.get('candidates_count')} | Verdict: {ir.get('authenticity_verdict')}")
        title_safe = str(ir.get('title', '')).encode('ascii', 'replace').decode('ascii')
        log(f"Tamil Title (ascii-safe): {title_safe}")
        results["Test 3: Multilingual (Tamil)"] = "PASSED"
    except Exception as e:
        log(f"FAILED Test 3: {e}")
        results["Test 3: Multilingual (Tamil)"] = f"FAILED: {e}"

    # TEST 4: Misinformation Claim (UNESCO National Anthem Hoax)
    log("\n--- TEST 4: Misinformation Claim (UNESCO National Anthem Hoax) ---")
    try:
        t0 = time.time()
        p = {"query": "UNESCO declared Indian national anthem Jana Gana Mana as best in world", "input_modality": "text", "target_language": "en", "strict_relevance": True, "auto_ingest": False}
        res = execute_request("/api/discovery/api/v1/discovery/search", p)
        ir = res.get("intelligence_result", {})
        log(f"Time: {time.time()-t0:.2f}s | Candidates: {res.get('candidates_count')} | Verdict: {ir.get('authenticity_verdict')} (Score: {ir.get('authenticity_score')})")
        log(f"Rationale: {ir.get('authenticity_rationale')[:200]}")
        results["Test 4: Misinformation Claim"] = "PASSED"
    except Exception as e:
        log(f"FAILED Test 4: {e}")
        results["Test 4: Misinformation Claim"] = f"FAILED: {e}"

    # TEST 5: Contradictory Evidence (Caffeine & Cardiovascular Health)
    log("\n--- TEST 5: Contradictory Evidence (Caffeine & Cardiovascular Health) ---")
    try:
        t0 = time.time()
        p = {"query": "Is daily caffeine and coffee consumption beneficial or harmful for heart health", "input_modality": "text", "target_language": "en", "strict_relevance": True, "auto_ingest": False}
        res = execute_request("/api/discovery/api/v1/discovery/search", p)
        ir = res.get("intelligence_result", {})
        log(f"Time: {time.time()-t0:.2f}s | Candidates: {res.get('candidates_count')} | Verdict: {ir.get('authenticity_verdict')}")
        results["Test 5: Contradictory Evidence"] = "PASSED"
    except Exception as e:
        log(f"FAILED Test 5: {e}")
        results["Test 5: Contradictory Evidence"] = f"FAILED: {e}"

    # TEST 6: Multimodal Image Investigation
    log("\n--- TEST 6: Multimodal Image Investigation ---")
    try:
        t0 = time.time()
        p = {
            "query": "RBI Monetary Policy Repo Rate announcement",
            "input_modality": "image",
            "mock_ocr_text": "RESERVE BANK OF INDIA MONETARY POLICY COMMITTEE: Repo rate held steady at 6.50% to align inflation targets.",
            "mock_caption": "Press conference stage with RBI Governor speaking about economic policy.",
            "target_language": "en",
            "auto_ingest": False
        }
        res = execute_request("/api/discovery/api/v1/discovery/search", p)
        ir = res.get("intelligence_result", {})
        log(f"Time: {time.time()-t0:.2f}s | Modality: image | Title: {ir.get('title')}")
        results["Test 6: Multimodal Image"] = "PASSED"
    except Exception as e:
        log(f"FAILED Test 6: {e}")
        results["Test 6: Multimodal Image"] = f"FAILED: {e}"

    # TEST 7: Multimodal Audio Speech Investigation
    log("\n--- TEST 7: Multimodal Audio Speech Investigation ---")
    try:
        t0 = time.time()
        p = {
            "query": "SpaceX Starship Flight Test orbital achievement",
            "input_modality": "audio",
            "mock_transcript": "SpaceX launch control announces Starship super heavy booster successfully caught by the launch tower arms in Texas.",
            "target_language": "en",
            "auto_ingest": False
        }
        res = execute_request("/api/discovery/api/v1/discovery/search", p)
        ir = res.get("intelligence_result", {})
        log(f"Time: {time.time()-t0:.2f}s | Modality: audio | Title: {ir.get('title')}")
        results["Test 7: Multimodal Audio"] = "PASSED"
    except Exception as e:
        log(f"FAILED Test 7: {e}")
        results["Test 7: Multimodal Audio"] = f"FAILED: {e}"

    # TEST 8: Multimodal Video Investigation
    log("\n--- TEST 8: Multimodal Video Investigation ---")
    try:
        t0 = time.time()
        p = {
            "query": "Apple Intelligence M4 chip keynote reveal",
            "input_modality": "video",
            "mock_transcript": "Tim Cook announces Apple Intelligence features on new M4 powered iPad Pro with neural engine architecture.",
            "mock_keyframes": [
                "Apple Park auditorium with Tim Cook introducing M4 chip",
                "Onscreen graphic displaying 38 trillion operations per second neural engine"
            ],
            "target_language": "en",
            "auto_ingest": False
        }
        res = execute_request("/api/discovery/api/v1/discovery/search", p)
        ir = res.get("intelligence_result", {})
        log(f"Time: {time.time()-t0:.2f}s | Modality: video | Title: {ir.get('title')}")
        results["Test 8: Multimodal Video"] = "PASSED"
    except Exception as e:
        log(f"FAILED Test 8: {e}")
        results["Test 8: Multimodal Video"] = f"FAILED: {e}"

    # TEST 9: Source Intelligence for Unseen Domain
    log("\n--- TEST 9: Source Intelligence for Unseen Domain ---")
    try:
        t0 = time.time()
        p = {"domain_or_handle": "techcircle.in", "platform": "web", "is_verified_badge": False}
        res = execute_request("/api/sources/sources/evaluate", p)
        log(f"Time: {time.time()-t0:.2f}s | Domain: {res.get('domain_or_handle')} | Tier: {res.get('tier')} | Credibility: {res.get('credibility_score')}")
        log(f"Reasoning: {res.get('reasoning')[:200]}")
        results["Test 9: Unseen Source Discovery"] = "PASSED"
    except Exception as e:
        log(f"FAILED Test 9: {e}")
        results["Test 9: Unseen Source Discovery"] = f"FAILED: {e}"

    # TEST 10: Error & Zero-Result Graceful Handling
    log("\n--- TEST 10: Error & Zero-Result Graceful Handling ---")
    try:
        t0 = time.time()
        p = {"query": "xyzqwertynonexistentunobtainiumclaim998877", "input_modality": "text", "target_language": "en", "auto_ingest": False}
        res = execute_request("/api/discovery/api/v1/discovery/search", p)
        ir = res.get("intelligence_result", {})
        log(f"Time: {time.time()-t0:.2f}s | Candidates: {res.get('candidates_count')} | Verdict: {ir.get('authenticity_verdict')}")
        log(f"Summary: {ir.get('executive_summary')[:200]}")
        results["Test 10: Error / Zero-Result Handling"] = "PASSED"
    except Exception as e:
        log(f"FAILED Test 10: {e}")
        results["Test 10: Error / Zero-Result Handling"] = f"FAILED: {e}"

    log("\n=================================================================")
    log("                     BENCHMARK SUMMARY                           ")
    log("=================================================================")
    for name, status in results.items():
        log(f" {name:<36}: {status}")

if __name__ == "__main__":
    run()
