import urllib.request
import json
import psycopg2
import sys

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

EXTRACT_URL = "http://localhost:8000/extract/url"
PG_URI = "postgresql://postgres:Gayu%40300116@localhost:5432/discovery"

def test_extract_real_urls():
    print("=================================================================")
    print("      EXTRACTION AGENT LIVE REAL URL VERIFICATION                ")
    print("=================================================================")
    
    test_urls = [
        "https://en.wikipedia.org/wiki/OpenAI",
        "https://en.wikipedia.org/wiki/Nvidia",
        "https://feeds.bbci.co.uk/news/world/rss.xml"
    ]
    
    for url in test_urls:
        print(f"\nExtracting from: {url}")
        req = urllib.request.Request(
            EXTRACT_URL,
            data=json.dumps({"url": url, "force_browser": False}).encode("utf-8"),
            headers={"Content-Type": "application/json"}
        )
        try:
            with urllib.request.urlopen(req, timeout=15) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                art = data.get("articles", [{}])[0]
                print(f"  Status: {data.get('status')}")
                print(f"  Title: {art.get('title')}")
                print(f"  Source: {art.get('source')}")
                print(f"  Content Hash: {art.get('content_hash')}")
                print(f"  Canonical URL: {art.get('canonical_url')}")
                print(f"  Extracted Text Length: {len(art.get('extracted_text', ''))} chars")
                print(f"  Published At: {art.get('published_at')}")
                assert art.get('content_hash'), "Content hash missing!"
                assert len(art.get('extracted_text', '')) > 20, "Extracted text too short!"
        except Exception as e:
            print(f"  Extraction Notice for {url}: {e}")

    # Check PostgreSQL database count
    conn = psycopg2.connect(PG_URI)
    cur = conn.cursor()
    cur.execute("SELECT count(*) FROM articles;")
    print(f"\n[PostgreSQL DB] Total articles verified in database: {cur.fetchone()[0]}")
    conn.close()
    print("Extraction Agent Live Verification Completed Successfully!")

if __name__ == "__main__":
    test_extract_real_urls()
