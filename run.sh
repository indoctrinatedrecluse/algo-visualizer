#!/usr/bin/env bash
# run.sh — one-command launcher for the Algo Visualizer.
#
# Creates a virtual environment if needed, installs the runtime dependencies,
# and starts the server on http://localhost:8080 (override with the PORT
# environment variable).
#
# Usage:  ./run.sh        (macOS / Linux / Replit / git-bash on Windows)

set -euo pipefail
cd "$(dirname "$0")"

# --- locate a working Python interpreter -----------------------------------
PYTHON=""
for candidate in python3 python; do
    if command -v "$candidate" >/dev/null 2>&1; then
        PYTHON="$candidate"
        break
    fi
done
if [ -z "$PYTHON" ]; then
    echo "error: no Python interpreter found (tried python3, python)" >&2
    exit 1
fi

# --- virtual environment -----------------------------------------------------
VENV_PY=""
if [ -x ".venv/bin/python" ]; then
    VENV_PY=".venv/bin/python"
elif [ -x ".venv/Scripts/python.exe" ]; then
    VENV_PY=".venv/Scripts/python.exe"   # git-bash on Windows
else
    echo "Creating virtual environment (.venv)..."
    "$PYTHON" -m venv .venv
    if [ -x ".venv/bin/python" ]; then
        VENV_PY=".venv/bin/python"
    elif [ -x ".venv/Scripts/python.exe" ]; then
        VENV_PY=".venv/Scripts/python.exe"
    else
        echo "error: virtual environment created but no python found in it" >&2
        exit 1
    fi
fi

echo "Installing dependencies..."
"$VENV_PY" -m pip install --quiet -r requirements.txt

PORT="${PORT:-8080}"
echo "Starting Algo Visualizer on http://localhost:${PORT}  (Ctrl+C to stop)"
exec "$VENV_PY" -m uvicorn main:app --host 0.0.0.0 --port "$PORT"
