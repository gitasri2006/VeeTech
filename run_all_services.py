"""
Discovery Local Multi-Service Orchestrator (Subprocess Engine)
Launches all 10 agent microservices on their designated TRD ports (8000-8009) concurrently.
Loads configuration automatically from .env.
"""

import os
import subprocess
import sys
import time

SERVICES = [
    ("extraction", 8000),
    ("filtering", 8001),
    ("entity-profile", 8002),
    ("contextual-validation", 8003),
    ("global-discovery", 8004),
    ("multilingual", 8005),
    ("fact-checking", 8006),
    ("source-intelligence", 8007),
    ("whatsapp-bot", 8008),
    ("brief-clustering", 8009),
]

def load_dotenv_file(dotenv_path: str, target_env: dict):
    """Load key-value pairs from a .env file into environment dictionary."""
    if not os.path.exists(dotenv_path):
        return
    try:
        with open(dotenv_path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith("#"):
                    continue
                if "=" in line:
                    key, val = line.split("=", 1)
                    key = key.strip()
                    val = val.strip().strip("'\"")
                    target_env[key] = val
    except Exception as e:
        print(f"Warning: Failed to load .env: {e}", flush=True)

def main():
    print("=================================================================", flush=True)
    print("       DISCOVERY AI-AGENT MULTI-SERVICE LOCAL RUNNER             ", flush=True)
    print("=================================================================", flush=True)

    repo_root = os.path.dirname(os.path.abspath(__file__))
    env = os.environ.copy()
    env["PYTHONPATH"] = repo_root
    
    dotenv_path = os.path.join(repo_root, ".env")
    load_dotenv_file(dotenv_path, env)
    print(f"[Discovery] Loaded environment settings from: {dotenv_path}", flush=True)

    procs = []
    for name, port in SERVICES:
        app_dir = os.path.join(repo_root, "services", name)
        cmd = [
            sys.executable,
            "-m",
            "uvicorn",
            "main:app",
            "--app-dir",
            app_dir,
            "--host",
            "0.0.0.0",
            "--port",
            str(port),
            "--log-level",
            "warning",
        ]
        p = subprocess.Popen(cmd, env=env, cwd=repo_root)
        procs.append((name, port, p))
        print(f"[Discovery] Launched {name.upper():<22} on http://localhost:{port}", flush=True)

    print("\nAll 10 services running on localhost. Press Ctrl+C to stop.\n", flush=True)
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\nStopping all services...", flush=True)
        for name, port, p in procs:
            p.terminate()
        print("Done.", flush=True)

if __name__ == "__main__":
    main()
