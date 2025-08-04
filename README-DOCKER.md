# SmashQueue Docker 배포 가이드

이 문서는 SmashQueue 애플리케이션을 Docker로 배포하는 방법을 설명합니다.

## 📋 사전 요구사항

- Docker 설치
- Docker Compose 설치  
- Supabase 프로젝트 생성

## 🚀 배포 방법

### 1. 환경변수 설정

`env.production.example` 파일을 참고하여 `.env.production` 파일을 생성하세요:

```bash
cp env.production.example .env.production
```

`.env.production` 파일을 편집하여 실제 Supabase 값들을 입력하세요:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

### 2. 자동 배포 (권장)

```bash
chmod +x deploy.sh
./deploy.sh
```

### 3. 수동 배포

#### Docker 이미지 빌드
```bash
docker build -t smash-queue:latest .
```

#### 컨테이너 실행
```bash
docker-compose up -d
```

## 🔧 관리 명령어

### 로그 확인
```bash
docker-compose logs -f
```

### 컨테이너 상태 확인
```bash
docker-compose ps
```

### 컨테이너 중지
```bash
docker-compose down
```

### 컨테이너 재시작
```bash
docker-compose restart
```

## 🌐 클라우드 배포

### AWS EC2
1. EC2 인스턴스 생성 (Ubuntu 20.04+ 권장)
2. Docker & Docker Compose 설치
3. 소스 코드 업로드
4. 환경변수 설정
5. 배포 스크립트 실행
6. (옵션) nginx reverse proxy 설정
7. (옵션) SSL 인증서 설정

### Google Cloud VM
1. Compute Engine 인스턴스 생성
2. Docker & Docker Compose 설치
3. 소스 코드 업로드
4. 환경변수 설정
5. 배포 스크립트 실행
6. 방화벽 규칙 설정 (포트 3000 또는 80/443)

## 🔒 보안 고려사항

- `.env.production` 파일은 절대 git에 커밋하지 마세요
- 프로덕션에서는 reverse proxy (nginx) 사용 권장
- HTTPS 설정 권장
- 정기적인 Docker 이미지 업데이트

## 🐛 문제 해결

### 빌드 실패
```bash
# 캐시 없이 다시 빌드
docker build --no-cache -t smash-queue:latest .
```

### 포트 충돌
```bash
# 다른 포트로 실행
docker run -p 8080:3000 smash-queue:latest
```

### 메모리 부족
```bash
# 메모리 제한 설정
docker run -m 512m smash-queue:latest
```

## 📞 지원

문제가 발생하면 다음을 확인해주세요:
1. Docker 및 Docker Compose 버전
2. 환경변수 설정
3. 네트워크 설정
4. 로그 메시지 