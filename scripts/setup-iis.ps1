# GameHub Pro - IIS deployment (HttpPlatformHandler + uvicorn)
# Run on RDP server as Administrator
# IIS serves the app on port 8010; no need to run start-atozee.ps1 manually.

param(
    [int]$Port = 8010,
    [string]$SiteName = "GameHubPro",
    [string]$PublicUrl = "http://74.208.184.175:8010"
)

$ErrorActionPreference = "Stop"
$Root = Split-Path $PSScriptRoot -Parent
$Backend = Join-Path $Root "game-hub-backend-main\game-hub-backend-main"
$VenvPython = Join-Path $Backend ".venv\Scripts\python.exe"
$LogDir = Join-Path $Backend "logs"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host " GameHub Pro - IIS Setup" -ForegroundColor Cyan
Write-Host " Site: $SiteName  Port: $Port" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# --- IIS + HttpPlatformHandler ---
Write-Host "`n[1] Checking IIS..." -ForegroundColor Green
$iis = Get-WindowsFeature -Name Web-Server -ErrorAction SilentlyContinue
if ($iis -and $iis.InstallState -ne "Installed") {
    Write-Host "Installing IIS..."
    Install-WindowsFeature Web-Server, Web-WebServer, Web-Common-Http, Web-Default-Doc, Web-Static-Content, Web-Http-Errors, Web-Http-Logging, Web-Request-Monitor, Web-Filtering, Web-Performance, Web-Mgmt-Console | Out-Null
}

$hph = Get-WebGlobalModule -Name "httpPlatformHandler" -ErrorAction SilentlyContinue
if (-not $hph) {
    Write-Host ""
    Write-Host "HttpPlatformHandler is NOT installed." -ForegroundColor Red
    Write-Host "Download and install (restart IIS after install):" -ForegroundColor Yellow
    Write-Host "  https://www.iis.net/downloads/microsoft/httpplatformhandler"
    Write-Host ""
    Write-Host "Then run this script again." -ForegroundColor Yellow
    exit 1
}
Write-Host "IIS + HttpPlatformHandler OK"

# --- Python venv + deps ---
Write-Host "`n[2] Python environment..." -ForegroundColor Green
if (-not (Test-Path $VenvPython)) {
    Set-Location $Backend
    python -m venv .venv
}
$depsOk = $false
& $VenvPython -c "import fastapi, reportlab" 2>&1 | Out-Null
if ($LASTEXITCODE -eq 0) { $depsOk = $true }
if (-not $depsOk) {
    Write-Host "Installing Python packages..."
    & $VenvPython -m pip install --upgrade pip
    & $VenvPython -m pip install -r (Join-Path $Backend "requirements.txt")
    & $VenvPython -m pip install reportlab
}

# --- .env ---
Write-Host "`n[3] Checking .env..." -ForegroundColor Green
$EnvFile = Join-Path $Backend ".env"
if (-not (Test-Path $EnvFile)) {
    Copy-Item (Join-Path $Backend ".env.example") $EnvFile
    Write-Host "Created .env - EDIT DB_PASSWORD!" -ForegroundColor Yellow
}
$envLines = Get-Content $EnvFile | ForEach-Object {
    if ($_ -match '^\s*DATABASE_URL=' -and $_ -notmatch '^\s*#') { "# $_" }
    elseif ($_ -match '^PUBLIC_APP_URL=') { "PUBLIC_APP_URL=$PublicUrl" }
    else { $_ }
}
$envLines | Set-Content $EnvFile

# --- Migrations ---
Write-Host "`n[4] Database migrations..." -ForegroundColor Green
Set-Location $Backend
& $VenvPython -m alembic upgrade head

# --- Frontend build ---
Write-Host "`n[5] Building frontend..." -ForegroundColor Green
Set-Location $Root
if (Get-Command npm -ErrorAction SilentlyContinue) {
    npm install --silent 2>$null
    npx vite build
} else {
    Write-Host "WARNING: npm not found. Ensure static_app exists." -ForegroundColor Yellow
}

# --- web.config for HttpPlatformHandler ---
Write-Host "`n[6] Writing web.config..." -ForegroundColor Green
New-Item -ItemType Directory -Force -Path $LogDir | Out-Null
$stdoutLog = Join-Path $LogDir "iis-stdout"
$pythonPath = $VenvPython -replace '\\', '\\'
$backendPath = $Backend -replace '\\', '\\'
$stdoutPath = $stdoutLog -replace '\\', '\\'

$webConfig = @"
<?xml version="1.0" encoding="utf-8"?>
<configuration>
  <system.webServer>
    <handlers>
      <add name="httpPlatformHandler" path="*" verb="*" modules="httpPlatformHandler" resourceType="Unspecified" />
    </handlers>
    <httpPlatform
      processPath="$pythonPath"
      arguments="-m uvicorn app.main:app --host 127.0.0.1 --port %HTTP_PLATFORM_PORT%"
      stdoutLogEnabled="true"
      stdoutLogFile="$stdoutPath"
      startupTimeLimit="120"
      startupRetryCount="10"
      processesPerApplication="1">
      <environmentVariables>
        <environmentVariable name="PYTHONPATH" value="$backendPath" />
      </environmentVariables>
    </httpPlatform>
  </system.webServer>
</configuration>
"@
$webConfig | Set-Content -Path (Join-Path $Backend "web.config") -Encoding UTF8

# --- Stop standalone uvicorn if running ---
Write-Host "`n[7] Stopping old uvicorn processes..." -ForegroundColor Green
Get-CimInstance Win32_Process -Filter "Name='python.exe'" -ErrorAction SilentlyContinue |
    Where-Object { $_.CommandLine -match "uvicorn" } |
    ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }

# --- IIS site + app pool ---
Write-Host "`n[8] Creating IIS site..." -ForegroundColor Green
Import-Module WebAdministration

$poolName = $SiteName
if (Test-Path "IIS:\AppPools\$poolName") {
    Remove-WebAppPool -Name $poolName
}
New-WebAppPool -Name $poolName | Out-Null
Set-ItemProperty "IIS:\AppPools\$poolName" -Name managedRuntimeVersion -Value ""
Set-ItemProperty "IIS:\AppPools\$poolName" -Name startMode -Value "AlwaysRunning"

if (Get-Website -Name $SiteName -ErrorAction SilentlyContinue) {
    Remove-Website -Name $SiteName
}
New-Website -Name $SiteName -PhysicalPath $Backend -Port $Port -ApplicationPool $poolName -Force | Out-Null

# Permissions for IIS
$acl = icacls $Backend /grant "IIS_IUSRS:(OI)(CI)RX" /T 2>&1
$acl = icacls $LogDir /grant "IIS_IUSRS:(OI)(CI)M" /T 2>&1
$acl = icacls (Join-Path $Backend "uploads") /grant "IIS_IUSRS:(OI)(CI)M" /T 2>&1

# --- Firewall ---
Write-Host "`n[9] Firewall port $Port..." -ForegroundColor Green
$ruleName = "GameHub-IIS-$Port"
if (-not (Get-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue)) {
    New-NetFirewallRule -DisplayName $ruleName -Direction Inbound -Protocol TCP -LocalPort $Port -Action Allow | Out-Null
}

# --- Restart IIS ---
Write-Host "`n[10] Restarting IIS..." -ForegroundColor Green
iisreset /restart

Start-Sleep -Seconds 5
try {
    $health = Invoke-WebRequest -Uri "http://127.0.0.1:$Port/health" -UseBasicParsing -TimeoutSec 15
    Write-Host "Health check: $($health.Content)" -ForegroundColor Green
} catch {
    Write-Host "Site not responding yet. Check log:" -ForegroundColor Yellow
    Write-Host "  $LogDir\iis-stdout*.log"
    Get-ChildItem $LogDir -Filter "iis-stdout*" -ErrorAction SilentlyContinue | ForEach-Object {
        Write-Host "--- $($_.Name) (last 15 lines) ---"
        Get-Content $_.FullName -Tail 15 -ErrorAction SilentlyContinue
    }
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host " IIS DEPLOY DONE" -ForegroundColor Green
Write-Host " Staff login:  ${PublicUrl}/login"
Write-Host " Customer pay: ${PublicUrl}/pay?tenant=1"
Write-Host " Health:       ${PublicUrl}/health"
Write-Host ""
Write-Host " Seed users (if login fails):" -ForegroundColor Yellow
Write-Host "  cd $Backend"
Write-Host "  .\.venv\Scripts\python.exe -m scripts.seed_demo_users --force"
Write-Host "========================================" -ForegroundColor Cyan
