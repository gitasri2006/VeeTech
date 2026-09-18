import urllib.request
import urllib.parse
import xml.etree.ElementTree as ET
import json

def test_google_news(query="India"):
    print(f"\n--- 1. Testing Live Google News RSS for '{query}' ---")
    url = f"https://news.google.com/rss/search?q={urllib.parse.quote(query)}&hl=en-US&gl=US&ceid=US:en"
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"})
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            root = ET.fromstring(resp.read())
            items = root.findall(".//item")
            print(f"Successfully fetched {len(items)} live articles from Google News!")
            for i, it in enumerate(items[:3]):
                title = it.findtext("title", default="No Title")
                link = it.findtext("link", default="")
                pub = it.findtext("pubDate", default="")
                src = it.findtext("source", default="News")
                print(f"  [{i+1}] {title} | Source: {src} | Date: {pub}")
    except Exception as e:
        print(f"Google News error: {e}")

def test_gdelt(query="climate"):
    print(f"\n--- 2. Testing Live GDELT Project API for '{query}' ---")
    url = f"https://api.gdeltproject.org/api/v2/doc/doc?query={urllib.parse.quote(query)}&mode=ArtList&maxrecords=5&format=json&sort=DateDesc"
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            arts = data.get("articles", [])
            print(f"Successfully fetched {len(arts)} live articles from GDELT!")
            for i, a in enumerate(arts[:3]):
                print(f"  [{i+1}] {a.get('title')} | Domain: {a.get('domain')} | URL: {a.get('url')}")
    except Exception as e:
        print(f"GDELT error: {e}")

def test_reddit(query="tech"):
    print(f"\n--- 3. Testing Live Reddit Public API for '{query}' ---")
    url = f"https://www.reddit.com/r/technology/search.json?q={urllib.parse.quote(query)}&restrict_sr=1&sort=new&limit=5"
    req = urllib.request.Request(url, headers={"User-Agent": "DiscoveryLiveApp/1.0"})
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            children = data.get("data", {}).get("children", [])
            print(f"Successfully fetched {len(children)} live posts from Reddit!")
            for i, c in enumerate(children[:3]):
                d = c.get("data", {})
                print(f"  [{i+1}] {d.get('title')} | Author: {d.get('author')} | Score: {d.get('score')}")
    except Exception as e:
        print(f"Reddit error: {e}")

if __name__ == "__main__":
    test_google_news()
    test_gdelt()
    test_reddit()
