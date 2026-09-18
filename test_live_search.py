import urllib.request
import json

payload = {
    "keywords": ["Electric Vehicles India"],
    "max_candidates_per_source": 5,
    "auto_ingest": True
}

req = urllib.request.Request(
    "http://localhost:8004/api/v1/discovery/search",
    data=json.dumps(payload).encode("utf-8"),
    headers={"Content-Type": "application/json"}
)

print("Querying Discovery Live Internet Agent on Port 8004...")
try:
    with urllib.request.urlopen(req, timeout=10) as resp:
        res = json.loads(resp.read().decode("utf-8"))
        print(f"Status: {res.get('status')}")
        print(f"Candidates Count: {res.get('candidates_count')}")
        for i, c in enumerate(res.get("candidates", [])[:5]):
            print(f"\n  [{i+1}] {c.get('title')}")
            print(f"      Source: {c.get('source')} (Tier {c.get('source_tier')})")
            print(f"      URL: {c.get('url')}")
except Exception as e:
    print(f"Error querying live discovery: {e}")
