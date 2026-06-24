# GameHub Pro - Deploy updated code to IIS server
# Run on RDP server (PowerShell). Preserves backend .env, .venv, uploads.
#
# Example (after git pull on server):
#   cd C:\Projects\Snooker\scripts
#   .\deploy-server-iis.ps1
#
# Or with custom paths:
#   .\deploy-server-iis.ps1 -SourceRoot "D:\code\3Snooker" -ApiUrl "https://snooker-apis.atozeesolutions.com"

param(
    [string]$SourceRoot = "",
    [string]$FrontendDeployPath = "C:\inetpub\wwwroot\GameHub",
    [string]$BackendDeployPath = "C:\Projects\game-hub-backend-main\game-hub-backend-main",
    [string]$ApiUrl = "https://snooker-apis.atozeesolutions.com",
    [switch]$SkipBuild,
    [switch]$SkipIisReset
)

$ErrorActionPreference = "Stop"

if (-not $SourceRoot) {
    $SourceRoot = Split-Path $PSScriptRoot -Parent
}

$BackendSource = Join-Path $SourceRoot "game-hub-backend-main\game-hub-backend-main"
$VenvPython = Join-Path $BackendDeployPath ".venv\Scripts\python.exe"
$DistDir = Join-Path $SourceRoot "dist"
$WebConfig = Join-Path $SourceRoot "deploy\frontend-web.config"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host " GameHub Pro - Server Deploy" -ForegroundColor Cyan
Write-Host " Source:   $SourceRoot" -ForegroundColor Cyan
Write-Host " Frontend: $FrontendDeployPath" -ForegroundColor Cyan
Write-Host " Backend:  $BackendDeployPath" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

if (-not (Test-Path $BackendSource)) {
    Write-Host "ERROR: Backend source not found: $BackendSource" -ForegroundColor Red
    exit 1
}

function Invoke-Robocopy {
    param([string]$From, [string]$To, [string[]]$ExtraArgs = @())
    $base = @($From, $To, "/E", "/NFL", "/NDL", "/NJH", "/NJS") + $ExtraArgs
    & robocopy @base | Out-Null
    if ($LASTEXITCODE -ge 8) { throw "robocopy failed ($LASTEXITCODE): $From -> $To" }
}

# --- Frontend build ---
if (-not $SkipBuild) {
    Write-Host "`n[1/6] Building frontend..." -ForegroundColor Green
    if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
        Write-Host "ERROR: npm not found. Install Node.js on the server." -ForegroundColor Red
        exit 1
    }
    Set-Location $SourceRoot
    if (-not (Test-Path "node_modules")) {
        npm ci
    }
    if ($ApiUrl) {
        $env:VITE_API_BASE_URL = $ApiUrl
        Write-Host "VITE_API_BASE_URL=$ApiUrl"
    }
    npm run build:split
    if (-not (Test-Path (Join-Path $DistDir "index.html"))) {
        Write-Host "ERROR: dist\index.html not found after build." -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "`n[1/6] Skipping frontend build (-SkipBuild)" -ForegroundColor Yellow
}

# Enable IIS ARR reverse proxy (frontend web.config forwards /auth/* to API host)
try {
    Import-Module WebAdministration -ErrorAction SilentlyContinue
    Set-WebConfigurationProperty -pspath 'MACHINE/WEBROOT/APPHOST' -filter "system.webServer/proxy" -name "enabled" -value "True" -ErrorAction SilentlyContinue
} catch {
    Write-Host "WARN: Enable ARR proxy manually if API proxy rules fail." -ForegroundColor Yellow
}

# --- Deploy frontend to IIS wwwroot ---
Write-Host "`n[2/6] Deploying frontend -> $FrontendDeployPath" -ForegroundColor Green
New-Item -ItemType Directory -Force -Path $FrontendDeployPath | Out-Null
Invoke-Robocopy -From $DistDir -To $FrontendDeployPath
if (Test-Path $WebConfig) {
    Copy-Item $WebConfig (Join-Path $FrontendDeployPath "web.config") -Force
    Write-Host "web.config copied."
} else {
    Write-Host "WARN: deploy\frontend-web.config missing - SPA routes may 404 on refresh." -ForegroundColor Yellow
}

# --- Deploy backend (keep .env, venv, uploads, logs) ---
Write-Host "`n[3/6] Deploying backend -> $BackendDeployPath" -ForegroundColor Green
New-Item -ItemType Directory -Force -Path $BackendDeployPath | Out-Null
Invoke-Robocopy -From $BackendSource -To $BackendDeployPath -ExtraArgs @(
    "/XD", ".venv", "__pycache__", ".pytest_cache", "logs", "static_app",
    "/XF", ".env"
)

# --- Python venv + dependencies ---
Write-Host "`n[4/6] Python dependencies..." -ForegroundColor Green
if (-not (Test-Path $VenvPython)) {
    Set-Location $BackendDeployPath
    python -m venv .venv
}
& $VenvPython -m pip install --upgrade pip -q
& $VenvPython -m pip install -r (Join-Path $BackendDeployPath "requirements.txt") -q
& $VenvPython -m pip install reportlab -q

# --- Database migrations ---
Write-Host "`n[5/6] Database migrations..." -ForegroundColor Green
Set-Location $BackendDeployPath
& $VenvPython -m alembic upgrade head

# --- Restart IIS ---
if (-not $SkipIisReset) {
    Write-Host "`n[6/6] Restarting IIS..." -ForegroundColor Green
    iisreset /restart
} else {
    Write-Host "`n[6/6] Skipping IIS restart (-SkipIisReset)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=== Deploy complete ===" -ForegroundColor Green
Write-Host "Frontend folder: $FrontendDeployPath"
Write-Host "Backend folder:  $BackendDeployPath"
Write-Host ""
Write-Host "If frontend cannot reach API, rebuild with API URL:" -ForegroundColor Yellow
Write-Host '  .\deploy-server-iis.ps1 -ApiUrl "https://YOUR-API-DOMAIN"'
