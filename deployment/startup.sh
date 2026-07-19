#!/bin/bash
# StadiumIQ AI - Google Cloud Run startup entrypoint script
set -e

echo "=== STADIUMIQ BACKEND STARTUP ==="

# 1. Run migrations and database seeds on Postgres
if [ -n "$DATABASE_URL" ]; then
  echo "DATABASE_URL detected. Executing remote database migrations & seeding..."
  python backend/database/connection.py
  python scripts/seed_supabase.py
else
  echo "DATABASE_URL is not set. Defaulting to local SQLite schema..."
fi

# 2. Start FastAPI Server under Gunicorn/Uvicorn binding to active Cloud Run PORT
PORT_NUMBER=${PORT:-8000}
echo "Starting application server on port $PORT_NUMBER..."
exec uvicorn backend.main:app --host 0.0.0.0 --port "$PORT_NUMBER" --workers 4
