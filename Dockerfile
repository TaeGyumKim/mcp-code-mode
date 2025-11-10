# Node.js 20 베이스 이미지
FROM node:20-slim

# cron, curl 및 필요한 패키지 설치
RUN apt-get update && apt-get install -y \
    cron \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Yarn 4.9.1 설치
RUN corepack enable && corepack prepare yarn@4.9.1 --activate

# 작업 디렉토리 생성
WORKDIR /app

# 의존성 파일 복사
COPY package.json yarn.lock .yarnrc.yml ./
COPY .yarn ./.yarn
COPY packages ./packages
COPY mcp-servers ./mcp-servers
COPY tsconfig.base.json ./
COPY mcp-stdio-server.js ./
COPY auto-scan-projects.js ./
COPY auto-scan-projects-ai.js ./
COPY cleanup-old-bestcases.js ./
COPY bestcase-updater.sh ./
COPY cron-scan.sh ./

# 실행 권한 부여
RUN chmod +x /app/bestcase-updater.sh /app/cron-scan.sh

# Yarn cache 디렉토리 생성 및 의존성 설치
RUN yarn install --inline-builds

# 프로젝트 빌드
RUN yarn workspace bestcase-db run build && \
    yarn workspace ai-bindings run build && \
    yarn workspace ai-runner run build && \
    yarn workspace llm-analyzer run build

# 프로젝트 디렉토리 마운트 포인트
VOLUME ["/projects"]

# 환경변수 설정
ENV PROJECTS_PATH=/projects
ENV BESTCASE_STORAGE_PATH=/projects/.bestcases
ENV NODE_ENV=production

# BestCase 자동 업데이트 서비스 시작 (백그라운드)
# MCP STDIO 서버는 docker exec로 별도 실행
CMD ["/bin/sh", "-c", "/app/bestcase-updater.sh & tail -f /dev/null"]
