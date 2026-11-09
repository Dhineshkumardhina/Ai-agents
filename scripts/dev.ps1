# ==============================================================================
# XEROVA AI DEVFORCE — Development Startup Script (PowerShell)
# Starts Backend (FastAPI) and Frontend (Vite) in development mode
# ==============================================================================

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "  Starting XEROVA AI DEVFORCE Platform   " -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan

$RootPath = (Get-Item $PSScriptRoot).Parent.FullName

# Start Backend
Write-Host "`n[1/2] Starting FastAPI Backend on http://localhost:8000..." -ForegroundColor Green
$BackendProcess = Start-Process -FilePath "python" -ArgumentList "-m", "uvicorn", "app.main:app", "--reload", "--host", "0.0.0.0", "--port", "8000" -WorkingDirectory "$RootPath\backend" -PassThru

# Start Frontend
Write-Host "[2/2] Starting Vite Frontend on http://localhost:5173..." -ForegroundColor Green
$FrontendProcess = Start-Process -FilePath "npm" -ArgumentList "run", "dev" -WorkingDirectory "$RootPath\frontend" -PassThru

Write-Host "`nDevForce services are running!" -ForegroundColor Cyan
Write-Host "Frontend: http://localhost:5173" -ForegroundColor White
Write-Host "Backend:  http://localhost:8000/docs" -ForegroundColor White
Write-Host "Health:   http://localhost:8000/api/v1/health" -ForegroundColor White
Write-Host "`nPress Ctrl+C to stop both services..." -ForegroundColor Yellow

try {
    Wait-Process -Id $BackendProcess.Id, $FrontendProcess.Id
} finally {
    Write-Host "`nShutting down DevForce services..." -ForegroundColor Yellow
    Stop-Process -Id $BackendProcess.Id -ErrorAction SilentlyContinue
    Stop-Process -Id $FrontendProcess.Id -ErrorAction SilentlyContinue
}

