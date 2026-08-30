#!/usr/bin/env bash
# Shell test runner for Algo-Visualizer
# Runs the full pytest test suite and generates a comprehensive tabular algorithm audit report.

set -e

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"

# Determine Python interpreter
if [ -f "$DIR/.venv/bin/python" ]; then
    PYTHON="$DIR/.venv/bin/python"
elif [ -f "$DIR/.venv/Scripts/python.exe" ]; then
    PYTHON="$DIR/.venv/Scripts/python.exe"
elif command -v python3 >/dev/null 2>&1; then
    PYTHON="python3"
else
    PYTHON="python"
fi

echo ""
echo "========================================================"
echo " Running Algo-Visualizer Unit Tests (pytest)"
echo "========================================================"
echo ""

"$PYTHON" -m pytest "$DIR/tests" -v

echo ""
"$PYTHON" "$DIR/scripts/audit_algorithms.py"

echo ""
echo "All tests and algorithm audits passed successfully! ✓"
echo ""
