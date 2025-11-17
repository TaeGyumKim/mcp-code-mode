#!/bin/sh
# 정기 AI 스캔 스크립트 (Docker 컨테이너 내부에서 실행)
# 매주 일요일에 실행됨
#
# v2.0 업데이트:
# - 구버전 BestCase 자동 감지 및 마이그레이션
# - 구버전 BestCase가 있는 프로젝트 재분석
# - 새 프로젝트 스캔 및 BestCase 생성

echo "========================================="
echo "🤖 Weekly BestCase AI Scan with Migration v2.0"
echo "📅 $(date)"
echo "========================================="

cd /app

# 환경 변수 설정
export LLM_MODEL="${LLM_MODEL:-qwen2.5-coder:7b}"
export CONCURRENCY="${CONCURRENCY:-2}"
export BESTCASE_STORAGE_PATH="${BESTCASE_STORAGE_PATH:-/projects/.bestcases}"
export REANALYZE_OLD_VERSIONS="${REANALYZE_OLD_VERSIONS:-true}"
export MAX_REANALYZE_COUNT="${MAX_REANALYZE_COUNT:-10}"

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
echo "🔄 Re-analyze old versions: $REANALYZE_OLD_VERSIONS"
echo "🎯 Max re-analyze count: $MAX_REANALYZE_COUNT"
echo ""

# 1. 먼저 버전 체크 실행 (드라이 런)
echo "📊 Phase 0: Checking BestCase versions..."
node --experimental-specifier-resolution=node /app/scripts/dist/scan/migrate-bestcases.js --dry-run 2>/dev/null || true
echo ""

# 2. AI 기반 자동 스캔 + 마이그레이션 실행
echo "🔍 Running AI-enhanced scan with migration..."
node --experimental-specifier-resolution=node /app/scripts/dist/scan/auto-scan-with-migration.js

echo ""
echo "✨ Weekly AI scan with migration completed at $(date)"
echo ""
