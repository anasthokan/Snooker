# Fix 502 on http://74.208.184.175:8010
# Run on RDP server as Administrator
# IIS is proxying port 8010 but uvicorn backend is not running

param(
    [int]$PublicPort = 8010,
    [int]$BackendPort = 8000,
    [ValidateSet("direct", "iis-proxy")]
    [string]$Mode = "direct"
)

$ErrorActionPreference = "Continue"
$Root = Split-Path $PSScriptRoot -Parent
$Backend = Join-Path $Root "game-hub-backend-main\game-hub-backend-main"
$VenvPython = Join-Path $Backend ".venv\Scripts\python.exe"
$StaticApp = Join-Path $Backend "static_app"

Write-Host "=== Fix 502 - GameHub Atozee ===" -ForegroundColor Cyan

if (-not (Test-Path $VenvPython)) {
    Write-Host "ERROR: Python venv not found. Run setup-on-rdp.ps1 first." -ForegroundColor Red
    exit 1
}

# Build frontend if missing
if (-not (Test-Path (Join-Path $StaticApp "index.html"))) {
    Write-Host "Building frontend..."
    Set-Location $Root
    npx vite build
}

Write-Host "`n[1] Stopping old uvicorn processes..."
Get-CimInstance Win32_Process -Filter "Name='python.exe'" -ErrorAction SilentlyContinue |
    Where-Object { $_.CommandLine -match "uvicorn" } |
    ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }

Start-Sleep -Seconds 2

if ($Mode -eq "direct") {
    Write-Host "`n[2] Mode: DIRECT - uvicorn on port $PublicPort (no IIS)" -ForegroundColor Yellow

    # Remove IIS binding on public port so uvicorn can bind
    Import-Module WebAdministration -ErrorAction SilentlyContinue
    if (Get-Module WebAdministration) {
        Get-Website | ForEach-Object {
            $siteName = $_.Name
            Get-WebBinding -Name $siteName -ErrorAction SilentlyContinue | ForEach-Object {
                if ($_.bindingInformation -match ":$PublicPort`:") {
                    Write-Host "Removing IIS binding $PublicPort from site: $siteName"
                    Remove-WebBinding -Name $siteName -BindingInformation $_.bindingInformation -Protocol $_.protocol -ErrorAction SilentlyContinue
                }
            }
        }
        # Stop sites still trying to use 8010 via http.sys
        iisreset /stop 2>$null
        Start-Sleep -Seconds 3
    }

    $listenPort = $PublicPort
} else {
    Write-Host "`n[2] Mode: IIS-PROXY - uvicorn on $BackendPort, IIS on $PublicPort" -ForegroundColor Yellow

    # Ensure web.config exists for reverse proxy
    $webConfig = Join-Path $StaticApp "web.config"
    if (-not (Test-Path $webConfig)) {
        Write-Host "web.config missing in static_app - copy from repo"
    }

    # Point IIS site to static_app with proxy web.config
    Import-Module WebAdministration -ErrorAction SilentlyContinue
    if (Get-Module WebAdministration) {
        $siteName = "GameHubPro"
        if (Get-Website -Name $siteName -ErrorAction SilentlyContinue) {
            Remove-Website -Name $siteName
        }
        New-Website -Name $siteName -PhysicalPath $StaticApp -Port $PublicPort -Force | Out-Null
        Write-Host "IIS site '$siteName' -> $StaticApp on port $PublicPort"
        iisreset /start 2>$null
    }

    $listenPort = $BackendPort
}

Write-Host "`n[3] Firewall port $PublicPort..."
$ruleName = "GameHub-Pro-$PublicPort"
if (-not (Get-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue)) {
    New-NetFirewallRule -DisplayName $ruleName -Direction Inbound -Protocol TCP -LocalPort $PublicPort -Action Allow | Out-Null
}

Write-Host "`n[4] Starting uvicorn on port $listenPort..."
$logDir = Join-Path $Backend "logs"
New-Item -ItemType Directory -Force -Path $logDir | Out-Null
$logFile = Join-Path $logDir "gamehub-$listenPort.log"
$errFile = Join-Path $logDir "gamehub-$listenPort-error.log"

Start-Process -FilePath $VenvPython `
    -ArgumentList "-m","uvicorn","app.main:app","--host","0.0.0.0","--port",$listenPort `
    -WorkingDirectory $Backend `
    -WindowStyle Hidden `
    -RedirectStandardOutput $logFile `
    -RedirectStandardError $errFile

Start-Sleep -Seconds 4

Write-Host "`n[5] Health check..."
try {
    $health = Invoke-RestMethod -Uri "http://127.0.0.1:$listenPort/health" -TimeoutSec 10
    Write-Host "Backend OK: $($health | ConvertTo-Json -Compress)" -ForegroundColor Green
} catch {
    Write-Host "Backend failed. Log: $logFile" -ForegroundColor Red
    Get-Content $logFile -Tail 20 -ErrorAction SilentlyContinue
    exit 1
}

if ($Mode -eq "direct") {
    try {
        $pub = Invoke-WebRequest -Uri "http://127.0.0.1:$PublicPort/health" -UseBasicParsing -TimeoutSec 10
        Write-Host "Public port $PublicPort OK: $($pub.Content)" -ForegroundColor Green
    } catch {
        Write-Host "Port $PublicPort not responding yet. Check if http.sys still holds the port:" -ForegroundColor Yellow
        Write-Host "  netstat -ano | findstr :$PublicPort"
    }
}

Write-Host "`n=== FIXED ===" -ForegroundColor Green
Write-Host "Staff login:  http://74.208.184.175:$PublicPort/login"
Write-Host "Customer pay: http://74.208.184.175:$PublicPort/pay?tenant=1"
Write-Host "Log file:     $logFile"
