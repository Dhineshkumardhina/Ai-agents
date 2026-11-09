#!/usr/bin/env bash
# ==============================================================================
# XEROVA AI DEVFORCE — Test Suite Execution Script (Bash)
# ==============================================================================
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

echo "Running Backend Pytest Suite..."
(
    cd "$ROOT_DIR/backend"
    python -m pytest
)

echo "Running Frontend Vitest Suite..."
(
    cd "$ROOT_DIR/frontend"
    npm run test
)

echo "All DEVFORCE tests passed successfully!"

