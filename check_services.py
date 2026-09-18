import urllib.request
import json
import time

print("=================================================================")
print("          DISCOVERY LIVE HEALTH & STATUS CHECK                   ")
print("=================================================================")
for port in range(8000, 8010):
    url = f"http://localhost:{port}/health"
    try:
        with urllib.request.urlopen(url, timeout=3) as resp:
            data = json.loads(resp.read().decode())
            print(f"  [OK] Port {port:4d}: {data.get('service', 'unknown'):<25} | status: {data.get('status')}")
    except Exception as exc:
        print(f"  [ERR] Port {port:4d}: Offline ({exc})")

print("\nChecking Dashboard Frontend (Port 3000)...")
try:
    with urllib.request.urlopen("http://localhost:3000/", timeout=3) as resp:
        print(f"  [OK] Port 3000: Discovery Dashboard UI online (HTTP {resp.status})")
except Exception as exc:
    print(f"  [ERR] Port 3000: Dashboard UI Offline ({exc})")
