pipeline {
    agent any

    environment {
        // Must match IIS live paths (see SERVER_DEPLOY.md)
        FRONTEND_DIR  = 'C:\\inetpub\\wwwroot\\GameHub'
        BACKEND_DIR   = 'C:\\Projects\\game-hub-backend-main\\game-hub-backend-main'
        API_URL       = 'https://snooker-apis.atozeesolutions.com'
        FRONTEND_URL  = 'https://snooker.atozeesolutions.com'
    }

    triggers {
        // Polls GitHub every ~5 min. For instant deploy, add GitHub webhook (see below).
        pollSCM('H/5 * * * *')
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Build & Deploy') {
            steps {
                bat '''
                    @echo on
                    cd /d "%WORKSPACE%"
                    call npm ci
                    call npm run build:split
                    if not exist dist\\index.html (
                        echo ERROR: dist\\index.html missing after build
                        exit /b 1
                    )
                '''
                powershell '''
                    $ErrorActionPreference = "Stop"
                    $ws = $env:WORKSPACE
                    $fe = $env:FRONTEND_DIR
                    $be = $env:BACKEND_DIR
                    $api = $env:API_URL
                    $webConfig = Join-Path $ws "deploy\\frontend-web.config"

                    function Invoke-Robocopy($From, $To, [string[]]$Extra = @()) {
                        $args = @($From, $To, "/E", "/NFL", "/NDL", "/NJH", "/NJS") + $Extra
                        & robocopy @args | Out-Null
                        if ($LASTEXITCODE -ge 8) { throw "robocopy failed ($LASTEXITCODE): $From -> $To" }
                    }

                    Write-Host "Deploy frontend -> $fe"
                    New-Item -ItemType Directory -Force -Path $fe | Out-Null
                    Invoke-Robocopy (Join-Path $ws "dist") $fe
                    Copy-Item $webConfig (Join-Path $fe "web.config") -Force

                    Write-Host "Deploy backend -> $be"
                    $backendSrc = Join-Path $ws "game-hub-backend-main\\game-hub-backend-main"
                    New-Item -ItemType Directory -Force -Path $be | Out-Null
                    Invoke-Robocopy $backendSrc $be @("/XD", ".venv", "__pycache__", ".pytest_cache", "logs", "static_app", "/XF", ".env")

                    try {
                        Import-Module WebAdministration -ErrorAction SilentlyContinue
                        Set-WebConfigurationProperty -pspath 'MACHINE/WEBROOT/APPHOST' -filter "system.webServer/proxy" -name "enabled" -value "True" -ErrorAction SilentlyContinue
                    } catch {
                        Write-Host "WARN: Could not enable ARR proxy automatically."
                    }

                    $python = Join-Path $be ".venv\\Scripts\\python.exe"
                    if (-not (Test-Path $python)) {
                        python -m venv (Join-Path $be ".venv")
                    }
                    & $python -m pip install --upgrade pip
                    & $python -m pip install -r (Join-Path $be "requirements.txt")
                    & $python -m pip install reportlab
                    Push-Location $be
                    & $python -m alembic upgrade head
                    Pop-Location
                '''
            }
        }

        stage('Restart IIS') {
            steps {
                bat 'iisreset /restart'
            }
        }

        stage('Health Check') {
            steps {
                powershell '''
                    Start-Sleep -Seconds 5
                    $urls = @(
                        "https://snooker-apis.atozeesolutions.com/health",
                        "http://127.0.0.1/health"
                    )
                    foreach ($u in $urls) {
                        try {
                            $r = Invoke-WebRequest -Uri $u -UseBasicParsing -TimeoutSec 30
                            Write-Host "$u -> $($r.StatusCode) $($r.Content)"
                            if ($r.Content -match "ok") { return }
                        } catch {
                            Write-Host "WARN: $u failed: $_"
                        }
                    }
                    throw "API health check failed"
                '''
            }
        }
    }

    post {
        success {
            echo "Live: ${env.FRONTEND_URL}"
            echo "API:  ${env.API_URL}"
        }
        failure {
            echo 'Build failed — open Console Output for the red error line.'
            echo 'Common fixes: Node.js 20+ on server, Python venv, push latest code to GitHub main.'
        }
    }
}

/*
  INSTANT DEPLOY ON GITHUB PUSH (optional, on top of pollSCM):

  1. Jenkins job Snooker-Deploy -> Configure -> Build Triggers:
     [x] GitHub hook trigger for GITScm polling

  2. Jenkins -> Manage Jenkins -> System -> GitHub Server (add api.github.com)

  3. GitHub repo Settings -> Webhooks -> Add webhook:
     Payload URL: http://YOUR_PUBLIC_IP:8080/github-webhook/
     Content type: application/json
     Events: Just the push event

  Note: GitHub cannot reach localhost:8080. Use server public IP/DNS or keep pollSCM (~5 min).
*/
