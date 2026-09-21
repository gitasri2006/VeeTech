import urllib.request
import urllib.parse
import json
import time

base = "http://localhost:8000/api/content/preview"

tests = [
    ("YouTube Video", {"url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ", "title": "Rick Astley Song"}),
    ("YouTube Short", {"url": "https://youtube.com/shorts/5-lR4yO9dM0", "title": "Short Video"}),
    ("News Article", {"url": "https://en.wikipedia.org/wiki/Natural_language_processing", "title": "NLP Wikipedia"}),
    ("SSRF Blocked Localhost", {"url": "http://127.0.0.1:8000/health"}),
    ("SSRF Blocked Cloud Metadata", {"url": "http://169.254.169.254/latest/meta-data"}),
]

print("=================================================================")
print("      DISCOVERY IN-APP CONTENT INGESTION LIVE API TESTS          ")
print("=================================================================")

for name, payload in tests:
    t0 = time.time()
    url = base + "?" + urllib.parse.urlencode(payload)
    req = urllib.request.Request(url)
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            status = data.get("extraction_status")
            c_type = data.get("content_type")
            success = data.get("success")
            print(f"{name:<30}: Status={status} | Type={c_type} | Success={success} in {time.time()-t0:.2f}s")
            if data.get("youtube"):
                yt = data["youtube"]
                print(f"   Embed URL: {yt.get('embed_url')}")
                print(f"   Author: {yt.get('author')} | Title: {yt.get('title')}")
            elif data.get("article"):
                art = data["article"]
                print(f"   Title: {art.get('title')}")
                print(f"   Words: {art.get('word_count')} | Read Time: {art.get('reading_time_minutes')}m")
                print(f"   Excerpt: {art.get('excerpt', '')[:90]}...")
            elif data.get("error_message"):
                print(f"   Blocked / Rationale: {data.get('error_message')}")
    except Exception as e:
        print(f"{name:<30}: Request Exception: {e}")

print("=================================================================")
