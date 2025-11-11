#!/bin/bash
# 수동으로 BestCase AI 분석 실행하는 스크립트

echo "🤖 Manual BestCase AI Analysis"
echo "================================"
echo ""

# Docker 컨테이너 확인
if ! docker ps | grep -q "mcp-code-mode-server"; then
  echo "❌ Error: mcp-code-mode-server container not running"
  echo "Please start the container first:"
  echo "  docker-compose -f docker-compose.ai.yml up -d"
  exit 1
fi

# Ollama 확인
if ! docker ps | grep -q "ollama-code-analyzer"; then
  echo "❌ Error: ollama-code-analyzer container not running"
  echo "Please start Ollama:"
  echo "  docker-compose -f docker-compose.ai.yml up -d ollama"
  exit 1
fi

echo "✅ All containers running"
echo ""

# 크론 스케줄러 컨테이너에서 분석 실행
echo "🔍 Starting AI analysis in cron-scheduler container..."
echo "This may take several minutes depending on project size..."
echo ""

docker exec bestcase-cron-scheduler /app/cron-scan.sh

echo ""
echo "✨ Analysis completed!"
echo "Check results in: D:/01.Work/01.Projects/.bestcases/"
