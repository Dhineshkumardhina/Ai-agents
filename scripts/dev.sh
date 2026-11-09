#!/usr/bin/env bash
# ==============================================================================
# XEROVA AI DEVFORCE — Development Startup Script (Bash)
# ==============================================================================
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

echo "Starting XEROVA AI DEVFORCE services..."

# Start backend
(
    cd "$ROOT_DIR/backend"
    uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
) &
BACKEND_PID=$!

# Start frontend
(
    cd "$ROOT_DIR/frontend"
    npm run dev
) &
FRONTEND_PID=$!

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null || true" EXIT INT TERM

wait

