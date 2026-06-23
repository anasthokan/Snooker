# Start GameHub Pro on Atozee RDP (production)
param([int]$Port = 8010)

$Root = Split-Path $PSScriptRoot -Parent
$Backend = Join-Path $Root "game-hub-backend-main\game-hub-backend-main"
$VenvPython = Join-Path $Backend ".venv\Scripts\python.exe"

Set-Location $Backend
Write-Host "Starting GameHub Pro on 0.0.0.0:$Port ..." -ForegroundColor Cyan
Write-Host "Press Ctrl+C to stop."
& $VenvPython -m uvicorn app.main:app --host 0.0.0.0 --port $Port
