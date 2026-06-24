# Run manually on Jenkins server to verify deploy paths before fixing the job.
#   powershell -ExecutionPolicy Bypass -File C:\Projects\Snooker\scripts\jenkins-snooker-deploy.ps1

param(
    [string]$SourceRoot = "C:\Projects\Snooker",
    [string]$FrontendDeployPath = "C:\inetpub\wwwroot\GameHub",
    [string]$BackendDeployPath = "C:\Projects\game-hub-backend-main\game-hub-backend-main",
    [string]$ApiUrl = "https://snooker-apis.atozeesolutions.com"
)

$deploy = Join-Path $SourceRoot "scripts\deploy-server-iis.ps1"
if (-not (Test-Path $deploy)) {
    Write-Host "ERROR: $deploy not found. Run git pull first." -ForegroundColor Red
    exit 1
}

& $deploy -SourceRoot $SourceRoot -FrontendDeployPath $FrontendDeployPath -BackendDeployPath $BackendDeployPath -ApiUrl $ApiUrl
