pipeline {
    agent any

    environment {
        FRONTEND_DIR = 'C:\\inetpub\\wwwroot\\GameHub'
        BACKEND_DIR  = 'C:\\Projects\\game-hub-backend-main\\game-hub-backend-main'
        API_URL      = 'https://snooker-apis.atozeesolutions.com'
        FRONTEND_URL = 'https://snooker.atozeesolutions.com'
    }

    triggers {
        pollSCM('H/5 * * * *')
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Deploy') {
            steps {
                powershell '''
                    $ErrorActionPreference = "Stop"
                    $script = Join-Path $env:WORKSPACE "scripts\\deploy-server-iis.ps1"
                    if (-not (Test-Path $script)) {
                        throw "Deploy script not found: $script"
                    }
                    & $script `
                        -SourceRoot $env:WORKSPACE `
                        -FrontendDeployPath $env:FRONTEND_DIR `
                        -BackendDeployPath $env:BACKEND_DIR `
                        -ApiUrl $env:API_URL
                '''
            }
        }

        stage('Health Check') {
            steps {
                powershell '''
                    Start-Sleep -Seconds 8
                    $health = Invoke-WebRequest -Uri "$env:API_URL/health" -UseBasicParsing -TimeoutSec 60
                    Write-Host $health.Content
                    if ($health.Content -notmatch "ok") { throw "API health check failed" }
                    $fe = Invoke-WebRequest -Uri $env:FRONTEND_URL -UseBasicParsing -TimeoutSec 60
                    Write-Host "Frontend HTTP $($fe.StatusCode)"
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
            echo 'Deploy failed — see Console Output.'
        }
    }
}
