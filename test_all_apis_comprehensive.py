import os
import sys
import json
import requests
from dotenv import load_dotenv

load_dotenv()

results = {}

print("================================================================", flush=True)
print("           VeeTech / Discovery System-Wide API Health Check      ", flush=True)
print("================================================================", flush=True)

# 1. Serper API
print("Testing Serper API...", flush=True)
serper_key = os.getenv("SERPER_API_KEY")
if serper_key:
    try:
        r = requests.post(
            "https://google.serper.dev/search",
            headers={"X-API-KEY": serper_key, "Content-Type": "application/json"},
            json={"q": "OpenAI news", "num": 3},
            timeout=8
        )
        if r.status_code == 200 and "organic" in r.json():
            count = len(r.json().get("organic", []))
            results["Serper Search API"] = f"WORKING (Returned {count} organic results)"
        else:
            results["Serper Search API"] = f"FAILED (Status {r.status_code}: {r.text[:100]})"
    except Exception as e:
        results["Serper Search API"] = f"ERROR: {e}"
else:
    results["Serper Search API"] = "NOT CONFIGURED"

# 2. Google Fact Check Tools API
print("Testing Google Fact Check API...", flush=True)
factcheck_key = os.getenv("GOOGLE_FACTCHECK_API_KEY")
if factcheck_key:
    try:
        r = requests.get(
            "https://factchecktools.googleapis.com/v1alpha1/claims:search",
            params={"query": "vaccine", "key": factcheck_key, "pageSize": 3},
            timeout=8
        )
        if r.status_code == 200:
            claims = r.json().get("claims", [])
            results["Google Fact Check API"] = f"WORKING (Returned {len(claims)} fact-checked claims)"
        else:
            results["Google Fact Check API"] = f"FAILED (Status {r.status_code}: {r.text[:100]})"
    except Exception as e:
        results["Google Fact Check API"] = f"ERROR: {e}"
else:
    results["Google Fact Check API"] = "NOT CONFIGURED"

# 3. YouTube Data API v3
print("Testing YouTube Data API...", flush=True)
yt_key = os.getenv("YOUTUBE_API_KEY")
if yt_key:
    try:
        r = requests.get(
            "https://www.googleapis.com/youtube/v3/search",
            params={"q": "AI technology", "part": "snippet", "key": yt_key, "maxResults": 2, "type": "video"},
            timeout=8
        )
        if r.status_code == 200 and "items" in r.json():
            results["YouTube Data API"] = f"WORKING (Returned {len(r.json().get('items', []))} videos)"
        else:
            results["YouTube Data API"] = f"FAILED (Status {r.status_code}: {r.text[:100]})"
    except Exception as e:
        results["YouTube Data API"] = f"ERROR: {e}"
else:
    results["YouTube Data API"] = "NOT CONFIGURED"

# 4. Telegram Bot API
print("Testing Telegram Bot API...", flush=True)
tg_token = os.getenv("TELEGRAM_BOT_TOKEN")
if tg_token:
    try:
        r = requests.get(f"https://api.telegram.org/bot{tg_token}/getMe", timeout=8)
        if r.status_code == 200 and r.json().get("ok"):
            bot_name = r.json().get("result", {}).get("username")
            results["Telegram Bot API"] = f"WORKING (Connected to @{bot_name})"
        else:
            results["Telegram Bot API"] = f"FAILED (Status {r.status_code}: {r.text[:100]})"
    except Exception as e:
        results["Telegram Bot API"] = f"ERROR: {e}"
else:
    results["Telegram Bot API"] = "NOT CONFIGURED"

# 5. GDELT Global Intelligence API
print("Testing GDELT API...", flush=True)
try:
    r = requests.get(
        "https://api.gdeltproject.org/api/v2/doc/doc",
        params={"query": "artificial intelligence", "mode": "artlist", "maxrecords": 5, "format": "json"},
        timeout=8
    )
    if r.status_code == 200 and "articles" in r.json():
        results["GDELT Global News Feed"] = f"WORKING (Returned {len(r.json().get('articles', []))} international events)"
    else:
        results["GDELT Global News Feed"] = f"STATUS {r.status_code}"
except Exception as e:
    results["GDELT Global News Feed"] = f"ERROR: {e}"

# 6. PostgreSQL Database
print("Testing PostgreSQL Database...", flush=True)
db_url = os.getenv("DATABASE_URL")
if db_url:
    try:
        import psycopg2
        conn = psycopg2.connect(db_url, connect_timeout=4)
        conn.close()
        results["PostgreSQL Database (Local)"] = "WORKING (Connection successful)"
    except Exception as e:
        results["PostgreSQL Database (Local)"] = f"NOTICE: {e} (In-memory fallback active)"

# 7. Google Gemini Generative AI
print("Testing Google Gemini Generative AI...", flush=True)
gemini_key = os.getenv("GEMINI_API_KEY")
if gemini_key:
    try:
        from google import genai
        client = genai.Client(api_key=gemini_key)
        res = client.models.generate_content(model="gemini-3.1-flash-lite", contents="Reply 'OK'")
        if res and res.text:
            results["Google Gemini AI"] = f"WORKING (Model: gemini-3.1-flash-lite, Response: {res.text.strip()})"
        else:
            results["Google Gemini AI"] = "EMPTY RESPONSE"
    except Exception as e:
        results["Google Gemini AI"] = f"ERROR: {e}"

print("\n======================= SYSTEM API AUDIT REPORT =======================", flush=True)
for k, v in results.items():
    status_tag = "PASS" if "WORKING" in v or "CONNECTED" in v else "INFO"
    print(f"[{status_tag}] {k}: {v}", flush=True)
print("=======================================================================", flush=True)
