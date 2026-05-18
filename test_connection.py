import psycopg2
import sys

try:
    print("Attempting to connect to PostgreSQL...")
    conn = psycopg2.connect(
        host="db.btujonsyeobxmycaxoyf.supabase.co",
        port=5432,
        database="postgres",
        user="postgres",
        password="@rF804t26522",
        connect_timeout=10
    )
    print("✓ Connection successful!")
    
    cursor = conn.cursor()
    cursor.execute("SELECT version();")
    version = cursor.fetchone()
    print(f"PostgreSQL version: {version[0]}")
    
    cursor.close()
    conn.close()
    
except Exception as e:
    print(f"✗ Connection failed: {e}")
    sys.exit(1)
