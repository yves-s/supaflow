#!/usr/bin/env bash
set -euo pipefail

DASHBOARD_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$DASHBOARD_DIR"

# Check for .env
if [ ! -f .env ]; then
  echo "❌ No .env file found in assets/dashboard/"
  echo ""
  echo "Copy .env.example to .env and fill in your Supabase credentials:"
  echo "  cp .env.example .env"
  echo ""
  echo "You need:"
  echo "  VITE_SUPABASE_URL    — your Supabase project URL"
  echo "  VITE_SUPABASE_ANON_KEY — your Supabase anon/public key"
  exit 1
fi

# Load and display connection info
source .env 2>/dev/null || true
echo "🔌 Supabase: ${VITE_SUPABASE_URL:-not set}"
echo ""

# Check if seed data might be needed
echo "💡 If the dashboard shows no data, run seed.sql against your Supabase instance:"
echo "   psql \$DATABASE_URL -f seed.sql"
echo "   OR paste seed.sql into the Supabase SQL Editor"
echo ""

# Start dev server
echo "🚀 Starting dashboard dev server..."
npx vite
