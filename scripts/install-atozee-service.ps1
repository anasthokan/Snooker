# Install GameHub as Windows Service (runs after RDP logout / server reboot)
# Requires NSSM: choco install nssm  OR download from https://nssm.cc
param([int]$Port = 8010)

$Root = Split-Path $PSScriptRoot -Parent
$Backend = Join-Path $Root "game-hub-backend-main\game-hub-backend-main"
$Python = Join-Path $Backend ".venv\Scripts\python.exe"
$Nssm = Get-Command nssm -ErrorAction SilentlyContinue

if (-not $Nssm) {
    Write-Host "NSSM not found. Install: winget install NSSM.NSSM" -ForegroundColor Red
    Write-Host "Or use Task Scheduler / start-atozee.ps1 manually."
    exit 1
}

$ServiceName = "GameHubPro"
nssm stop $ServiceName 2>$null
nssm remove $ServiceName confirm 2>$null

nssm install $ServiceName $Python "-m" "uvicorn" "app.main:app" "--host" "0.0.0.0" "--port" $Port
nssm set $ServiceName AppDirectory $Backend
nssm set $ServiceName DisplayName "GameHub Pro API"
nssm set $ServiceName Description "GameHub Pro snooker parlour SaaS"
nssm set $ServiceName Start SERVICE_AUTO_START
nssm start $ServiceName

Write-Host "Service $ServiceName installed and started on port $Port" -ForegroundColor Green
