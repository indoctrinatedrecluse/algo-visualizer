# run.ps1 — one-command launcher for the Algo Visualizer.
#
# Creates a virtual environment if needed, installs the runtime dependencies,
# and starts the server on http://localhost:8080 (override with the PORT
# environment variable).
#
# Usage:
#   .\run.ps1
# If your PowerShell execution policy blocks scripts, use:
#   powershell -ExecutionPolicy Bypass -File run.ps1

$ErrorActionPreference = "Stop"

# Work from the project root regardless of where the script is invoked from.
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $Root

# --- locate a working Python interpreter (python, else the py launcher) ---
function Get-PythonCommand {
    foreach ($candidate in @("python", "py")) {
        & $candidate --version 2>$null | Out-Null
        if ($LASTEXITCODE -eq 0) { return $candidate }
    }
    throw "No Python interpreter found. Install Python 3.10+ and try again."
}

$Py = Get-PythonCommand
$PyArgs = @()
if ($Py -eq "py") { $PyArgs = @("-3") }

# --- virtual environment --------------------------------------------------
$VenvPy = Join-Path $Root ".venv\Scripts\python.exe"
if (-not (Test-Path $VenvPy)) {
    Write-Host "Creating virtual environment (.venv)..."
    & $Py @PyArgs -m venv .venv
    if ($LASTEXITCODE -ne 0) { throw "Failed to create the virtual environment." }
}

Write-Host "Installing dependencies..."
& $VenvPy -m pip install --quiet -r requirements.txt
if ($LASTEXITCODE -ne 0) { throw "Failed to install dependencies." }

# --- run ------------------------------------------------------------------
$Port = if ($env:PORT) { $env:PORT } else { "8080" }
Write-Host "Starting Algo Visualizer on http://localhost:$Port  (Ctrl+C to stop)"
& $VenvPy -m uvicorn main:app --host 0.0.0.0 --port $Port
