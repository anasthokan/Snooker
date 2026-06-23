# GameHub Pro - Atozee RDP production deploy
# Run on RDP server (PowerShell as Administrator for firewall)

param(
    [int]$Port = 8010,
    [string]$PublicUrl = "http://74.208.184.175:8010"
)

$ErrorActionPreference = "Stop"
$Root = Split-Path $PSScriptRoot -Parent
$Backend = Join-Path $Root "game-hub-backend-main\game-hub-backend-main"
$VenvPython = Join-Path $Backend ".venv\Scripts\python.exe"

Write-Host "=== GameHub Pro - Atozee Deploy ===" -ForegroundColor Cyan
Write-Host "Root: $Root"
Write-Host "Backend: $Backend"
Write-Host "Port: $Port"
Write-Host "Public URL: $PublicUrl"

if (-not (Test-Path $VenvPython)) {
    Write-Host "Creating Python venv..." -ForegroundColor Yellow
    Set-Location $Backend
    python -m venv .venv
    $VenvPython = Join-Path $Backend ".venv\Scripts\python.exe"
}

Write-Host ""
Write-Host "[1/5] Checking backend dependencies..." -ForegroundColor Green
Set-Location $Backend
$depsOk = $false
& $VenvPython -c "import fastapi, sqlalchemy, psycopg2" 2>$null
if ($LASTEXITCODE -eq 0) { $depsOk = $true }
if ($depsOk) {
    Write-Host "Dependencies OK - skipping pip install."
} else {
    Write-Host "Installing dependencies..."
    & $VenvPython -m pip install -q -r requirements.txt
}

Write-Host ""
Write-Host "[2/5] Running database migrations..." -ForegroundColor Green
& $VenvPython -m alembic upgrade head

Write-Host ""
Write-Host "[3/5] Building frontend..." -ForegroundColor Green
Set-Location $Root
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    Write-Host "ERROR: npm not found. Install Node.js from https://nodejs.org" -ForegroundColor Red
    exit 1
}
npm install --silent 2>$null
npx vite build

Write-Host ""
Write-Host "[4/5] Updating .env for Atozee..." -ForegroundColor Green
$EnvFile = Join-Path $Backend ".env"
if (Test-Path $EnvFile) {
    $lines = Get-Content $EnvFile
    $foundPublic = $false
    $foundCors = $false
    $newLines = @()
    foreach ($line in $lines) {
        if ($line -match "^PUBLIC_APP_URL=") {
            $newLines += "PUBLIC_APP_URL=$PublicUrl"
            $foundPublic = $true
        } elseif ($line -match "^CORS_ORIGINS=") {
            if ($line -notmatch [regex]::Escape($PublicUrl)) {
                $newLines += "$line,$PublicUrl"
            } else {
                $newLines += $line
            }
            $foundCors = $true
        } else {
            $newLines += $line
        }
    }
    if (-not $foundPublic) { $newLines += "PUBLIC_APP_URL=$PublicUrl" }
    $newLines | Set-Content $EnvFile
}

Write-Host ""
Write-Host "[5/5] Opening Windows Firewall port $Port..." -ForegroundColor Green
try {
    $ruleName = "GameHub-Pro-$Port"
    if (-not (Get-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue)) {
        New-NetFirewallRule -DisplayName $ruleName -Direction Inbound -Protocol TCP -LocalPort $Port -Action Allow | Out-Null
        Write-Host "Firewall rule created: $ruleName"
    } else {
        Write-Host "Firewall rule already exists."
    }
} catch {
    Write-Host "Skip firewall - run as Admin to open port $Port" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=== Deploy complete ===" -ForegroundColor Cyan
Write-Host "Start server:  scripts\start-atozee.ps1"
Write-Host "Customer URL:  ${PublicUrl}/pay?tenant=1"
Write-Host "Staff login:   ${PublicUrl}/login"
