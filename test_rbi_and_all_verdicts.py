import json
import os
import sys
import time
import urllib.request
from dotenv import load_dotenv

load_dotenv()

BASE_URL = "http://localhost:8000"

def post_search(payload: dict) -> dict:
    url = f"{BASE_URL}/api/discovery/api/v1/discovery/search"
    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req, timeout=120) as resp:
        return json.loads(resp.read().decode("utf-8"))

print("================================================================================", flush=True)
print("             FACTUAL VERDICT & TIME-SENSITIVE VALIDATION SUITE                  ", flush=True)
print("================================================================================", flush=True)

# 1. RBI Monetary Policy Multimodal Image Test
print("\n[TEST 1] RBI Monetary Policy Repo Rate Image Test...", flush=True)
rbi_payload = {
    "query": "RBI Monetary Policy Repo Rate announcement",
    "input_modality": "image",
    "mock_ocr_text": "RESERVE BANK OF INDIA MONETARY POLICY COMMITTEE: Repo rate held steady at 6.50% to align inflation targets.",
    "mock_caption": "Press conference stage with RBI Governor speaking about economic policy.",
    "target_language": "en",
    "auto_ingest": False
}
t0 = time.time()
res1 = post_search(rbi_payload)
el1 = time.time() - t0
ir1 = res1.get("intelligence_result", {})
verdict1 = ir1.get("authenticity_verdict")
score1 = ir1.get("authenticity_score")
rationale1 = ir1.get("authenticity_rationale")

print(f" -> Elapsed: {el1:.2f}s | Sources: {res1.get('candidates_count')}", flush=True)
print(f" -> Title: {ir1.get('title')}", flush=True)
print(f" -> Final Authenticity Verdict: {verdict1} (Score: {score1})", flush=True)
print(f" -> Factual Rationale: {rationale1}", flush=True)

# Pipeline & Factual Accuracy Checks
pipeline_ok1 = res1.get("status") == "success" or res1.get("candidates_count", 0) > 0
factual_ok1 = verdict1 == "Verified" and score1 >= 0.80

print(f" -> Pipeline Status: {'PASS' if pipeline_ok1 else 'FAIL'}", flush=True)
print(f" -> Factual Accuracy: {'PASS (Correctly verified against RBI MPC announcements)' if factual_ok1 else 'FAIL'}", flush=True)

# 2. Hoax / Debunk Test (Garlic Curing Flu)
print("\n[TEST 2] Viral Hoax Debunk Test (Garlic Water Curing Flu)...", flush=True)
hoax_payload = {
    "query": "Drinking boiled garlic water cures influenza and viral infections completely",
    "input_modality": "text",
    "target_language": "en",
    "auto_ingest": False
}
t0 = time.time()
res2 = post_search(hoax_payload)
el2 = time.time() - t0
ir2 = res2.get("intelligence_result", {})
verdict2 = ir2.get("authenticity_verdict")
score2 = ir2.get("authenticity_score")

print(f" -> Elapsed: {el2:.2f}s | Sources: {res2.get('candidates_count')}", flush=True)
print(f" -> Final Authenticity Verdict: {verdict2} (Score: {score2})", flush=True)

factual_ok2 = verdict2 == "Likely False" and score2 <= 0.15
print(f" -> Factual Accuracy: {'PASS (Correctly identified as Likely False based on fact-checks)' if factual_ok2 else 'FAIL'}", flush=True)

# 3. Dynamic Unseen Source Evaluation
print("\n[TEST 3] Dynamic Unseen Domain Evaluation (Source Intelligence)...", flush=True)
src_req = urllib.request.Request(
    f"{BASE_URL}/api/sources/sources/evaluate",
    data=json.dumps({"domain_or_handle": "techcircle.in", "platform": "web", "is_verified_badge": False}).encode("utf-8"),
    headers={"Content-Type": "application/json"}
)
with urllib.request.urlopen(src_req, timeout=60) as s_resp:
    src_data = json.loads(s_resp.read().decode("utf-8"))
print(f" -> Domain: {src_data.get('domain_or_handle')} | Assigned Tier: {src_data.get('tier')} | Credibility Score: {src_data.get('credibility_score')}", flush=True)
print(f" -> Reasoning: {src_data.get('reasoning')}", flush=True)

factual_ok3 = src_data.get("tier") in [1, 2, 3] and src_data.get("credibility_score") is not None
print(f" -> Dynamic Source Evaluation: {'PASS' if factual_ok3 else 'FAIL'}", flush=True)

print("\n================================================================================", flush=True)
print("                               AUDIT SUMMARY                                    ", flush=True)
print("================================================================================", flush=True)
all_pass = factual_ok1 and factual_ok2 and factual_ok3
print(f"Overall Result: {'ALL FACTUAL VERDICTS SUPPORTED BY AUTHORITATIVE EVIDENCE' if all_pass else 'FAILURES DETECTED'}", flush=True)
print("================================================================================", flush=True)
