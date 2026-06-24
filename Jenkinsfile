pipeline {
    agent any

    environment {
        DEPLOY_ROOT      = 'C:\\Projects\\GameHub-Developer-Package'
        BACKEND_DIR      = 'C:\\Projects\\GameHub-Developer-Package\\game-hub-backend-main\\game-hub-backend-main'
        FRONTEND_DIR     = 'C:\\Projects\\Snooker-Frontend'
        API_URL          = 'https://snooker-apis.atozeesolutions.com'
        FRONTEND_URL     = 'https://snooker.atozeesolutions.com'
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

        stage('Build Frontend') {
            steps {
                bat 'call npm ci && call npm run build:split'
            }
        }

        stage('Deploy Backend') {
            steps {
                bat '''
                    robocopy . "%DEPLOY_ROOT%" /E /XD node_modules .git __pycache__ .pytest_cache .venv .vite .vite-temp dist /XF .env .env.* *.zip /NFL /NDL /NJH /NJS
                    if %ERRORLEVEL% GEQ 8 exit /b %ERRORLEVEL%
                    exit /b 0
                '''
            }
        }

        stage('Deploy Frontend') {
            steps {
                bat '''
                    if not exist "%FRONTEND_DIR%" mkdir "%FRONTEND_DIR%"
                    robocopy dist "%FRONTEND_DIR%" /E /NFL /NDL /NJH /NJS
                    if %ERRORLEVEL% GEQ 8 exit /b %ERRORLEVEL%
                    copy /Y deploy\\frontend-web.config "%FRONTEND_DIR%\\web.config"
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
                    powershell -Command "$h='http://snooker-apis.atozeesolutions.com/health'; try { $r=Invoke-WebRequest -Uri $h -UseBasicParsing -TimeoutSec 30; Write-Host $r.Content } catch { Write-Host 'DNS/HTTPS not ready - trying localhost'; $r=Invoke-WebRequest -Uri 'http://127.0.0.1/health' -Headers @{Host='snooker-apis.atozeesolutions.com'} -UseBasicParsing -TimeoutSec 30; Write-Host $r.Content }"
                '''
            }
        }
    }

    post {
        success {
            echo "Deploy OK: ${env.FRONTEND_URL}"
            echo "API:       ${env.API_URL}"
        }
        failure {
            echo 'Deploy failed. Check Jenkins console log.'
        }
    }
}
