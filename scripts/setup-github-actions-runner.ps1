# One-time setup: GitHub Actions self-hosted runner on the Snooker Windows server.
# Run in PowerShell as Administrator on the RDP server.
#
# Before running:
#   1. GitHub repo -> Settings -> Actions -> Runners -> New self-hosted runner -> Windows
#   2. Copy the registration token (valid ~1 hour)
#
# Example:
#   .\setup-github-actions-runner.ps1 -RegistrationToken "AXXXXXXXXX"

param(
    [Parameter(Mandatory = $true)]
    [string]$RegistrationToken,
    [string]$RunnerName = $env:COMPUTERNAME,
    [string]$RunnerLabels = "self-hosted,Windows,snooker-production",
    [string]$RunnerDir = "C:\actions-runner",
    [string]$RepoUrl = "https://github.com/anasthokan/Snooker"
)

$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host " GitHub Actions Runner Setup" -ForegroundColor Cyan
Write-Host " Repo:   $RepoUrl" -ForegroundColor Cyan
Write-Host " Folder: $RunnerDir" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

New-Item -ItemType Directory -Force -Path $RunnerDir | Out-Null
Set-Location $RunnerDir

$zip = Join-Path $RunnerDir "actions-runner-win-x64.zip"
if (-not (Test-Path "config.cmd")) {
    Write-Host "Downloading actions-runner..." -ForegroundColor Green
    Invoke-WebRequest -Uri "https://github.com/actions/runner/releases/download/v2.322.0/actions-runner-win-x64-2.322.0.zip" -OutFile $zip
    Expand-Archive -Path $zip -DestinationPath $RunnerDir -Force
    Remove-Item $zip -Force
}

Write-Host "Configuring runner..." -ForegroundColor Green
.\config.cmd --url $RepoUrl --token $RegistrationToken --name $RunnerName --labels $RunnerLabels --unattended --replace

Write-Host "Installing Windows service..." -ForegroundColor Green
.\svc.cmd install
.\svc.cmd start

Write-Host ""
Write-Host "Runner installed. Verify in GitHub:" -ForegroundColor Green
Write-Host "  Repo -> Settings -> Actions -> Runners" -ForegroundColor Cyan
Write-Host ""
Write-Host "Production deploy paths used by CD workflow:" -ForegroundColor Yellow
Write-Host "  Frontend: C:\inetpub\wwwroot\GameHub"
Write-Host "  Backend:  C:\Projects\game-hub-backend-main\game-hub-backend-main"
Write-Host ""
Write-Host "Push to main or run workflow 'CD - Deploy to Production IIS' manually." -ForegroundColor Green
