#!/bin/sh
# 정기 AI 스캔 스크립트 (Docker 컨테이너 내부에서 실행)
# 매주 일요일에 실행됨
#
# v3.0 업데이트:
# - 파일 단위 저장 (점수 무관, 모든 파일 저장)
# - 키워드 기반 검색 지원
# - AI 메타데이터 분석 유지
# - 모든 폴더 스캔 (pages, components, composables, etc.)

echo "========================================="
echo "🤖 Weekly File-Based AI Scan v3.0"
echo "📅 $(date)"
echo "========================================="

cd /app

# 환경 변수 설정
export LLM_MODEL="${LLM_MODEL:-qwen2.5-coder:7b}"
export CONCURRENCY="${CONCURRENCY:-2}"
export BESTCASE_STORAGE_PATH="${BESTCASE_STORAGE_PATH:-/projects/.bestcases}"
export MAX_FILES_PER_PROJECT="${MAX_FILES_PER_PROJECT:-50}"
export OLLAMA_URL="${OLLAMA_URL:-http://ollama:11434}"

# Ollama가 실행 중인지 확인
if ! curl -sf http://ollama:11434/api/tags > /dev/null 2>&1; then
  echo "⚠️ Ollama server not available, skipping AI scan"
  echo "Please check Ollama container status"
  exit 1
fi

echo "✅ Ollama available, starting weekly scan process"
echo "🧠 LLM Model: $LLM_MODEL"
echo "⚡ Concurrency: $CONCURRENCY"
echo "📁 Storage: $BESTCASE_STORAGE_PATH"
echo "📊 Max files/project: $MAX_FILES_PER_PROJECT"
echo ""

# 1. 버전 체크 (드라이 런)
echo "📊 Phase 1: Checking BestCase/FileCase versions..."
node --experimental-specifier-resolution=node /app/scripts/dist/scan/migrate-bestcases.js --dry-run 2>/dev/null || true
echo ""

# 2. AI 기반 파일 단위 스캔 (v3.0)
echo "🔍 Phase 2: Running AI file-based scan..."
node --experimental-specifier-resolution=node /app/scripts/dist/scan/scan-files-ai.js

echo ""
echo "✨ Weekly AI scan completed at $(date)"
echo "   - All files saved individually (no score filtering)"
echo "   - Keywords extracted for search"
echo "   - Individual scores recorded (no weighted total)"
echo ""
