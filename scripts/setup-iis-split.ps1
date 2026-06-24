# GameHub Pro - Split IIS: frontend + API on separate domains
# Run as Administrator on RDP server (74.208.184.175)

param(
    [string]$FrontendHost = "snooker.atozeesolutions.com",
    [string]$ApiHost = "snooker-apis.atozeesolutions.com",
    [string]$FrontendPath = "C:\Projects\Snooker-Frontend",
    [string]$BackendPath = "C:\Projects\GameHub-Developer-Package\game-hub-backend-main\game-hub-backend-main",
    [string]$FrontendSite = "Snooker-Frontend",
    [string]$ApiSite = "Snooker-API",
    [int]$HttpPort = 80
)

$ErrorActionPreference = "Stop"
$Root = Split-Path $PSScriptRoot -Parent
$VenvPython = Join-Path $BackendPath ".venv\Scripts\python.exe"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host " Split IIS Setup" -ForegroundColor Cyan
Write-Host " Frontend: https://$FrontendHost" -ForegroundColor Cyan
Write-Host " API:      https://$ApiHost" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# URL Rewrite required for SPA frontend
Import-Module WebAdministration
$rewrite = Get-WebGlobalModule -Name "RewriteModule" -ErrorAction SilentlyContinue
if (-not $rewrite) {
    Write-Host "Install IIS URL Rewrite module:" -ForegroundColor Red
    Write-Host "  https://www.iis.net/downloads/microsoft/url-rewrite"
    exit 1
}

$hph = Get-WebGlobalModule -Name "httpPlatformHandler" -ErrorAction SilentlyContinue
if (-not $hph) {
    Write-Host "Install HttpPlatformHandler:" -ForegroundColor Red
    Write-Host "  https://www.iis.net/downloads/microsoft/httpplatformhandler"
    exit 1
}

# Frontend folder
New-Item -ItemType Directory -Force -Path $FrontendPath | Out-Null
Copy-Item (Join-Path $Root "deploy\frontend-web.config") (Join-Path $FrontendPath "web.config") -Force

# API web.config
$LogDir = Join-Path $BackendPath "logs"
New-Item -ItemType Directory -Force -Path $LogDir | Out-Null
$python = $VenvPython -replace '\\', '\\'
$backend = $BackendPath -replace '\\', '\\'
$stdout = (Join-Path $LogDir "iis-stdout") -replace '\\', '\\'

@"
<?xml version="1.0" encoding="utf-8"?>
<configuration>
  <system.webServer>
    <handlers>
      <add name="httpPlatformHandler" path="*" verb="*" modules="httpPlatformHandler" resourceType="Unspecified" />
    </handlers>
    <httpPlatform
      processPath="$python"
      arguments="-m uvicorn app.main:app --host 127.0.0.1 --port %HTTP_PLATFORM_PORT%"
      stdoutLogEnabled="true"
      stdoutLogFile="$stdout"
      startupTimeLimit="120"
      startupRetryCount="10"
      processesPerApplication="1">
      <environmentVariables>
        <environmentVariable name="PYTHONPATH" value="$backend" />
      </environmentVariables>
    </httpPlatform>
  </system.webServer>
</configuration>
"@ | Set-Content -Path (Join-Path $BackendPath "web.config") -Encoding UTF8

# Stop standalone uvicorn
Get-CimInstance Win32_Process -Filter "Name='python.exe'" -ErrorAction SilentlyContinue |
    Where-Object { $_.CommandLine -match "uvicorn" } |
    ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }

# Frontend IIS site (static SPA)
if (Get-Website -Name $FrontendSite -ErrorAction SilentlyContinue) { Remove-Website -Name $FrontendSite }
$fePool = "${FrontendSite}-Pool"
if (Test-Path "IIS:\AppPools\$fePool") { Remove-WebAppPool -Name $fePool }
New-WebAppPool -Name $fePool | Out-Null
Set-ItemProperty "IIS:\AppPools\$fePool" -Name managedRuntimeVersion -Value ""
New-Website -Name $FrontendSite -PhysicalPath $FrontendPath -Port $HttpPort -HostHeader $FrontendHost -ApplicationPool $fePool -Force | Out-Null

# API IIS site (FastAPI via HttpPlatformHandler)
if (Get-Website -Name $ApiSite -ErrorAction SilentlyContinue) { Remove-Website -Name $ApiSite }
$apiPool = "${ApiSite}-Pool"
if (Test-Path "IIS:\AppPools\$apiPool") { Remove-WebAppPool -Name $apiPool }
New-WebAppPool -Name $apiPool | Out-Null
Set-ItemProperty "IIS:\AppPools\$apiPool" -Name managedRuntimeVersion -Value ""
New-Website -Name $ApiSite -PhysicalPath $BackendPath -Port $HttpPort -HostHeader $ApiHost -ApplicationPool $apiPool -Force | Out-Null

# Permissions
icacls $FrontendPath /grant "IIS_IUSRS:(OI)(CI)RX" /T | Out-Null
icacls $BackendPath /grant "IIS_IUSRS:(OI)(CI)RX" /T | Out-Null
icacls $LogDir /grant "IIS_IUSRS:(OI)(CI)M" /T | Out-Null

# Firewall
foreach ($rule in @("HTTP-80", "HTTPS-443")) {
    $port = if ($rule -eq "HTTP-80") { 80 } else { 443 }
    if (-not (Get-NetFirewallRule -DisplayName $rule -ErrorAction SilentlyContinue)) {
        New-NetFirewallRule -DisplayName $rule -Direction Inbound -Protocol TCP -LocalPort $port -Action Allow | Out-Null
    }
}

iisreset /restart

Write-Host ""
Write-Host "IIS sites created (HTTP port $HttpPort)." -ForegroundColor Green
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. DNS A records -> 74.208.184.175 for $FrontendHost and $ApiHost"
Write-Host "  2. Build frontend: npm run build:split"
Write-Host "  3. Copy dist\ -> $FrontendPath"
Write-Host "  4. Update backend .env CORS + PUBLIC_APP_URL"
Write-Host "  5. Add HTTPS bindings + SSL certs in IIS Manager"
Write-Host ""
Write-Host "Test (after DNS):" -ForegroundColor Cyan
Write-Host "  http://$ApiHost/health"
Write-Host "  http://$FrontendHost/login"
