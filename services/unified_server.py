"""
Discovery Unified Multi-Agent Master Gateway
Mounts all 10 agent services into a single high-performance FastAPI server running on Port 8000.
"""

import asyncio
from contextlib import asynccontextmanager
import importlib.util
import logging
import os
import sys
from typing import Dict, Any

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

# Load environment variables
repo_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if repo_root not in sys.path:
    sys.path.insert(0, repo_root)

dotenv_path = os.path.join(repo_root, ".env")
load_dotenv(dotenv_path)

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("discovery.unified_gateway")

# Service definitions: (name, relative_path, prefix)
SERVICES = [
    ("extraction", "services/extraction/main.py", "/api/extraction"),
    ("filtering", "services/filtering/main.py", "/api/filtering"),
    ("entity_profile", "services/entity-profile/main.py", "/api/entity-profile"),
    ("contextual_validation", "services/contextual-validation/main.py", "/api/contextual-validation"),
    ("global_discovery", "services/global-discovery/main.py", "/api/discovery"),
    ("multilingual", "services/multilingual/main.py", "/api/multilingual"),
    ("fact_checking", "services/fact-checking/main.py", "/api/factcheck"),
    ("source_intelligence", "services/source-intelligence/main.py", "/api/sources"),
    ("whatsapp_bot", "services/whatsapp-bot/main.py", "/api/whatsapp"),
    ("brief_clustering", "services/brief-clustering/main.py", "/api/briefs"),
]


# Load background scheduler
try:
    spec_sched = importlib.util.spec_from_file_location("scheduler", os.path.join(repo_root, "services/global-discovery/scheduler.py"))
    mod_sched = importlib.util.module_from_spec(spec_sched)
    spec_sched.loader.exec_module(mod_sched)
    scheduler = getattr(mod_sched, "scheduler", None)
except Exception as sched_err:
    logger.warning("Could not load scheduler: %s", sched_err)
    scheduler = None


@asynccontextmanager
async def master_lifespan(app: FastAPI):
    logger.info("=================================================================")
    logger.info("     DISCOVERY UNIFIED AI AGENT MASTER SERVER STARTING (PORT 8000)")
    logger.info("=================================================================")
    if scheduler:
        scheduler.start()
        logger.info("Autonomous background ingestion scheduler started.")
    yield
    if scheduler:
        scheduler.stop()
    logger.info("Discovery Unified Master Server shutting down.")


master_app = FastAPI(
    title="Discovery Unified AI Intelligence Platform",
    description="Consolidated Single-Port Gateway for all 10 Discovery Agent Services",
    version="3.5.0",
    lifespan=master_lifespan,
)

master_app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Dynamically load and mount each service sub-app
mounted_services = {}
for name, rel_path, prefix in SERVICES:
    full_path = os.path.join(repo_root, rel_path)
    try:
        spec = importlib.util.spec_from_file_location(name, full_path)
        if spec and spec.loader:
            mod = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(mod)
            sub_app = getattr(mod, "app", None)
            if sub_app:
                master_app.mount(prefix, sub_app)
                mounted_services[name] = prefix
                logger.info("Mounted agent service: %-22s -> %s", name, prefix)
    except Exception as exc:
        logger.error("Failed to load/mount service %s (%s): %s", name, rel_path, exc)


@master_app.get("/", tags=["System"])
async def root():
    return {
        "platform": "Discovery AI Intelligence Engine",
        "status": "online",
        "port": 8000,
        "mode": "unified_gateway",
        "services_count": len(mounted_services),
        "mounted_services": mounted_services,
    }


@master_app.get("/health", tags=["System"])
async def health():
    return {
        "status": "healthy",
        "services": list(mounted_services.keys()),
        "total_active": len(mounted_services),
    }


def start():
    port = int(os.getenv("UNIFIED_PORT", "8000"))
    uvicorn.run("services.unified_server:master_app", host="0.0.0.0", port=port, reload=False)


if __name__ == "__main__":
    start()
