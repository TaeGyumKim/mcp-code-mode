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
export REANALYZE_OLD_VERSIONS="${REANALYZE_OLD_VERSIONS:-false}"
export MAX_REANALYZE_COUNT="${MAX_REANALYZE_COUNT:-5}"

echo "📁 BestCase Storage: $BESTCASE_STORAGE_PATH"
echo "🔄 Auto-migrate on startup: $AUTO_MIGRATE_ON_STARTUP"
echo ""

# 1. BestCase 스토리지 디렉토리 확인
if [ -d "$BESTCASE_STORAGE_PATH" ]; then
  echo "✅ BestCase storage directory found"

  # 2. 시작 시 자동 마이그레이션 실행 (환경변수로 제어)
  if [ "$AUTO_MIGRATE_ON_STARTUP" = "true" ]; then
    echo ""
    echo "🔍 Phase 1: Checking BestCase versions on startup..."

    # 드라이 런으로 버전 체크
    node --experimental-specifier-resolution=node /app/scripts/dist/scan/migrate-bestcases.js --dry-run 2>/dev/null || true

    # 실제 마이그레이션 필요 시 실행
    NEEDS_MIGRATION=$(node --experimental-specifier-resolution=node /app/scripts/dist/scan/migrate-bestcases.js --dry-run 2>/dev/null | grep "Needs Migration:" | awk '{print $3}')

    if [ "$NEEDS_MIGRATION" != "0" ] && [ -n "$NEEDS_MIGRATION" ]; then
      echo ""
      echo "🔄 Found $NEEDS_MIGRATION BestCases needing migration, running migration..."
      node --experimental-specifier-resolution=node /app/scripts/dist/scan/migrate-bestcases.js 2>/dev/null || true

      # 재분석이 활성화된 경우 자동 재분석
      if [ "$REANALYZE_OLD_VERSIONS" = "true" ]; then
        echo ""
        echo "🧠 Re-analyzing projects with AI file-based scan (v3.0)..."

        # Ollama가 사용 가능한지 확인
        if curl -sf http://ollama:11434/api/tags > /dev/null 2>&1; then
          node --experimental-specifier-resolution=node /app/scripts/dist/scan/scan-files-ai.js 2>/dev/null || true
        else
          echo "⚠️ Ollama not available, skipping re-analysis"
        fi
      fi
    else
      echo "✅ All BestCases are up to date (v2.0)"
    fi

    echo ""
    echo "🎉 Startup migration check completed"
  else
    echo "ℹ️ Auto-migration disabled (AUTO_MIGRATE_ON_STARTUP=false)"
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
