import urllib.request
import json
import psycopg2
import sys

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

BASE_URL = "http://localhost:8004/api/v1/discovery/search"
PG_URI = "postgresql://postgres:Gayu%40300116@localhost:5432/discovery"

def get_pg_article_count():
    conn = psycopg2.connect(PG_URI)
    cur = conn.cursor()
    cur.execute("SELECT COUNT(*) FROM articles;")
    count = cur.fetchone()[0]
    cur.close()
    conn.close()
    return count

def run_query(query, target_lang="en"):
    req = urllib.request.Request(
        BASE_URL,
        data=json.dumps({"query": query, "input_modality": "text", "target_language": target_lang}).encode("utf-8"),
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read().decode("utf-8"))

def main():
    print("=================================================================")
    print("      DISCOVERY LIVE DATA FORENSIC AUDIT & PIPELINE TRACE        ")
    print("=================================================================")
    
    # Check Initial DB Count
    initial_count = get_pg_article_count()
    print(f"\n[PostgreSQL DB] Initial Articles Count (X): {initial_count}")
    
    test_queries = [
        ("OpenAI", "Artificial intelligence, frontier models & Sora"),
        ("NVIDIA", "GPU architecture, Blackwell chips & semiconductor market"),
        ("ISRO Gaganyaan", "Indian human spaceflight program & launch timeline"),
        ("xyznonexistentrandomtopic987654321", "Negative test for non-existent keyword")
    ]
    
    results_summary = []
    
    for q, desc in test_queries:
        print(f"\n--- Testing Query: '{q}' ({desc}) ---")
        before_count = get_pg_article_count()
        res = run_query(q)
        after_count = get_pg_article_count()
        
        intel = res.get("intelligence_result", {})
        sources = res.get("sources", [])
        candidates_count = res.get("candidates_count", 0)
        
        print(f"  Title: {intel.get('title')}")
        print(f"  Candidates Discovered: {candidates_count}")
        print(f"  Sources Returned: {len(sources)}")
        print(f"  DB Count Before: {before_count} | DB Count After: {after_count} (New Persisted: {after_count - before_count})")
        
        # Show top 2 sources with exact URLs
        for s in sources[:2]:
            print(f"    * [{s.get('source_tier')}] {s.get('source')} -> {s.get('title')}")
            print(f"      URL: {s.get('url')}")
            
        results_summary.append({
            "query": q,
            "candidates": candidates_count,
            "sources": len(sources),
            "persisted": after_count - before_count,
            "verdict": intel.get("authenticity_verdict"),
            "sample_url": sources[0].get("url") if sources else "None"
        })
        
    final_count = get_pg_article_count()
    print(f"\n[PostgreSQL DB] Final Articles Count (Y): {final_count}")
    print(f"Total New Real Articles Persisted across all searches: {final_count - initial_count}")
    assert final_count > initial_count, f"Database persistence verification failed! Y ({final_count}) <= X ({initial_count})"
    print("Database Persistence Check Passed: Y > X verified directly in PostgreSQL!")

if __name__ == "__main__":
    main()
