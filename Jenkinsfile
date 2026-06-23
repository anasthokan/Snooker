pipeline {
    agent any

    environment {
        DEPLOY_ROOT     = 'C:\\Projects\\GameHub-Developer-Package'
        BACKEND_DIR     = 'C:\\Projects\\GameHub-Developer-Package\\game-hub-backend-main\\game-hub-backend-main'
        NODE_VERSION    = '20'
    }

    triggers {
        pollSCM('H/5 * * * *')  // check GitHub every 5 min; replace with webhook if configured
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Build Frontend') {
            steps {
                bat '''
                    call npm ci
                    call npm run build
                '''
            }
        }

        stage('Deploy Files') {
            steps {
                bat '''
                    robocopy . "%DEPLOY_ROOT%" /E /XD node_modules .git __pycache__ .pytest_cache .venv .vite .vite-temp /XF .env .env.* *.zip /NFL /NDL /NJH /NJS
                    if %ERRORLEVEL% GEQ 8 exit /b %ERRORLEVEL%
                    exit /b 0
                '''
            }
        }

        stage('Python Dependencies') {
            steps {
                dir("${env.BACKEND_DIR}") {
                    bat '''
                        if not exist .venv\\Scripts\\python.exe python -m venv .venv
                        call .venv\\Scripts\\python.exe -m pip install --upgrade pip
                        call .venv\\Scripts\\python.exe -m pip install -r requirements.txt
                        call .venv\\Scripts\\python.exe -m pip install reportlab
                    '''
                }
            }
        }

        stage('Database Migrations') {
            steps {
                dir("${env.BACKEND_DIR}") {
                    bat 'call .venv\\Scripts\\python.exe -m alembic upgrade head'
                }
            }
        }

        stage('Restart IIS') {
            steps {
                bat 'iisreset /restart'
            }
        }

        stage('Health Check') {
            steps {
                bat '''
                    ping 127.0.0.1 -n 6 > nul
                    powershell -Command "$r = Invoke-WebRequest -Uri 'http://127.0.0.1:8010/health' -UseBasicParsing -TimeoutSec 30; Write-Host $r.Content; if ($r.Content -notmatch 'ok') { exit 1 }"
                '''
            }
        }
    }

    post {
        success {
            echo 'Deploy OK: http://74.208.184.175:8010'
        }
        failure {
            echo 'Deploy failed. Check Jenkins console log.'
        }
    }
}
