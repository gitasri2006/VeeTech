"""VeriScope Extraction Service Package"""
from services.extraction.main import app, ingest_article, compute_content_hash, extract_static_html, parse_rss_with_xml_fallback
