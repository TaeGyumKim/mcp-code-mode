#!/bin/sh
# Docker 시작 시 실행되는 초기화 스크립트
# 1. BestCase 검증 및 정리
# 2. 전체 프로젝트 AI 스캔 실행

echo ""
echo "========================================="
echo "🚀 Docker 초기화: BestCase 검증 및 AI 스캔"
echo "📅 $(date)"
echo "========================================="
echo ""

cd /app

# 환경 변수 기본값 설정
export LLM_MODEL="${LLM_MODEL:-qwen2.5-coder:7b}"
export CONCURRENCY="${CONCURRENCY:-2}"
export BESTCASE_STORAGE_PATH="${BESTCASE_STORAGE_PATH:-/projects/.bestcases}"

# 1. Ollama 서버 대기
echo "⏳ Ollama 서버 대기 중..."
RETRY_COUNT=0
MAX_RETRIES=30

while ! curl -sf http://ollama:11434/api/tags > /dev/null 2>&1; do
  RETRY_COUNT=$((RETRY_COUNT + 1))
  if [ $RETRY_COUNT -ge $MAX_RETRIES ]; then
    echo "❌ Ollama 서버 응답 없음 (30초 초과)"
    echo "⚠️ AI 스캔을 건너뜁니다."
    exit 0
  fi
  echo "   대기 중... (${RETRY_COUNT}/30)"
  sleep 1
done

echo "✅ Ollama 서버 준비 완료"
echo ""

# 2. BestCase 검증 및 정리
echo "🔍 BestCase 검증 시작..."
tsx /app/scripts/scan/validate-bestcases.ts
VALIDATION_EXIT_CODE=$?

echo ""

# 3. 검증 결과에 따라 처리
if [ $VALIDATION_EXIT_CODE -eq 1 ]; then
  echo "⚠️ 오래되거나 잘못된 BestCase가 삭제되었습니다."
  echo "🔄 전체 프로젝트 AI 스캔을 실행합니다..."
  echo ""

  # 전체 AI 스캔 실행
  echo "🧠 LLM Model: $LLM_MODEL"
  echo "⚡ Concurrency: $CONCURRENCY"
  echo "📁 Storage: $BESTCASE_STORAGE_PATH"
  echo ""

  cd /app/scripts/scan
  tsx auto-scan-projects-ai.ts

  if [ $? -eq 0 ]; then
    echo ""
    echo "✨ 초기 AI 스캔 완료"
  else
    echo ""
    echo "❌ 초기 AI 스캔 실패"
    echo "⚠️ 로그를 확인하세요."
  fi
elif [ $VALIDATION_EXIT_CODE -eq 0 ]; then
  echo "✅ 모든 BestCase가 유효합니다."
  echo "ℹ️ 초기 AI 스캔을 건너뜁니다."
  echo "💡 주간 스캔은 매주 일요일 02:00에 실행됩니다."
else
  echo "❌ BestCase 검증 중 에러 발생"
  echo "⚠️ 초기 AI 스캔을 건너뜁니다."
fi

echo ""
echo "========================================="
echo "✅ 초기화 완료"
echo "⏰ $(date)"
echo "========================================="
echo ""
