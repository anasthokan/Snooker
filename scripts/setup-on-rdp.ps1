# One-click setup on Atozee RDP server (74.208.184.175)
# Run as Administrator after copying project folder to server

param(
    [int]$Port = 8010,
    [string]$PublicUrl = "http://74.208.184.175:8010"
)

$ErrorActionPreference = "Stop"
$Root = Split-Path $PSScriptRoot -Parent
$Backend = Join-Path $Root "game-hub-backend-main\game-hub-backend-main"
$VenvPython = Join-Path $Backend ".venv\Scripts\python.exe"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host " GameHub Pro - Atozee RDP Setup" -ForegroundColor Cyan
Write-Host " Server: 74.208.184.175" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# 1. Check PostgreSQL
Write-Host "`n[1] Checking PostgreSQL..." -ForegroundColor Green
$pg = Get-Service -Name "postgresql*" -ErrorAction SilentlyContinue | Where-Object { $_.Status -eq "Running" }
if ($pg) {
    Write-Host "PostgreSQL running: $($pg.Name)"
} else {
    Write-Host "WARNING: PostgreSQL service not found. Install PostgreSQL first." -ForegroundColor Yellow
    Write-Host "Download: https://www.postgresql.org/download/windows/"
}

# 2. Python venv
Write-Host "`n[2] Python environment..." -ForegroundColor Green
if (-not (Test-Path $VenvPython)) {
    Set-Location $Backend
    python -m venv .venv
}
$depsOk = $false
& $VenvPython -c "import fastapi" 2>&1 | Out-Null
if ($LASTEXITCODE -eq 0) { $depsOk = $true }
if (-not $depsOk) {
    Write-Host "Installing Python packages (first time only)..."
    & $VenvPython -m pip install --upgrade pip
    & $VenvPython -m pip install -r (Join-Path $Backend "requirements.txt")
}

# 3. .env check
Write-Host "`n[3] Checking .env..." -ForegroundColor Green
$EnvFile = Join-Path $Backend ".env"
if (-not (Test-Path $EnvFile)) {
    Copy-Item (Join-Path $Backend ".env.example") $EnvFile
    Write-Host "Created .env from example - EDIT DB_PASSWORD and JWT_SECRET_KEY!" -ForegroundColor Yellow
}
$envLines = Get-Content $EnvFile | ForEach-Object {
    if ($_ -match '^\s*DATABASE_URL=') {
        if ($_ -notmatch '^\s*#') {
            Write-Host "Commenting out DATABASE_URL (use DB_* vars instead)" -ForegroundColor Yellow
            "# $_"
        } else { $_ }
    } elseif ($_ -match '^PUBLIC_APP_URL=') {
        "PUBLIC_APP_URL=$PublicUrl"
    } else { $_ }
}
$envLines | Set-Content $EnvFile

# 4. Migrations
Write-Host "`n[4] Database migrations..." -ForegroundColor Green
Set-Location $Backend
& $VenvPython -m alembic upgrade head

# 5. Build frontend
Write-Host "`n[5] Building frontend..." -ForegroundColor Green
Set-Location $Root
if (Get-Command npm -ErrorAction SilentlyContinue) {
    npm install --silent 2>$null
    npx vite build
} else {
    Write-Host "Node.js not installed. Install from https://nodejs.org" -ForegroundColor Red
    exit 1
}

# 6. Firewall
Write-Host "`n[6] Firewall port $Port..." -ForegroundColor Green
$ruleName = "GameHub-Pro-$Port"
if (-not (Get-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue)) {
    New-NetFirewallRule -DisplayName $ruleName -Direction Inbound -Protocol TCP -LocalPort $Port -Action Allow | Out-Null
}

# 7. Stop old process on port if any
Write-Host "`n[7] Fixing IIS 502 (if present) and starting server..." -ForegroundColor Green

# Remove IIS binding on 8010 so uvicorn can use it directly
Import-Module WebAdministration -ErrorAction SilentlyContinue
if (Get-Module WebAdministration) {
    Get-Website | ForEach-Object {
        $siteName = $_.Name
        Get-WebBinding -Name $siteName -ErrorAction SilentlyContinue | ForEach-Object {
            if ($_.bindingInformation -match ":$Port`:") {
                Write-Host "Removing IIS binding on port $Port from site: $siteName"
                Remove-WebBinding -Name $siteName -BindingInformation $_.bindingInformation -Protocol $_.protocol -ErrorAction SilentlyContinue
            }
        }
    }
    iisreset /stop 2>$null
    Start-Sleep -Seconds 2
}

Get-CimInstance Win32_Process -Filter "Name='python.exe'" -ErrorAction SilentlyContinue |
    Where-Object { $_.CommandLine -match "uvicorn" } |
    ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }

Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue | ForEach-Object {
    Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue
}
Start-Sleep -Seconds 2

$logDir = Join-Path $Backend "logs"
New-Item -ItemType Directory -Force -Path $logDir | Out-Null
$logFile = Join-Path $logDir "gamehub.log"
$errFile = Join-Path $logDir "gamehub-error.log"

Start-Process -FilePath $VenvPython -ArgumentList "-m","uvicorn","app.main:app","--host","0.0.0.0","--port",$Port -WorkingDirectory $Backend -WindowStyle Hidden -RedirectStandardOutput $logFile -RedirectStandardError $errFile

Start-Sleep -Seconds 3
try {
    $health = Invoke-WebRequest -Uri "http://localhost:$Port/health" -UseBasicParsing -TimeoutSec 5
    Write-Host "Health check: $($health.Content)" -ForegroundColor Green
} catch {
    Write-Host "Server starting... check log: $logFile" -ForegroundColor Yellow
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host " DONE! Share these URLs:" -ForegroundColor Green
Write-Host " Customer Pay: ${PublicUrl}/pay?tenant=1"
Write-Host " Staff Login:  ${PublicUrl}/login"
Write-Host "========================================" -ForegroundColor Cyan
