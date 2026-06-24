# One-click: GitHub se latest code lao aur server paths par copy karo
# RDP server par PowerShell (Admin) mein chalao:
#   powershell -ExecutionPolicy Bypass -File C:\Projects\update-server-from-github.ps1
#
# Yeh script:
#   1. C:\Projects\Snooker par git clone / pull
#   2. Frontend -> C:\inetpub\wwwroot\GameHub
#   3. Backend  -> C:\Projects\game-hub-backend-main\game-hub-backend-main
#   (.env, .venv, uploads safe rehte hain)

$ErrorActionPreference = "Stop"

$RepoUrl = "https://github.com/anasthokan/Snooker.git"
$ClonePath = "C:\Projects\Snooker"
$DeployScript = Join-Path $ClonePath "scripts\deploy-server-iis.ps1"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host " GitHub -> Server Update" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    Write-Host "ERROR: Git installed nahi hai. Pehle install karein:" -ForegroundColor Red
    Write-Host "  https://git-scm.com/download/win"
    exit 1
}

if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    Write-Host "ERROR: Node.js/npm installed nahi hai." -ForegroundColor Red
    Write-Host "  https://nodejs.org"
    exit 1
}

New-Item -ItemType Directory -Force -Path "C:\Projects" | Out-Null

if (Test-Path (Join-Path $ClonePath ".git")) {
    Write-Host "Git pull: $ClonePath" -ForegroundColor Green
    Set-Location $ClonePath
    git pull origin main
} else {
    Write-Host "Git clone: $RepoUrl -> $ClonePath" -ForegroundColor Green
    git clone $RepoUrl $ClonePath
}

if (-not (Test-Path $DeployScript)) {
    Write-Host "ERROR: Deploy script not found: $DeployScript" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Deploy shuru..." -ForegroundColor Green
& $DeployScript -SourceRoot $ClonePath @args

Write-Host ""
Write-Host "Done. Ab folder dates update honi chahiye." -ForegroundColor Green
Write-Host "Backend:  C:\Projects\game-hub-backend-main\game-hub-backend-main" -ForegroundColor Cyan
Write-Host "Frontend: C:\inetpub\wwwroot\GameHub" -ForegroundColor Cyan
