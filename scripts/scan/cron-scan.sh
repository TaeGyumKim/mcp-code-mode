#!/bin/sh
# 정기 AI 스캔 스크립트 (Docker 컨테이너 내부에서 실행)
# 매주 일요일에 실행됨

echo "========================================="
echo "🤖 Weekly BestCase AI Scan"
echo "📅 $(date)"
echo "========================================="

cd /app

# 환경 변수 설정
export LLM_MODEL="${LLM_MODEL:-qwen2.5-coder:7b}"
export CONCURRENCY="${CONCURRENCY:-2}"

# Ollama가 실행 중인지 확인
if ! curl -sf http://ollama:11434/api/tags > /dev/null 2>&1; then
  echo "⚠️ Ollama server not available, skipping AI scan"
  echo "Please check Ollama container status"
  exit 1
fi

echo "✅ Ollama available, starting weekly scan process"
echo "🧠 LLM Model: $LLM_MODEL"
echo "⚡ Concurrency: $CONCURRENCY"
echo ""

# AI 기반 자동 스캔 실행
echo "🔍 Running AI-enhanced scan..."
node /app/scripts/dist/scan/auto-scan-projects-ai.js

echo ""
echo "✨ Weekly AI scan completed at $(date)"
echo ""
