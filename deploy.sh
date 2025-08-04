#!/bin/bash

# SmashQueue 배포 스크립트
echo "🚀 SmashQueue 배포를 시작합니다..."

# 환경변수 파일 확인
if [ ! -f ".env.production" ]; then
    echo "❌ .env.production 파일이 없습니다."
    echo "env.production.example을 참고하여 .env.production을 생성해주세요."
    exit 1
fi

# Docker 이미지 빌드
echo "🔨 Docker 이미지를 빌드합니다..."
docker build -t smash-queue:latest .

if [ $? -ne 0 ]; then
    echo "❌ Docker 빌드에 실패했습니다."
    exit 1
fi

# 기존 컨테이너 중지 및 제거
echo "🛑 기존 컨테이너를 중지합니다..."
docker-compose down

# 새 컨테이너 시작
echo "▶️ 새 컨테이너를 시작합니다..."
docker-compose up -d

if [ $? -eq 0 ]; then
    echo "✅ 배포가 완료되었습니다!"
    echo "🌐 애플리케이션이 http://localhost:3000에서 실행 중입니다."
    echo "📊 로그 확인: docker-compose logs -f"
else
    echo "❌ 컨테이너 시작에 실패했습니다."
    exit 1
fi 