#!/bin/bash
# BestCase 수동 업데이트 스크립트
# 사용자가 직접 실행하거나 크론잡에서 호출됩니다.

set -e

echo "🔄 Starting BestCase Update"
echo "📅 $(date)"

# AI 분석 실행 (Ollama 사용)
if [ -n "$OLLAMA_URL" ]; then
  echo "🤖 Running AI-enhanced scan with Ollama..."
  cd /app/scripts/scan
  tsx auto-scan-projects-ai.ts
else
  echo "📊 Running basic scan (no AI)..."
  cd /app/scripts/scan
  tsx auto-scan-projects.ts
fi

echo "✅ BestCase Update Completed"
echo "📅 $(date)"

