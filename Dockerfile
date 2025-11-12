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
COPY .github ./.github
COPY packages ./packages
COPY mcp-servers ./mcp-servers
COPY scripts ./scripts
COPY tsconfig.base.json ./
COPY mcp-stdio-server.ts ./

# 스크립트 파일 복사 (scripts 디렉토리는 이미 위에서 복사됨)
COPY scripts/scan/bestcase-updater.sh ./bestcase-updater.sh
COPY scripts/scan/cron-scan.sh ./cron-scan.sh

# 실행 권한 부여
RUN chmod +x /app/bestcase-updater.sh \
             /app/cron-scan.sh \
             /app/scripts/scan/init-scan.sh \
             /app/scripts/scan/validate-bestcases.ts

# Yarn cache 디렉토리 생성 및 의존성 설치
RUN yarn install --inline-builds

# 프로젝트 빌드
RUN yarn workspace bestcase-db run build && \
    yarn workspace ai-bindings run build && \
    yarn workspace ai-runner run build && \
    yarn workspace llm-analyzer run build && \
    yarn workspace @mcp-code-mode/guides run build && \
    yarn workspace mcp-scripts run build && \
    yarn build:root

# 빌드된 파일 심볼릭 링크 생성
RUN ln -sf /app/dist/mcp-stdio-server.js /app/mcp-stdio-server.js

# 프로젝트 디렉토리 마운트 포인트
VOLUME ["/projects"]

# 환경변수 설정
ENV PROJECTS_PATH=/projects
ENV BESTCASE_STORAGE_PATH=/projects/.bestcases
ENV NODE_ENV=production

# MCP STDIO 서버만 실행 (BestCase 자동 업데이트 제거)
# AI 분석은 크론잡(일요일) 또는 수동 실행으로만 수행
CMD ["tail", "-f", "/dev/null"]
