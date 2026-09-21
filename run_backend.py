"""
Discovery Single-Process Backend Launcher
Starts the consolidated FastAPI server on port 8000.
"""

import os
import sys

repo_root = os.path.dirname(os.path.abspath(__file__))
if repo_root not in sys.path:
    sys.path.insert(0, repo_root)

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("UNIFIED_PORT", "8000"))
    print("=================================================================", flush=True)
    print(f"       DISCOVERY UNIFIED AI AGENT MASTER RUNNER (PORT {port})   ", flush=True)
    print("=================================================================", flush=True)
    uvicorn.run("services.unified_server:master_app", host="0.0.0.0", port=port, log_level="info")
