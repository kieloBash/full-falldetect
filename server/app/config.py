import os
from dotenv import load_dotenv

load_dotenv()

FRONTEND_INGEST_URL = os.getenv("FRONTEND_INGEST_URL", "http://localhost:3000/api/monitor/ingest")
INGEST_SECRET = os.getenv("MONITOR_INGEST_SECRET")

if not INGEST_SECRET:
    raise RuntimeError("MONITOR_INGEST_SECRET is not set")