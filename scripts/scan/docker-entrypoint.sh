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
export PROJECTS_PATH="${PROJECTS_PATH:-/projects}"
export OLLAMA_URL="${OLLAMA_URL:-http://ollama:11434}"
export LLM_MODEL="${LLM_MODEL:-qwen2.5-coder:7b}"
export CONCURRENCY="${CONCURRENCY:-2}"
export MAX_FILES_PER_PROJECT="${MAX_FILES_PER_PROJECT:-50}"

echo "📁 BestCase Storage: $BESTCASE_STORAGE_PATH"
echo "🔄 Auto-scan on startup: $AUTO_MIGRATE_ON_STARTUP"
echo "🧠 LLM Model: $LLM_MODEL"
echo ""

# 1. BestCase 스토리지 디렉토리 확인
if [ -d "$BESTCASE_STORAGE_PATH" ]; then
  echo "✅ BestCase storage directory found"

  # 2. 시작 시 자동 AI 스캔 실행 (환경변수로 제어)
  if [ "$AUTO_MIGRATE_ON_STARTUP" = "true" ]; then
    echo ""
    echo "🔍 Phase 1: Running AI file-based scan (v3.0)..."
    echo "   This will analyze only changed/new files"
    echo ""

    # Ollama가 사용 가능한지 확인
    if curl -sf http://ollama:11434/api/tags > /dev/null 2>&1; then
      echo "✅ Ollama available, starting scan..."
      node --experimental-specifier-resolution=node /app/scripts/dist/scan/scan-files-ai.js 2>/dev/null || true
    else
      echo "⚠️ Ollama not available, skipping AI scan"
      echo "   Please check Ollama container status"
    fi

    echo ""
    echo "🎉 Startup scan completed"
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
