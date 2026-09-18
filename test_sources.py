import urllib.request
import urllib.parse
import json
import xml.etree.ElementTree as ET

def test_hacker_news():
    print("\n--- Testing Live Hacker News API ---")
    req = urllib.request.Request("https://hacker-news.firebaseio.com/v0/topstories.json", headers={"User-Agent": "Discovery/1.0"})
    with urllib.request.urlopen(req, timeout=5) as resp:
        story_ids = json.loads(resp.read().decode())[:5]
    
    for sid in story_ids:
        item_req = urllib.request.Request(f"https://hacker-news.firebaseio.com/v0/item/{sid}.json", headers={"User-Agent": "Discovery/1.0"})
        with urllib.request.urlopen(item_req, timeout=5) as resp:
            item = json.loads(resp.read().decode())
            print(f"  [HN] {item.get('title')} | URL: {item.get('url')} | Score: {item.get('score')}")

def test_live_web_scrape():
    print("\n--- Testing Live Web Article Extraction ---")
    url = "https://www.bbc.com/news"
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"})
    with urllib.request.urlopen(req, timeout=5) as resp:
        html = resp.read().decode("utf-8", errors="ignore")
    print(f"  [BBC] Successfully fetched {len(html)} bytes of live HTML from {url}")

if __name__ == "__main__":
    test_hacker_news()
    test_live_web_scrape()
