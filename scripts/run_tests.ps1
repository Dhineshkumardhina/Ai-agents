# ==============================================================================
# XEROVA AI DEVFORCE — Test Suite Execution Script (PowerShell)
# Runs Pytest (Backend) and Vitest (Frontend)
# ==============================================================================

$RootPath = (Get-Item $PSScriptRoot).Parent.FullName

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "  Running DEVFORCE Verification Suites   " -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan

# 1. Backend tests
Write-Host "`n[1/2] Running Backend Pytest Suite..." -ForegroundColor Green
Push-Location "$RootPath\backend"
python -m pytest
$PytestExit = $LASTEXITCODE
Pop-Location

if ($PytestExit -ne 0)
{
    Write-Host "Backend tests failed with exit code $PytestExit" -ForegroundColor Red
    exit $PytestExit
}

# 2. Frontend tests
Write-Host "`n[2/2] Running Frontend Vitest Suite..." -ForegroundColor Green
Push-Location "$RootPath\frontend"
npm run test
$VitestExit = $LASTEXITCODE
Pop-Location

if ($VitestExit -ne 0)
{
    Write-Host "Frontend tests failed with exit code $VitestExit" -ForegroundColor Red
    exit $VitestExit
}

Write-Host "`nAll DEVFORCE tests passed successfully!" -ForegroundColor Green
exit 0

