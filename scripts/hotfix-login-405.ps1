# Instant fix for login 405 on split IIS (frontend posts to same-origin /auth/login).
# Run on RDP server as Administrator.
#
#   powershell -ExecutionPolicy Bypass -File C:\Projects\Snooker\scripts\hotfix-login-405.ps1
#
# Optional:
#   -FrontendPath "C:\inetpub\wwwroot\GameHub"
#   -FrontendPath "C:\Projects\Snooker-Frontend"

param(
    [string]$FrontendPath = "C:\inetpub\wwwroot\GameHub",
    [string]$SourceRoot = ""
)

$ErrorActionPreference = "Stop"

if (-not $SourceRoot) {
    $SourceRoot = Split-Path $PSScriptRoot -Parent
}

$WebConfigSrc = Join-Path $SourceRoot "deploy\frontend-web.config"
if (-not (Test-Path $WebConfigSrc)) {
    Write-Host "ERROR: $WebConfigSrc not found" -ForegroundColor Red
    exit 1
}

if (-not (Test-Path $FrontendPath)) {
    Write-Host "ERROR: Frontend folder not found: $FrontendPath" -ForegroundColor Red
    exit 1
}

# ARR reverse proxy (needed for outbound rewrite to API host)
try {
    Import-Module WebAdministration -ErrorAction Stop
    Set-WebConfigurationProperty -pspath 'MACHINE/WEBROOT/APPHOST' -filter "system.webServer/proxy" -name "enabled" -value "True" -ErrorAction SilentlyContinue
    Write-Host "ARR proxy enabled (if module installed)."
} catch {
    Write-Host "WARN: Could not enable ARR proxy automatically. Install URL Rewrite + ARR if login still fails." -ForegroundColor Yellow
}

Copy-Item $WebConfigSrc (Join-Path $FrontendPath "web.config") -Force
Write-Host "web.config updated -> $FrontendPath" -ForegroundColor Green

iisreset /restart

Write-Host ""
Write-Host "Done. Hard refresh browser (Ctrl+Shift+R) and try login again." -ForegroundColor Green
Write-Host "Network tab should show POST .../auth/login with 200 or 401 (not 405)." -ForegroundColor Cyan
