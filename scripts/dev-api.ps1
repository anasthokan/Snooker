# Start only the FastAPI backend (port 8000)
$Root = Split-Path $PSScriptRoot -Parent
$Backend = Join-Path $Root "game-hub-backend-main\game-hub-backend-main"
$VenvPython = Join-Path $Backend ".venv\Scripts\python.exe"

Set-Location $Backend
Write-Host "GameHub API -> http://127.0.0.1:8000 (docs: /docs)" -ForegroundColor Cyan
& $VenvPython -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
