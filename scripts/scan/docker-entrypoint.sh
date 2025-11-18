#!/bin/sh
# Docker 컨테이너 시작 시 실행되는 엔트리포인트
#
# 1. BestCase 버전 체크 및 마이그레이션
# 2. 메인 프로세스 실행

echo "========================================="
echo "🐳 MCP Code Mode Container Starting"
echo "📅 $(date)"
echo "========================================="

cd /app

# 환경 변수 확인
export BESTCASE_STORAGE_PATH="${BESTCASE_STORAGE_PATH:-/projects/.bestcases}"
export AUTO_MIGRATE_ON_STARTUP="${AUTO_MIGRATE_ON_STARTUP:-true}"
export SCAN_COOLDOWN_HOURS="${SCAN_COOLDOWN_HOURS:-24}"  # 스캔 쿨다운 시간 (기본: 24시간)
export PROJECTS_PATH="${PROJECTS_PATH:-/projects}"
export OLLAMA_URL="${OLLAMA_URL:-http://ollama:11434}"
export LLM_MODEL="${LLM_MODEL:-qwen2.5-coder:7b}"
export CONCURRENCY="${CONCURRENCY:-2}"
export MAX_FILES_PER_PROJECT="${MAX_FILES_PER_PROJECT:-50}"
# RAG 임베딩 설정
export EMBEDDING_MODEL="${EMBEDDING_MODEL:-nomic-embed-text}"
export GENERATE_EMBEDDINGS="${GENERATE_EMBEDDINGS:-true}"

echo "📁 BestCase Storage: $BESTCASE_STORAGE_PATH"
echo "🔄 Auto-scan on startup: $AUTO_MIGRATE_ON_STARTUP"
echo "⏱️ Scan cooldown: $SCAN_COOLDOWN_HOURS hours"
echo "🧠 LLM Model: $LLM_MODEL"
echo ""

# 1. BestCase 스토리지 디렉토리 확인
if [ -d "$BESTCASE_STORAGE_PATH" ]; then
  echo "✅ BestCase storage directory found"

  # 2. 시작 시 자동 AI 스캔 실행 (환경변수로 제어)
  if [ "$AUTO_MIGRATE_ON_STARTUP" = "true" ]; then
    CHECKPOINT_FILE="$BESTCASE_STORAGE_PATH/.scan-checkpoint.json"
    SHOULD_SCAN=true

    # 체크포인트 파일이 존재하면 마지막 스캔 시간 확인
    if [ -f "$CHECKPOINT_FILE" ]; then
      # 파일 수정 시간 (Unix timestamp)
      if [ -n "$(command -v stat)" ]; then
        LAST_SCAN=$(stat -c %Y "$CHECKPOINT_FILE" 2>/dev/null || stat -f %m "$CHECKPOINT_FILE" 2>/dev/null || echo 0)
      else
        LAST_SCAN=0
      fi

      NOW=$(date +%s)
      HOURS_SINCE_LAST_SCAN=$(( (NOW - LAST_SCAN) / 3600 ))

      if [ "$HOURS_SINCE_LAST_SCAN" -lt "$SCAN_COOLDOWN_HOURS" ]; then
        # 쿨다운 기간 내지만, 파일 변경이 있으면 스캔 필요
        echo ""
        echo "⏱️ Within cooldown period (${HOURS_SINCE_LAST_SCAN}h ago), checking for file changes..."

        # 프로젝트 파일의 최신 수정 시간 확인 (.vue, .ts, .tsx, .js)
        HAS_CHANGES=false

        if [ -d "$PROJECTS_PATH" ]; then
          # find로 프로젝트 파일들의 최신 수정 시간 찾기
          LATEST_FILE_TIME=$(find "$PROJECTS_PATH" \
            -type f \( -name "*.vue" -o -name "*.ts" -o -name "*.tsx" -o -name "*.js" \) \
            -not -path "*/node_modules/*" \
            -not -path "*/.nuxt/*" \
            -not -path "*/dist/*" \
            -not -path "*/.output/*" \
            -exec stat -c %Y {} \; 2>/dev/null | sort -n | tail -1)

          if [ -n "$LATEST_FILE_TIME" ] && [ "$LATEST_FILE_TIME" -gt "$LAST_SCAN" ]; then
            MINUTES_SINCE_CHANGE=$(( (NOW - LATEST_FILE_TIME) / 60 ))
            echo "   📝 File changes detected (${MINUTES_SINCE_CHANGE}m ago)"
            HAS_CHANGES=true
          fi

          # Git 커밋 확인 (선택적)
          if [ -d "$PROJECTS_PATH/.git" ]; then
            LATEST_COMMIT=$(git -C "$PROJECTS_PATH" log -1 --format=%ct 2>/dev/null || echo 0)
            if [ "$LATEST_COMMIT" -gt "$LAST_SCAN" ]; then
              MINUTES_SINCE_COMMIT=$(( (NOW - LATEST_COMMIT) / 60 ))
              echo "   📝 Git commits detected (${MINUTES_SINCE_COMMIT}m ago)"
              HAS_CHANGES=true
            fi
          fi
        fi

        if [ "$HAS_CHANGES" = "true" ]; then
          echo "   ✅ Changes detected, will run scan despite cooldown"
          SHOULD_SCAN=true
        else
          echo "   ⏭️ No changes detected, skipping scan (cooldown: ${SCAN_COOLDOWN_HOURS}h)"
          echo "   To force scan, set SCAN_COOLDOWN_HOURS=0 or delete $CHECKPOINT_FILE"
          SHOULD_SCAN=false
        fi
      else
        echo ""
        echo "✅ Cooldown expired (${HOURS_SINCE_LAST_SCAN}h ago), will run scan"
      fi
    else
      echo ""
      echo "ℹ️ No checkpoint found, this appears to be the first scan"
    fi

    # 스캔 실행 여부 판단
    if [ "$SHOULD_SCAN" = "true" ]; then
      echo ""
      echo "🔍 Phase 1: Running AI file-based scan (v3.0)..."
      echo "   This will analyze only changed/new files"
      echo ""

      # Ollama가 사용 가능한지 확인
      if curl -sf http://ollama:11434/api/tags > /dev/null 2>&1; then
        echo "✅ Ollama available, starting scan..."
        node --experimental-specifier-resolution=node /app/scripts/dist/scan/scan-files-ai.js 2>/dev/null || true
        echo ""
        echo "🎉 Startup scan completed"
      else
        echo "⚠️ Ollama not available, skipping AI scan"
        echo "   Please check Ollama container status"
      fi
    fi
  else
    echo "ℹ️ Auto-scan disabled (AUTO_MIGRATE_ON_STARTUP=false)"
  fi
else
  echo "📁 BestCase storage not found, will be created on first scan"
fi

echo ""
echo "========================================="
echo "🚀 Starting main process..."
echo "========================================="

# 3. 전달받은 명령 실행 (기본: tail -f /dev/null)
exec "$@"
