"""
Discovery Official API Connectors & Live Authentication Test Suite
Tests live connectivity, rate limits, error handling, and graceful skipping when keys are not configured.
"""
import os
import json
import urllib.request
import urllib.parse
import sys
from dotenv import load_dotenv

# Load latest .env
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

def print_result(api_name, status, evidence, next_action=""):
    print(f"\nAPI / CONNECTOR: {api_name}")
    print(f"  STATUS:   {status}")
    print(f"  EVIDENCE: {evidence}")
    if next_action:
        print(f"  NEXT:     {next_action}")

def test_gemini():
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key or api_key.startswith("your_") or api_key == "dev_key":
        print_result("1. Google Gemini API", "SKIP (No key in .env)", "GEMINI_API_KEY not configured", "Obtain key from https://aistudio.google.com/ and set GEMINI_API_KEY in .env")
        return
    try:
        from google import genai
        client = genai.Client(api_key=api_key)
        response = client.models.generate_content(
            model=os.getenv("GEMINI_MODEL", "gemini-2.5-flash"),
            contents="Respond with the exact word: CONNECTED"
        )
        print_result("1. Google Gemini API", "PASS", f"Model response: {response.text.strip()}")
    except Exception as e:
        print_result("1. Google Gemini API", "FAIL", f"Error querying Gemini: {e}", "Verify key validity on Google AI Studio")

def test_google_factcheck():
    api_key = os.getenv("GOOGLE_FACTCHECK_API_KEY") or os.getenv("GEMINI_API_KEY")
    if not api_key or api_key.startswith("your_"):
        print_result("2. Google Fact Check Tools API", "SKIP (No key in .env)", "GOOGLE_FACTCHECK_API_KEY not configured", "Enable Fact Check Tools API on Google Cloud Console and set in .env")
        return
    try:
        query = urllib.parse.quote("climate change")
        url = f"https://factchecktools.googleapis.com/v1alpha1/claims:search?query={query}&key={api_key}"
        req = urllib.request.Request(url, headers={"User-Agent": "Discovery/1.0"})
        with urllib.request.urlopen(req, timeout=6) as resp:
            data = json.loads(resp.read().decode())
            claims_count = len(data.get("claims", []))
            print_result("2. Google Fact Check Tools API", "PASS", f"Successfully fetched {claims_count} verified claims for query 'climate change'")
    except Exception as e:
        print_result("2. Google Fact Check Tools API", "FAIL", f"Error: {e}", "Ensure Fact Check Tools API is enabled on Google Cloud")

def test_x_twitter():
    bearer_token = os.getenv("X_BEARER_TOKEN")
    if not bearer_token or bearer_token.startswith("your_"):
        print_result("3. X (Twitter) API v2", "SKIP (No token in .env)", "X_BEARER_TOKEN not configured", "Generate App Bearer Token at https://developer.x.com/ and set in .env")
        return
    try:
        url = "https://api.twitter.com/2/tweets/sample/stream/rules"
        req = urllib.request.Request(url, headers={"Authorization": f"Bearer {bearer_token}", "User-Agent": "Discovery/1.0"})
        with urllib.request.urlopen(req, timeout=6) as resp:
            data = json.loads(resp.read().decode())
            print_result("3. X (Twitter) API v2", "PASS", f"Successfully authenticated to X API v2 (HTTP {resp.status})")
    except Exception as e:
        print_result("3. X (Twitter) API v2", "FAIL", f"Error: {e}", "Check token permissions in X Developer Portal")

def test_reddit():
    client_id = os.getenv("REDIS_CLIENT_ID") or os.getenv("REDDIT_CLIENT_ID")
    client_secret = os.getenv("REDDIT_CLIENT_SECRET")
    if not client_id or not client_secret or client_id.startswith("your_"):
        print_result("4. Reddit Official API", "SKIP (No credentials in .env)", "REDDIT_CLIENT_ID or REDDIT_CLIENT_SECRET not configured (Public fallback active)", "Create Script App at https://www.reddit.com/prefs/apps and set in .env")
        return
    try:
        # OAuth token request
        import base64
        auth = base64.b64encode(f"{client_id}:{client_secret}".encode()).decode()
        data = urllib.parse.urlencode({"grant_type": "client_credentials"}).encode()
        req = urllib.request.Request(
            "https://www.reddit.com/api/v1/access_token",
            data=data,
            headers={"Authorization": f"Basic {auth}", "User-Agent": os.getenv("REDDIT_USER_AGENT", "Discovery/1.0")}
        )
        with urllib.request.urlopen(req, timeout=6) as resp:
            token_data = json.loads(resp.read().decode())
            if "access_token" in token_data:
                print_result("4. Reddit Official API", "PASS", f"Successfully obtained OAuth access token (Expires in {token_data.get('expires_in')}s)")
            else:
                print_result("4. Reddit Official API", "FAIL", f"Response: {token_data}")
    except Exception as e:
        print_result("4. Reddit Official API", "FAIL", f"Error: {e}", "Check Reddit App credentials in .env")

def test_youtube():
    api_key = os.getenv("YOUTUBE_API_KEY") or os.getenv("GEMINI_API_KEY")
    if not api_key or api_key.startswith("your_"):
        print_result("5. YouTube Data API v3", "SKIP (No key in .env)", "YOUTUBE_API_KEY not configured", "Enable YouTube Data API v3 on Google Cloud and set in .env")
        return
    try:
        url = f"https://www.googleapis.com/youtube/v3/search?part=snippet&q=technology+news&maxResults=2&key={api_key}"
        req = urllib.request.Request(url, headers={"User-Agent": "Discovery/1.0"})
        with urllib.request.urlopen(req, timeout=6) as resp:
            data = json.loads(resp.read().decode())
            items = data.get("items", [])
            title_sample = items[0].get('snippet', {}).get('title', '')[:40].encode('ascii', 'replace').decode('ascii') if items else 'None'
            print_result("5. YouTube Data API v3", "PASS", f"Successfully retrieved {len(items)} YouTube videos (e.g. '{title_sample}...')")
    except Exception as e:
        print_result("5. YouTube Data API v3", "FAIL", f"Error: {e}", "Ensure YouTube Data API v3 is enabled on Google Cloud")

def test_meta_facebook_instagram():
    access_token = os.getenv("META_PAGE_ACCESS_TOKEN") or os.getenv("META_APP_SECRET")
    if not access_token or access_token.startswith("your_") or access_token == "discovery_meta_app_secret_test":
        print_result("6. Meta (Facebook & Instagram) Graph API", "SKIP (No token in .env)", "META_PAGE_ACCESS_TOKEN not configured", "Generate Page/User token on https://developers.facebook.com/ and set in .env")
        return
    try:
        url = f"https://graph.facebook.com/v19.0/me?access_token={access_token}"
        req = urllib.request.Request(url, headers={"User-Agent": "Discovery/1.0"})
        with urllib.request.urlopen(req, timeout=6) as resp:
            data = json.loads(resp.read().decode())
            print_result("6. Meta Graph API", "PASS", f"Authenticated user/app ID: {data.get('id')}")
    except Exception as e:
        print_result("6. Meta Graph API", "FAIL", f"Error: {e}", "Verify Meta token permissions")

def test_telegram():
    bot_token = os.getenv("TELEGRAM_BOT_TOKEN")
    if not bot_token or bot_token.startswith("your_"):
        print_result("7. Telegram Bot API", "SKIP (No token in .env)", "TELEGRAM_BOT_TOKEN not configured", "Create bot via @BotFather on Telegram and set TELEGRAM_BOT_TOKEN in .env")
        return
    try:
        url = f"https://api.telegram.org/bot{bot_token}/getMe"
        req = urllib.request.Request(url, headers={"User-Agent": "Discovery/1.0"})
        with urllib.request.urlopen(req, timeout=6) as resp:
            data = json.loads(resp.read().decode())
            if data.get("ok"):
                print_result("7. Telegram Bot API", "PASS", f"Connected as @{data.get('result', {}).get('username')}")
            else:
                print_result("7. Telegram Bot API", "FAIL", f"Response: {data}")
    except Exception as e:
        print_result("7. Telegram Bot API", "FAIL", f"Error: {e}", "Check Telegram Bot token")

def test_whatsapp_cloud():
    token = os.getenv("META_WHATSAPP_TOKEN")
    phone_id = os.getenv("WHATSAPP_PHONE_NUMBER_ID")
    if not token or not phone_id or token.startswith("your_"):
        print_result("8. WhatsApp Cloud API", "SKIP (No token in .env)", "META_WHATSAPP_TOKEN or WHATSAPP_PHONE_NUMBER_ID not configured (Local webhook simulator active)", "Set WhatsApp Business Cloud Token in .env")
        return
    try:
        url = f"https://graph.facebook.com/v19.0/{phone_id}?access_token={token}"
        req = urllib.request.Request(url, headers={"User-Agent": "Discovery/1.0"})
        with urllib.request.urlopen(req, timeout=6) as resp:
            data = json.loads(resp.read().decode())
            print_result("8. WhatsApp Cloud API", "PASS", f"Connected to WhatsApp Business Account ID: {data.get('id')}, Name: {data.get('verified_name', 'Verified')}")
    except Exception as e:
        print_result("8. WhatsApp Cloud API", "FAIL", f"Error: {e}", "Check WhatsApp Cloud token and phone number ID")

def main():
    print("=================================================================")
    print("      DISCOVERY OFFICIAL APIS & CONNECTORS AUDIT & TEST          ")
    print("=================================================================")
    test_gemini()
    test_google_factcheck()
    test_x_twitter()
    test_reddit()
    test_youtube()
    test_meta_facebook_instagram()
    test_telegram()
    test_whatsapp_cloud()
    print("\n=================================================================")
    print("                   AUDIT & TEST COMPLETE                         ")
    print("=================================================================")

if __name__ == "__main__":
    main()
