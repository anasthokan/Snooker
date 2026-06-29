# Start GameHub Pro locally: API (8000) + Vite frontend
$Root = Split-Path $PSScriptRoot -Parent
$Backend = Join-Path $Root "game-hub-backend-main\game-hub-backend-main"
$VenvPython = Join-Path $Backend ".venv\Scripts\python.exe"

if (-not (Test-Path $VenvPython)) {
    Write-Host "Backend venv not found at $VenvPython" -ForegroundColor Red
    exit 1
}

Write-Host "Starting API on http://127.0.0.1:8000 ..." -ForegroundColor Cyan
Start-Process -FilePath $VenvPython -ArgumentList "-m","uvicorn","app.main:app","--host","127.0.0.1","--port","8000","--reload" -WorkingDirectory $Backend -WindowStyle Normal

Start-Sleep -Seconds 2
Write-Host "Starting frontend (Vite) ..." -ForegroundColor Cyan
Set-Location $Root
npm run dev
