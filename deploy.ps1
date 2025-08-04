# SmashQueue 배포 스크립트 (PowerShell)
Write-Host "🚀 SmashQueue 배포를 시작합니다..." -ForegroundColor Green

# 환경변수 파일 확인
if (-not (Test-Path ".env.production")) {
    Write-Host "❌ .env.production 파일이 없습니다." -ForegroundColor Red
    Write-Host "env.production.example을 참고하여 .env.production을 생성해주세요." -ForegroundColor Yellow
    Read-Host "계속하려면 Enter를 누르세요"
    exit 1
}

# Docker 이미지 빌드
Write-Host "🔨 Docker 이미지를 빌드합니다..." -ForegroundColor Blue
docker build -t smash-queue:latest .

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Docker 빌드에 실패했습니다." -ForegroundColor Red
    Read-Host "계속하려면 Enter를 누르세요"
    exit 1
}

# 기존 컨테이너 중지 및 제거
Write-Host "🛑 기존 컨테이너를 중지합니다..." -ForegroundColor Yellow
docker-compose down

# 새 컨테이너 시작
Write-Host "▶️ 새 컨테이너를 시작합니다..." -ForegroundColor Blue
docker-compose up -d

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ 배포가 완료되었습니다!" -ForegroundColor Green
    Write-Host "🌐 애플리케이션이 http://localhost:3000에서 실행 중입니다." -ForegroundColor Cyan
    Write-Host "📊 로그 확인: docker-compose logs -f" -ForegroundColor Gray
} else {
    Write-Host "❌ 컨테이너 시작에 실패했습니다." -ForegroundColor Red
    Read-Host "계속하려면 Enter를 누르세요"
    exit 1
}

Read-Host "계속하려면 Enter를 누르세요" 