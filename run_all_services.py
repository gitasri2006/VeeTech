"""
Discovery Local Multi-Service Orchestrator (Subprocess Engine)
Launches all 10 agent microservices on their designated TRD ports (8000-8009) concurrently.
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

def main():
    print("=================================================================", flush=True)
    print("       DISCOVERY AI-AGENT MULTI-SERVICE LOCAL RUNNER             ", flush=True)
    print("=================================================================", flush=True)

    repo_root = os.path.dirname(os.path.abspath(__file__))
    env = os.environ.copy()
    env["PYTHONPATH"] = repo_root

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
