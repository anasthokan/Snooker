# Create zip package to copy via RDP to server 74.208.184.175
$ErrorActionPreference = "Stop"
$Root = Split-Path $PSScriptRoot -Parent
$ZipPath = Join-Path $Root "GameHub-Atozee-Deploy.zip"

if (Test-Path $ZipPath) { Remove-Item $ZipPath -Force }

$temp = Join-Path $env:TEMP "gamehub-deploy-$(Get-Random)"
New-Item -ItemType Directory -Path $temp | Out-Null

Write-Host "Preparing package..."

# Copy project (exclude heavy folders)
$exclude = @('node_modules', '.git', '__pycache__', '.pytest_cache')
robocopy $Root $temp /E /XD node_modules .git __pycache__ .pytest_cache .venv /XF *.zip /NFL /NDL /NJH /NJS | Out-Null

# Build frontend into package
Push-Location $Root
if (Get-Command npm -ErrorAction SilentlyContinue) {
    npx vite build 2>$null
}
Pop-Location

$zipTemp = Join-Path $temp "GameHub"
New-Item -ItemType Directory -Path $zipTemp | Out-Null
robocopy $Root $zipTemp /E /XD node_modules .git __pycache__ .pytest_cache /XF GameHub-Atozee-Deploy.zip /NFL /NDL /NJH /NJS | Out-Null

Compress-Archive -Path (Join-Path $zipTemp "*") -DestinationPath $ZipPath -Force
Remove-Item $temp -Recurse -Force

Write-Host "Package ready: $ZipPath"
Write-Host "Copy this zip to RDP server, extract to C:\GameHub, run scripts\SETUP_ON_RDP.bat as Admin"
