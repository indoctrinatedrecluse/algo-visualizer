# run.ps1 — one-command launcher for the Algo Visualizer.
#
# Creates a virtual environment if needed, installs runtime dependencies,
# and starts the server with auto-reload.
#
# Usage:
#   .\run.ps1
# If your PowerShell execution policy blocks scripts, use:
#   powershell -ExecutionPolicy Bypass -File .\run.ps1

$ErrorActionPreference = "Stop"

# Work from the project root regardless of where the script is invoked from.
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
if (-not $Root) { $Root = Get-Location }
Set-Location $Root

Write-Host "`n========================================================" -ForegroundColor Cyan
Write-Host " ALGO-VISUALIZER SERVER LAUNCHER" -ForegroundColor Cyan
Write-Host "========================================================`n" -ForegroundColor Cyan

# 1. Locate a working Python interpreter
function Get-PythonCommand {
    foreach ($candidate in @("python", "py")) {
        try {
            $ver = & $candidate --version 2>&1
            if ($LASTEXITCODE -eq 0) {
                Write-Host "[PASS] Found Python: $ver" -ForegroundColor Green
                return $candidate
            }
        } catch {}
    }
    throw "No Python interpreter found. Please install Python 3.10+ and add to PATH."
}

$Py = Get-PythonCommand
$PyArgs = @()
if ($Py -eq "py") { $PyArgs = @("-3") }

# 2. Virtual environment setup
$VenvPy = Join-Path $Root ".venv\Scripts\python.exe"
if (-not (Test-Path $VenvPy)) {
    Write-Host "[INFO] Creating virtual environment (.venv)..." -ForegroundColor Yellow
    & $Py @PyArgs -m venv .venv
    if ($LASTEXITCODE -ne 0) { throw "Failed to create the virtual environment." }
    Write-Host "[PASS] Virtual environment created successfully." -ForegroundColor Green
} else {
    Write-Host "[PASS] Virtual environment (.venv) detected." -ForegroundColor Green
}

# 3. Install/verify dependencies
Write-Host "[INFO] Verifying runtime dependencies from requirements.txt..." -ForegroundColor Yellow
& $VenvPy -m pip install --quiet --disable-pip-version-check -r requirements.txt
if ($LASTEXITCODE -ne 0) { throw "Failed to install dependencies." }
Write-Host "[PASS] Dependencies installed & up to date." -ForegroundColor Green

# 4. Launch server
$Port = if ($env:PORT) { $env:PORT } else { "8000" }

Write-Host "`n--------------------------------------------------------" -ForegroundColor DarkGray
Write-Host " SERVER READY" -ForegroundColor Cyan
Write-Host " * Local UI:     http://localhost:$Port" -ForegroundColor White
Write-Host " * API Docs:     http://localhost:$Port/docs" -ForegroundColor White
Write-Host " * WebSocket:    ws://localhost:$Port/ws" -ForegroundColor White
Write-Host " * Algorithms:   31 registered across 8 categories" -ForegroundColor White
Write-Host " * Press Ctrl+C to stop the server" -ForegroundColor DarkGray
Write-Host "--------------------------------------------------------`n" -ForegroundColor DarkGray

& $VenvPy -m uvicorn main:app --host 0.0.0.0 --port $Port --reload
