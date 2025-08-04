# 멀티스테이지 빌드를 사용하여 이미지 크기 최적화
FROM node:18-alpine AS base

# pnpm 설치
RUN npm install -g pnpm

# 의존성 설치 단계
FROM base AS deps
WORKDIR /app

# 패키지 매니저 파일들 복사
COPY package.json pnpm-lock.yaml* ./

# 의존성 설치
RUN pnpm install --frozen-lockfile

# 빌드 단계
FROM base AS builder
WORKDIR /app

# 의존성 복사
COPY --from=deps /app/node_modules ./node_modules

# 소스 코드 복사
COPY . .

# 빌드 시점에 필요한 환경변수들 ARG로 받기
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG SUPABASE_SERVICE_ROLE_KEY

# 환경변수 설정
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV SUPABASE_SERVICE_ROLE_KEY=$SUPABASE_SERVICE_ROLE_KEY
ENV NEXT_TELEMETRY_DISABLED=1

# Next.js 빌드
RUN pnpm build

# 프로덕션 이미지
FROM base AS runner
WORKDIR /app

# 프로덕션 환경 설정
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# nextjs 사용자 생성 (보안)
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# 필요한 파일들 복사 (standalone 모드)
COPY --from=builder /app/public ./public

# standalone 출력 파일들 복사
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# nextjs 사용자로 전환
USER nextjs

# 포트 노출
EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Next.js standalone 서버 실행
CMD ["node", "server.js"] 