"""
Discovery Production Benchmark & System Validation Suite
Runs the 10 required production tests covering text, ambiguous, niche, multilingual, misinformation, contradictory, multimodal (image, audio, video), source discovery, and error handling.
"""

import asyncio
import base64
import json
import os
import sys
import time
import urllib.request

repo_root = os.path.dirname(os.path.abspath(__file__))
if repo_root not in sys.path:
    sys.path.insert(0, repo_root)

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


def test_ambiguous_query():
    print("\n--- TEST 1: Ambiguous Query (Jaguar Financials vs Animal) ---")
    start_t = time.time()
    payload = {
        "query": "Jaguar Land Rover quarterly revenue and sales earnings results",
        "input_modality": "text",
        "target_language": "en",
        "strict_relevance": True,
        "auto_ingest": False
    }
    res = execute_request("/api/discovery/api/v1/discovery/search", payload)
    elapsed = time.time() - start_t
    print(f"Elapsed: {elapsed:.2f}s | Candidates: {res.get('candidates_count')}")
    print("Top Sources:")
    for s in res.get("sources", [])[:3]:
        print(f" - [{s.get('source')}] {s.get('title')}")
    ir = res.get("intelligence_result", {})
    print(f"Verdict: {ir.get('authenticity_verdict')} (Score: {ir.get('authenticity_score')})")
    print("Summary:", ir.get("executive_summary", "")[:250])
    return res


def test_niche_technical():
    print("\n--- TEST 2: Niche Technical Query (ColBERT Late Interaction RAG) ---")
    start_t = time.time()
    payload = {
        "query": "ColBERT late interaction retrieval augmented generation benchmarks",
        "input_modality": "text",
        "target_language": "en",
        "strict_relevance": True,
        "auto_ingest": False
    }
    res = execute_request("/api/discovery/api/v1/discovery/search", payload)
    elapsed = time.time() - start_t
    print(f"Elapsed: {elapsed:.2f}s | Candidates: {res.get('candidates_count')}")
    print("Top Sources:")
    for s in res.get("sources", [])[:3]:
        print(f" - [{s.get('source')}] {s.get('title')}")
    ir = res.get("intelligence_result", {})
    print(f"Verdict: {ir.get('authenticity_verdict')} (Score: {ir.get('authenticity_score')})")
    return res


def test_multilingual_tamil():
    print("\n--- TEST 3: Multilingual Query (Tamil Language) ---")
    start_t = time.time()
    payload = {
        "query": "தமிழ்நாடு சட்டமன்ற தேர்தல் அரசியல் நிலவரம்",
        "input_modality": "text",
        "target_language": "ta",
        "strict_relevance": True,
        "auto_ingest": False
    }
    res = execute_request("/api/discovery/api/v1/discovery/search", payload)
    elapsed = time.time() - start_t
    print(f"Elapsed: {elapsed:.2f}s | Candidates: {res.get('candidates_count')}")
    print("Top Sources:")
    for s in res.get("sources", [])[:3]:
        print(f" - [{s.get('source')}] {s.get('title')}")
    ir = res.get("intelligence_result", {})
    print(f"Title (Tamil): {ir.get('title')}")
    print(f"Summary (Tamil): {ir.get('executive_summary', '')[:250]}")
    return res


def test_misinformation_hoax():
    print("\n--- TEST 4: Misinformation Claim (UNESCO National Anthem Hoax) ---")
    start_t = time.time()
    payload = {
        "query": "UNESCO declared Indian national anthem Jana Gana Mana as best in world",
        "input_modality": "text",
        "target_language": "en",
        "strict_relevance": True,
        "auto_ingest": False
    }
    res = execute_request("/api/discovery/api/v1/discovery/search", payload)
    elapsed = time.time() - start_t
    print(f"Elapsed: {elapsed:.2f}s | Candidates: {res.get('candidates_count')}")
    ir = res.get("intelligence_result", {})
    print(f"Verdict: {ir.get('authenticity_verdict')} (Score: {ir.get('authenticity_score')})")
    print("Rationale:", ir.get("authenticity_rationale"))
    return res


def test_contradictory_evidence():
    print("\n--- TEST 5: Contradictory Evidence (Caffeine & Cardiovascular Health) ---")
    start_t = time.time()
    payload = {
        "query": "Is daily caffeine and coffee consumption beneficial or harmful for heart health",
        "input_modality": "text",
        "target_language": "en",
        "strict_relevance": True,
        "auto_ingest": False
    }
    res = execute_request("/api/discovery/api/v1/discovery/search", payload)
    elapsed = time.time() - start_t
    print(f"Elapsed: {elapsed:.2f}s | Candidates: {res.get('candidates_count')}")
    ir = res.get("intelligence_result", {})
    print(f"Verdict: {ir.get('authenticity_verdict')} (Score: {ir.get('authenticity_score')})")
    print("Cross Source Analysis:", json.dumps(ir.get("cross_source_analysis", {}), indent=2)[:300])
    return res


def test_multimodal_image():
    print("\n--- TEST 6: Multimodal Image Investigation ---")
    start_t = time.time()
    payload = {
        "query": "RBI Monetary Policy Repo Rate announcement",
        "input_modality": "image",
        "mock_ocr_text": "RESERVE BANK OF INDIA MONETARY POLICY COMMITTEE: Repo rate held steady at 6.50% to align inflation targets.",
        "mock_caption": "Press conference stage with RBI Governor speaking about economic policy.",
        "target_language": "en",
        "auto_ingest": False
    }
    res = execute_request("/api/discovery/api/v1/discovery/search", payload)
    elapsed = time.time() - start_t
    print(f"Elapsed: {elapsed:.2f}s | Candidates: {res.get('candidates_count')}")
    ir = res.get("intelligence_result", {})
    print("Title:", ir.get("title"))
    print("Summary:", ir.get("executive_summary", "")[:250])
    return res


def test_multimodal_audio():
    print("\n--- TEST 7: Multimodal Audio Speech Investigation ---")
    start_t = time.time()
    payload = {
        "query": "SpaceX Starship Flight Test orbital achievement",
        "input_modality": "audio",
        "mock_transcript": "SpaceX launch control announces Starship super heavy booster successfully caught by the launch tower arms in Texas.",
        "target_language": "en",
        "auto_ingest": False
    }
    res = execute_request("/api/discovery/api/v1/discovery/search", payload)
    elapsed = time.time() - start_t
    print(f"Elapsed: {elapsed:.2f}s | Candidates: {res.get('candidates_count')}")
    ir = res.get("intelligence_result", {})
    print("Title:", ir.get("title"))
    print("Summary:", ir.get("executive_summary", "")[:250])
    return res


def test_multimodal_video():
    print("\n--- TEST 8: Multimodal Video Investigation ---")
    start_t = time.time()
    payload = {
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
    res = execute_request("/api/discovery/api/v1/discovery/search", payload)
    elapsed = time.time() - start_t
    print(f"Elapsed: {elapsed:.2f}s | Candidates: {res.get('candidates_count')}")
    ir = res.get("intelligence_result", {})
    print("Title:", ir.get("title"))
    return res


def test_unseen_source_discovery():
    print("\n--- TEST 9: Source Intelligence for Unseen Domain ---")
    start_t = time.time()
    payload = {
        "domain_or_handle": "techcircle.in",
        "platform": "web",
        "is_verified_badge": False
    }
    res = execute_request("/api/sources/sources/evaluate", payload)
    elapsed = time.time() - start_t
    print(f"Elapsed: {elapsed:.2f}s | Evaluated Domain: {res.get('domain_or_handle')}")
    print(f"Assigned Tier: {res.get('tier')} | Credibility Score: {res.get('credibility_score')}")
    print(f"Reasoning: {res.get('reasoning')}")
    return res


def test_error_and_empty_handling():
    print("\n--- TEST 10: Error & Zero-Result Graceful Handling ---")
    start_t = time.time()
    payload = {
        "query": "xyzqwertynonexistentunobtainiumclaim998877",
        "input_modality": "text",
        "target_language": "en",
        "auto_ingest": False
    }
    res = execute_request("/api/discovery/api/v1/discovery/search", payload)
    elapsed = time.time() - start_t
    print(f"Elapsed: {elapsed:.2f}s | Candidates: {res.get('candidates_count')}")
    ir = res.get("intelligence_result", {})
    print(f"Verdict: {ir.get('authenticity_verdict')}")
    print(f"Summary: {ir.get('executive_summary')}")
    return res


def main():
    print("=================================================================")
    print("     DISCOVERY 10-TEST BENCHMARK & SYSTEM VALIDATION SUITE       ")
    print("=================================================================")
    results = {}
    tests = [
        ("Test 1: Ambiguous Query", test_ambiguous_query),
        ("Test 2: Niche Technical", test_niche_technical),
        ("Test 3: Multilingual (Tamil)", test_multilingual_tamil),
        ("Test 4: Misinformation Claim", test_misinformation_hoax),
        ("Test 5: Contradictory Evidence", test_contradictory_evidence),
        ("Test 6: Multimodal Image", test_multimodal_image),
        ("Test 7: Multimodal Audio", test_multimodal_audio),
        ("Test 8: Multimodal Video", test_multimodal_video),
        ("Test 9: Unseen Source Discovery", test_unseen_source_discovery),
        ("Test 10: Error / Zero-Result Handling", test_error_and_empty_handling),
    ]

    for name, fn in tests:
        try:
            res = fn()
            results[name] = "PASSED"
        except Exception as exc:
            print(f"FAILED {name}: {exc}")
            results[name] = f"FAILED: {exc}"

    print("\n=================================================================")
    print("                     BENCHMARK SUMMARY                           ")
    print("=================================================================")
    for name, status in results.items():
        print(f" {name:<36}: {status}")


if __name__ == "__main__":
    main()
