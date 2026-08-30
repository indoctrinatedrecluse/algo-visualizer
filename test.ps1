# PowerShell test runner for Algo-Visualizer
# Runs the full pytest test suite and generates a comprehensive tabular algorithm audit report.

$ErrorActionPreference = "Stop"

$repoRoot = $PSScriptRoot
if (-not $repoRoot) {
    $repoRoot = Get-Location
}

# Determine Python interpreter
$pythonExe = Join-Path $repoRoot ".venv\Scripts\python.exe"
if (-not (Test-Path $pythonExe)) {
    $pythonExe = "python"
}

Write-Host "`n========================================================" -ForegroundColor Cyan
Write-Host " Running Algo-Visualizer Unit Tests (pytest)" -ForegroundColor Cyan
Write-Host "========================================================`n" -ForegroundColor Cyan

& $pythonExe -m pytest (Join-Path $repoRoot "tests") -v
if ($LASTEXITCODE -ne 0) {
    Write-Host "`nPytest failed with exit code $LASTEXITCODE" -ForegroundColor Red
    exit $LASTEXITCODE
}

Write-Host "`n"
& $pythonExe (Join-Path $repoRoot "scripts\audit_algorithms.py")
if ($LASTEXITCODE -ne 0) {
    Write-Host "`nAlgorithm audit failed with exit code $LASTEXITCODE" -ForegroundColor Red
    exit $LASTEXITCODE
}

Write-Host "`nAll tests and algorithm audits passed successfully!`n" -ForegroundColor Green
exit 0
