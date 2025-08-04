@echo off
chcp 65001 >nul
echo 🚀 Starting SmashQueue deployment...

REM Check for environment file
if not exist ".env.production" (
    echo ❌ .env.production file not found.
    echo Please create .env.production based on env.production.example
    pause
    exit /b 1
)

REM Build Docker image
echo 🔨 Building Docker image...
docker build -t smash-queue:latest .

if %errorlevel% neq 0 (
    echo ❌ Docker build failed.
    pause
    exit /b 1
)

REM Stop existing containers
echo 🛑 Stopping existing containers...
docker-compose down

REM Start new containers
echo ▶️ Starting new containers...
docker-compose up -d

if %errorlevel% equ 0 (
    echo ✅ Deployment completed successfully!
    echo 🌐 Application is running at http://localhost:3000
    echo 📊 Check logs: docker-compose logs -f
) else (
    echo ❌ Failed to start containers.
    pause
    exit /b 1
)

pause 