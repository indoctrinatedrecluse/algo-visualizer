#!/usr/bin/env bash
# run.sh — one-command launcher for the Algo Visualizer.
#
# Creates a virtual environment if needed, installs runtime dependencies,
# and starts the server with auto-reload.
#
# Usage:
#   ./run.sh        (macOS / Linux / Replit / git-bash on Windows)

set -euo pipefail
cd "$(dirname "$0")"

echo ""
echo "========================================================"
echo " ALGO-VISUALIZER SERVER LAUNCHER"
echo "========================================================="
echo ""

# 1. Locate working Python interpreter
PYTHON=""
for candidate in python3 python; do
    if command -v "$candidate" >/dev/null 2>&1; then
        PYTHON="$candidate"
        break
    fi
done

if [ -z "$PYTHON" ]; then
    echo "[ERROR] No Python interpreter found (tried python3, python)." >&2
    echo "Please install Python 3.10+ and add it to your PATH." >&2
    exit 1
fi

PY_VER=$("$PYTHON" --version 2>&1)
echo "[PASS] Found Python: $PY_VER"

# 2. Virtual environment setup
VENV_PY=""
if [ -x ".venv/bin/python" ]; then
    VENV_PY=".venv/bin/python"
    echo "[PASS] Virtual environment (.venv) detected."
elif [ -x ".venv/Scripts/python.exe" ]; then
    VENV_PY=".venv/Scripts/python.exe"
    echo "[PASS] Virtual environment (.venv) detected."
else
    echo "[INFO] Creating virtual environment (.venv)..."
    "$PYTHON" -m venv .venv
    if [ -x ".venv/bin/python" ]; then
        VENV_PY=".venv/bin/python"
    elif [ -x ".venv/Scripts/python.exe" ]; then
        VENV_PY=".venv/Scripts/python.exe"
    else
        echo "[ERROR] Virtual environment created but no python executable found in it." >&2
        exit 1
    fi
    echo "[PASS] Virtual environment created successfully."
fi

# 3. Install/verify dependencies
echo "[INFO] Verifying runtime dependencies from requirements.txt..."
"$VENV_PY" -m pip install --quiet --disable-pip-version-check -r requirements.txt
echo "[PASS] Dependencies installed & up to date."

# 4. Launch server
PORT="${PORT:-8000}"

echo ""
echo "--------------------------------------------------------"
echo " SERVER READY"
echo " * Local UI:     http://localhost:${PORT}"
echo " * API Docs:     http://localhost:${PORT}/docs"
echo " * WebSocket:    ws://localhost:${PORT}/ws"
echo " * Algorithms:   31 registered across 8 categories"
echo " * Press Ctrl+C to stop the server"
echo "--------------------------------------------------------"
echo ""

exec "$VENV_PY" -m uvicorn main:app --host 0.0.0.0 --port "$PORT" --reload
