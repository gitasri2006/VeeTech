import os
import subprocess
import sys

def run_psql(args, dbname=None):
    psql_path = "C:/Program Files/PostgreSQL/18/bin/psql.exe"
    if not os.path.exists(psql_path):
        import glob
        matches = glob.glob("C:/Program Files/PostgreSQL/*/bin/psql.exe")
        if matches:
            psql_path = matches[0]
        else:
            raise FileNotFoundError("psql.exe not found in C:/Program Files/PostgreSQL")

    env = os.environ.copy()
    env["PGPASSWORD"] = "Gayu@300116"

    cmd = [
        psql_path,
        "-U", "postgres",
        "-h", "localhost",
        "-p", "5432",
    ]
    if dbname:
        cmd.extend(["-d", dbname])
    cmd.extend(args)

    res = subprocess.run(cmd, env=env, capture_output=True, text=True)
    return res

def main():
    print("=================================================================")
    print("      DISCOVERY POSTGRESQL DATABASE & SCHEMA INITIALIZER         ")
    print("=================================================================")

    # 1. Check/Create database 'discovery'
    print("[1/3] Checking if database 'discovery' exists...")
    res = run_psql(["-t", "-A", "-c", "SELECT 1 FROM pg_database WHERE datname='discovery';"])
    if "1" not in res.stdout.strip():
        print("      Creating database 'discovery'...")
        create_res = run_psql(["-c", "CREATE DATABASE discovery;"])
        if create_res.returncode != 0:
            print(f"Error creating database: {create_res.stderr}")
            sys.exit(1)
        print("      Database 'discovery' created successfully!")
    else:
        print("      Database 'discovery' already exists.")

    # 2. Execute init_schema.sql
    print("\n[2/3] Executing schema migrations in 'discovery' database...")
    schema_file = os.path.join(os.path.dirname(__file__), "init_schema.sql")
    res = run_psql(["-f", schema_file], dbname="discovery")
    if res.returncode != 0:
        print(f"Schema execution notice/error: {res.stderr}")
    else:
        print("      Schema migration completed successfully!")

    # 3. List all created tables
    print("\n[3/3] Inspecting created tables in 'discovery'...")
    res = run_psql(["-t", "-A", "-c", "SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name;"], dbname="discovery")
    tables = [t for t in res.stdout.strip().split("\n") if t]
    print(f"      Total tables created: {len(tables)}")
    for t in tables:
        print(f"      - {t}")

    print("\n[OK] PostgreSQL database 'discovery' is ready for pgAdmin inspection!")

if __name__ == "__main__":
    main()
