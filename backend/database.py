import psycopg2
from psycopg2.extras import RealDictCursor
import os
from dotenv import load_dotenv

load_dotenv()

# Example: postgresql://postgres.trlscyxrplkgudrcezja:[YOUR-PASSWORD]@aws-0-eu-central-1.pooler.supabase.com:6543/postgres
DATABASE_URL = os.getenv("DATABASE_URL")

def get_db_connection():
    if not DATABASE_URL:
        raise Exception("DATABASE_URL environment variable is missing. Please set it to your Supabase Postgres connection string.")
    
    conn = psycopg2.connect(DATABASE_URL, cursor_factory=RealDictCursor)
    try:
        yield conn
    finally:
        conn.close()
