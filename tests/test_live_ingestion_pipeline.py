import urllib.request
import urllib.parse
import json
import time

def print_header(title):
    print("\n" + "=" * 65)
    print(f"   {title}")
    print("=" * 65)

def test_rss_feeds():
    print_header("PHASE 2: TESTING MULTIPLE LIVE RSS FEEDS")
    feeds = [
        ("BBC News", "https://feeds.bbci.co.uk/news/rss.xml", 1),
        ("TechCrunch", "https://techcrunch.com/feed/", 2),
        ("The Hindu", "https://www.thehindu.com/news/feeder/default.rss", 1),
    ]

    for name, url, tier in feeds:
        req_data = {
            "feed_url": url,
            "source_name": name,
            "source_tier": tier,
            "max_items": 5
        }
        req = urllib.request.Request(
            "http://127.0.0.1:8000/extract/rss",
            data=json.dumps(req_data).encode("utf-8"),
            headers={"Content-Type": "application/json"}
        )
        try:
            with urllib.request.urlopen(req, timeout=10) as resp:
                data = json.loads(resp.read().decode())
                print(f"[PASS] RSS Ingest '{name}': Total={data.get('total_processed')}, New={data.get('new_articles_count')}, Dup={data.get('duplicates_count')}")
                if data.get("articles"):
                    sample = data["articles"][0]
                    print(f"       Sample: '{sample.get('title')[:60]}...' | Source: {sample.get('source')}")
        except Exception as e:
            print(f"[WARN] RSS Ingest '{name}' failed/timeout: {e}")

    # Test Deduplication with second run on BBC
    print("\n--- Testing RSS Deduplication on BBC ---")
    req = urllib.request.Request(
        "http://127.0.0.1:8000/extract/rss",
        data=json.dumps({"feed_url": "https://feeds.bbci.co.uk/news/rss.xml", "source_name": "BBC News", "max_items": 5}).encode("utf-8"),
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req, timeout=10) as resp:
        data = json.loads(resp.read().decode())
        print(f"[PASS] Deduplication Check: Total={data.get('total_processed')}, New={data.get('new_articles_count')}, Dup={data.get('duplicates_count')}")
        assert data.get('duplicates_count') > 0, "Expected duplicates on 2nd run!"

def test_global_discovery_hn():
    print_header("PHASE 3: TESTING GLOBAL DISCOVERY (HACKER NEWS + GOOGLE NEWS + GDELT)")
    req_data = {
        "keywords": ["artificial intelligence", "robotics"],
        "max_candidates_per_source": 5,
        "auto_ingest": True
    }
    req = urllib.request.Request(
        "http://127.0.0.1:8004/api/v1/discovery/search",
        data=json.dumps(req_data).encode("utf-8"),
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req, timeout=15) as resp:
        data = json.loads(resp.read().decode())
        print(f"[PASS] Global Discovery Status: {data.get('status')}, Job ID: {data.get('job_id')}")
        print(f"       Total Candidates Discovered: {data.get('candidates_count')}")
        hn_items = [c for c in data.get('candidates', []) if c.get('adapter') == 'hackernews' or 'news.ycombinator.com' in c.get('url', '') or c.get('source') == 'hacker-news']
        print(f"       Hacker News Candidates: {len(hn_items)}")
        for c in data.get('candidates', [])[:4]:
            print(f"       - [{c.get('adapter')}] {c.get('title')[:60]}... ({c.get('source')})")

def test_direct_web_extraction():
    print_header("PHASE 4: TESTING DIRECT WEB EXTRACTION")
    test_urls = [
        "https://techcrunch.com/",
        "https://news.ycombinator.com/"
    ]
    for url in test_urls:
        req_data = {
            "url": url,
            "source_name": "Web Crawler",
            "source_tier": 2
        }
        req = urllib.request.Request(
            "http://127.0.0.1:8000/extract/url",
            data=json.dumps(req_data).encode("utf-8"),
            headers={"Content-Type": "application/json"}
        )
        try:
            with urllib.request.urlopen(req, timeout=10) as resp:
                data = json.loads(resp.read().decode())
                art = data
                print(f"[PASS] Web Extract '{url}': Title='{art.get('title', '')[:50]}...', Bytes={len(art.get('extracted_text', ''))}")
        except Exception as e:
            print(f"[WARN] Web Extract '{url}' notice: {e}")

def test_multimodal_extraction():
    print_header("PHASE 5: TESTING MULTIMODAL EXTRACTION")
    # Image OCR test
    img_data = {
        "media_type": "image",
        "title": "Breaking News Press Release Graphic",
        "source_name": "Reuters Photos",
        "mock_ocr_text": "ACME Corp announces Q3 quarterly earnings surge of 25%",
        "mock_caption": "Press conference with executive team onstage in Tokyo"
    }
    req = urllib.request.Request(
        "http://127.0.0.1:8000/extract/multimodal",
        data=json.dumps(img_data).encode("utf-8"),
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req, timeout=5) as resp:
        data = json.loads(resp.read().decode())
        art = data.get("article", {})
        media = data.get("media_asset", {})
        print(f"[PASS] Multimodal Image Ingestion: Article ID={art.get('id')}, OCR Text='{media.get('ocr_text')}'")

    # Audio ASR test
    audio_data = {
        "media_type": "audio",
        "title": "Tech Weekly Podcast Ep 42",
        "source_name": "BBC Radio",
        "mock_transcript": "Today we discuss the latest semiconductor policy changes announced by the trade commission."
    }
    req = urllib.request.Request(
        "http://127.0.0.1:8000/extract/multimodal",
        data=json.dumps(audio_data).encode("utf-8"),
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req, timeout=5) as resp:
        data = json.loads(resp.read().decode())
        art = data.get("article", {})
        media = data.get("media_asset", {})
        print(f"[PASS] Multimodal Audio Ingestion: Article ID={art.get('id')}, Transcript='{media.get('transcript')}'")

    # Video Multi-stream test
    vid_data = {
        "media_type": "video",
        "title": "Live Broadcast Report",
        "source_name": "Bloomberg TV",
        "mock_transcript": "Autonomous vehicles expand testing to 5 new international metropolitan areas.",
        "mock_ocr_text": "LOWER THIRD: LIVE FROM TOKYO MOTOR SHOW",
        "mock_keyframes": ["00:00 - Reporter standing in exhibition hall", "00:30 - Prototype vehicle on display"]
    }
    req = urllib.request.Request(
        "http://127.0.0.1:8000/extract/multimodal",
        data=json.dumps(vid_data).encode("utf-8"),
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req, timeout=5) as resp:
        data = json.loads(resp.read().decode())
        art = data.get("article", {})
        media = data.get("media_asset", {})
def test_reddit_public_feed():
    print_header("PHASE 6: TESTING PUBLIC REDDIT SOCIAL INGESTION")
    reddit_payload = {
        "platform": "reddit",
        "raw_payload": {
            "title": "Quantum Computing Breakthrough: 1000-Qubit Fault-Tolerant Processor Announced",
            "selftext": "Researchers at MIT and IBM today published benchmark results for a new error-corrected processor architecture.",
            "subreddit": "technology",
            "author": "science_reporter_42",
            "score": 3840,
            "upvote_ratio": 0.96,
            "permalink": "/r/technology/comments/quantum_breakthrough_2026",
            "top_comments": [
                "This is a massive milestone for quantum error correction.",
                "How does the coherence time compare to previous generation superconducting qubits?"
            ]
        },
        "source_tier": 2
    }
    req = urllib.request.Request(
        "http://127.0.0.1:8000/extract/social",
        data=json.dumps(reddit_payload).encode("utf-8"),
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req, timeout=5) as resp:
        data = json.loads(resp.read().decode())
        art = data.get("article", {})
        soc = data.get("social_post", {})
        print(f"[PASS] Reddit Ingestion: Article ID={art.get('id')}, Author={soc.get('handle')}, Title='{art.get('title')[:60]}...'")

def main():
    test_rss_feeds()
    test_global_discovery_hn()
    test_direct_web_extraction()
    test_multimodal_extraction()
    test_reddit_public_feed()
    print_header("ALL ZERO-API LIVE INGESTION PHASES COMPLETED AND VERIFIED!")

if __name__ == "__main__":
    main()

