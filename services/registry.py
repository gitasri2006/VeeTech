"""
VeriScope Service Registry
Exposes all 10 agent services and submodules with clean import aliases
"""
import importlib
from typing import Any

def load_service(service_folder_name: str) -> Any:
    """Dynamically loads a service module from its TRD-named directory."""
    return importlib.import_module(f"services.{service_folder_name}.main")


# Dynamic loader accessors
def get_extraction_service():
    return load_service("extraction")

def get_entity_profile_service():
    return load_service("entity-profile")

def get_filtering_service():
    return load_service("filtering")

def get_contextual_validation_service():
    return load_service("contextual-validation")

def get_global_discovery_service():
    return load_service("global-discovery")

def get_multilingual_service():
    return load_service("multilingual")

def get_fact_checking_service():
    return load_service("fact-checking")

def get_source_intelligence_service():
    return load_service("source-intelligence")

def get_brief_clustering_service():
    return load_service("brief-clustering")

def get_whatsapp_bot_service():
    return load_service("whatsapp-bot")
